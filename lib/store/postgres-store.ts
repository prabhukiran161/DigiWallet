import postgres from "postgres";
import { readWallet, writeWallet, createRelationalWallet } from "./wallet-records";
import type { Wallet } from "../ledger";
import type { Store } from "./types";
import { digest, hashPassword, verifyPassword, randomBytes, randomUUID } from "./crypto";
import { normalize } from "./normalize";
import { requireDatabaseUrl } from "./config";

export function openPostgresStore(
  url = process.env.DATABASE_URL,
  options: { schema?: string } = {},
): Store {
  const sql = postgres(requireDatabaseUrl(url), {
    ...(options.schema ? { connection: { search_path: options.schema } } : {}),
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false, // Required for Supabase transaction pooler (port 6543)
  });

  const read = async (user: string) => sql.begin('isolation level repeatable read read only', async tx => readWallet(tx,user));

  const change = async (
    user: string,
    action: string,
    fn: (w: Wallet) => Wallet,
  ): Promise<Wallet> => {
    return await sql.begin(async (tx) => {
      const rows =
        await tx`SELECT id FROM dw_wallets WHERE id=${user} FOR UPDATE`;
      if (!rows || rows.length === 0) throw new Error("Wallet not found.");
      const current = await readWallet(tx,user);
      const updated = fn(current);
      await writeWallet(tx,user,current,updated);
      await tx`INSERT INTO dw_audit_log (actor_id,wallet_id,action,recorded_at) VALUES (${user},${user},${action},${new Date().toISOString()})`;
      return updated;
    });
  };

  const registerUser = async (email: string, password: string, name: string) => {
    const id = randomUUID();
    const encodedPassword = hashPassword(password);
    await sql.begin(async (tx) => {
      await tx`INSERT INTO dw_users (id, email, password_hash, name) VALUES (${id}, ${email.toLowerCase()}, ${encodedPassword}, ${name})`;
      await createRelationalWallet(tx,id);
    });
    return { id, email, name };
  };

  const loginUser = async (email: string, password: string) => {
    const rows =
      await sql`SELECT id, email, name, password_hash FROM dw_users WHERE email = ${email.toLowerCase()}`;
    const u = rows[0];
    const passwordHash = u?.password_hash || "dummy:" + Buffer.alloc(64).toString("hex");
    const valid = verifyPassword(password, passwordHash);
    if (!u || !valid) {
      throw new Error("Email or password is incorrect.");
    }
    return { id: u.id, name: u.name, email: u.email };
  };

  const createSession = async (user: string) => {
    const token = randomBytes(32).toString("hex");
    const now = Date.now();
    await sql`DELETE FROM dw_sessions WHERE expires_at < ${new Date(now).toISOString()}`;
    await sql`INSERT INTO dw_sessions (token_hash, user_id, expires_at) VALUES (${digest(token)}, ${user}, ${new Date(now + 7 * 86400000).toISOString()})`;
    return token;
  };

  const identifyUser = async (token: string) => {
    const rows = await sql`
      SELECT dw_users.id, dw_users.name, dw_users.email
      FROM dw_users
      JOIN dw_sessions ON dw_users.id = dw_sessions.user_id
      WHERE dw_sessions.token_hash = ${digest(token)} AND dw_sessions.expires_at > ${new Date().toISOString()}
    `;
    const u = rows[0];
    return u ? { id: u.id, name: u.name, email: u.email } : undefined;
  };

  const logoutUser = async (token: string) => {
    await sql`DELETE FROM dw_sessions WHERE token_hash = ${digest(token)}`;
  };

  const limitAttempts = async (key: string, max = 100) => {
    const now = Date.now();
    await sql`DELETE FROM dw_rate_limits WHERE expires_at < ${new Date(now).toISOString()}`;
    await sql`
      INSERT INTO dw_rate_limits (key, count, expires_at)
      VALUES (${key}, 1, ${new Date(now + 60000).toISOString()})
      ON CONFLICT (key) DO UPDATE SET count = dw_rate_limits.count + 1
    `;
    const rows = await sql`SELECT count FROM dw_rate_limits WHERE key = ${key}`;
    if (rows[0] && Number(rows[0].count) > max) {
      throw new Error("Too many requests. Please wait a minute.");
    }
  };

  const getInstitutions = async () => {
    const rows =
      await sql`SELECT id, name, kind, country FROM dw_institutions WHERE active ORDER BY name`;
    return rows as unknown as {
      id: string;
      name: string;
      kind: string;
      country: string;
    }[];
  };

  const addInstitution = async (
    name: string,
    kind: string,
    country: string,
  ) => {
    await sql`
      INSERT INTO dw_institutions (id, name, kind, country, normalized_name)
      VALUES (${randomUUID()}, ${name}, ${kind}, ${country}, ${normalize(name)})
      ON CONFLICT (kind, country, normalized_name) DO NOTHING
    `;
  };

  return {
    read,
    change,
    register: registerUser,
    login: loginUser,
    session: createSession,
    identify: identifyUser,
    logout: logoutUser,
    limit: limitAttempts,
    getInstitutions,
    addInstitution,
    close: async () => {
      await sql.end();
    },
  };
}

