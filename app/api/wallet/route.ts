import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { store, identify, limit } from "@/lib/store";
import { sameOrigin } from "@/lib/origin";
import { executeWalletAction } from "./actions";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const s = store();
    const token = req.cookies.get("dw_session")?.value || "";
    const user = token ? await identify(s, token) : null;
    if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

    const wallet = await s.read(user.id);
    if (req.nextUrl.searchParams.has("export")) {
      return new NextResponse(JSON.stringify(wallet, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": 'attachment; filename="digiwallet-export.json"',
          "Cache-Control": "no-store",
        },
      });
    }

    const institutions = await s.getInstitutions();
    return NextResponse.json({ wallet, institutions }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load wallet." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!sameOrigin(req))
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });

    const s = store();
    const token = req.cookies.get("dw_session")?.value || "";
    const user = token ? await identify(s, token) : null;
    if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

    await limit(s, `write:${user.id}`);
    const raw = await req.text();
    if (raw.length > 20000) throw new Error("Request too large.");

    const body = z
      .object({
        action: z.enum([
          "account",
          "editAccount",
          "deleteAccount",
          "closeAccount",
          "creditLimit",
          "transaction",
          "editTransaction",
          "category",
          "deleteCategory",
          "budget",
          "archive",
          "rename",
          "institution",
        ]),
        data: z.unknown(),
      })
      .strict()
      .parse(JSON.parse(raw));

    if (body.action === "institution") {
      const d = z
        .object({
          name: z.string().min(2).max(100),
          kind: z.enum(["bank", "investment", "lender"]),
          country: z.literal("IN"),
        })
        .strict()
        .parse(body.data);
      const name = d.name.normalize("NFKC").trim().replace(/\s+/g, " ");
      if (name.length < 2) throw new Error("Enter an institution name.");
      await s.addInstitution(name, d.kind, d.country);
      return NextResponse.json({
        institutions: await s.getInstitutions(),
        wallet: await s.read(user.id),
      });
    }

    const wallet = await s.change(user.id, body.action, (w) =>
      executeWalletAction(w, body.action, body.data),
    );
    return NextResponse.json({ wallet });
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
        : error instanceof Error
          ? error.message
          : "Could not save.";
    return NextResponse.json(
      { error: message },
      { status: message.includes("conflict") ? 409 : 400 },
    );
  }
}
