import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import sharp from "sharp";
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

    const logoId = req.nextUrl.searchParams.get("institutionLogo");
    if (logoId !== null) {
      const logo = logoId.length <= 100 ? await s.getInstitutionLogo(logoId) : undefined;
      if (!logo) return new NextResponse(null, { status: 404 });
      return new NextResponse(new Uint8Array(logo), {
        headers: {
          "Content-Type": "image/png",
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

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
    if (req.headers.get("content-type")?.startsWith("multipart/form-data")) {
      await limit(s, `institution:${user.id}`, 10);
      const maxUpload = 1024 * 1024;
      const reader = req.body?.getReader();
      if (!reader) throw new Error("Missing institution details.");
      const chunks: Uint8Array<ArrayBuffer>[] = [];
      let size = 0;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > maxUpload + 8192) {
            await reader.cancel();
            throw new Error("Choose a logo under 1 MB.");
          }
          chunks.push(new Uint8Array(value));
        }
      } finally {
        reader.releaseLock();
      }
      const form = await new Response(new Blob(chunks), {
        headers: { "Content-Type": req.headers.get("content-type")! },
      }).formData();
      const { name, kind, logo } = z.object({
        name: z.string().transform((name) => name.normalize("NFKC").trim().replace(/\s+/g, " "))
          .pipe(z.string().min(2).max(100)),
        kind: z.enum(["bank", "investment", "lender"]),
        logo: z.instanceof(File).optional(),
      }).parse({ name: form.get("name"), kind: form.get("kind"), logo: form.get("logo") ?? undefined });
      let png: Buffer | undefined;
      if (logo?.size) {
        if (logo.size > maxUpload || !["image/png", "image/jpeg", "image/webp"].includes(logo.type)) {
          throw new Error("Choose a PNG, JPEG, or WebP logo under 1 MB.");
        }
        try {
          const image = sharp(Buffer.from(await logo.arrayBuffer()), { limitInputPixels: 4_194_304 });
          const { format } = await image.metadata();
          if (format !== "png" && format !== "jpeg" && format !== "webp") throw new Error();
          png = await image.rotate().resize(96, 96, { fit: "inside", withoutEnlargement: true })
            .png({ palette: true }).toBuffer();
        } catch {
          throw new Error("Could not read this logo. Choose a valid PNG, JPEG, or WebP image.");
        }
        if (png.length > 32768) throw new Error("Choose a simpler logo with fewer colors.");
      }
      await s.addInstitution(name, kind, "IN", png);
      return NextResponse.json({ institutions: await s.getInstitutions() });
    }

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
