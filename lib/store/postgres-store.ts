import postgres from "postgres";
import { readRelational, writeRelational } from "./relational-store";
import { emptyWallet, upgradeWallet, type Wallet } from "../ledger";
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

  const read = async (user: string): Promise<Wallet> => sql.begin('isolation level repeatable read read only', async tx => {
    const rows = await tx`SELECT CASE WHEN to_jsonb(wallets)->>'storage_mode'='relational' THEN NULL ELSE state END AS state,version,to_jsonb(wallets)->>'storage_mode' AS storage_mode FROM wallets WHERE user_id=${user}`;
    if (!rows[0]) throw new Error("Wallet not found.");
    if (rows[0].storage_mode === 'relational') return readRelational(tx, user, rows[0].version);
    const raw = rows[0].state;
    return upgradeWallet(typeof raw === 'string' ? JSON.parse(raw) : raw as Wallet);
  });

  const change = async (
    user: string,
    action: string,
    fn: (w: Wallet) => Wallet,
  ): Promise<Wallet> => {
    return await sql.begin(async (tx) => {
      const rows =
        await tx`SELECT CASE WHEN to_jsonb(wallets)->>'storage_mode'='relational' THEN NULL ELSE state END AS state,version,to_jsonb(wallets)->>'storage_mode' AS storage_mode FROM wallets WHERE user_id = ${user} FOR UPDATE`;
      if (!rows || rows.length === 0) throw new Error("Wallet not found.");
      const raw = rows[0].state;
      const current = rows[0].storage_mode === 'relational'
        ? await readRelational(tx, user, rows[0].version)
        : upgradeWallet(typeof raw === "string" ? JSON.parse(raw) : raw as Wallet);
      const updated = fn(current);
      if (rows[0].storage_mode === 'relational') {
        await writeRelational(tx, user, updated, rows[0].version + 1);
        await tx`UPDATE wallets SET version=version+1,updated_at=NOW() WHERE user_id=${user}`;
      } else {
        await tx`UPDATE wallets SET state = ${JSON.stringify(updated)}::jsonb, version = version + 1, updated_at = NOW() WHERE user_id = ${user}`;
      }
      await tx`INSERT INTO audit (id, user_id, action, recorded_at) VALUES (${randomUUID()}, ${user}, ${action}, ${new Date().toISOString()})`;
      return updated;
    });
  };

  const registerUser = async (email: string, password: string, name: string) => {
    const id = randomUUID();
    const encodedPassword = hashPassword(password);
    await sql.begin(async (tx) => {
      await tx`INSERT INTO users (id, email, password, name) VALUES (${id}, ${email.toLowerCase()}, ${encodedPassword}, ${name})`;
      const initial = emptyWallet();
      const inserted = await tx`INSERT INTO wallets (user_id, state) VALUES (${id}, ${JSON.stringify(initial)}::jsonb) RETURNING to_jsonb(wallets)->>'storage_mode' AS storage_mode`;
      if (inserted[0].storage_mode === 'relational') await writeRelational(tx, id, initial, 0);
    });
    return { id, email, name };
  };

  const loginUser = async (email: string, password: string) => {
    const rows =
      await sql`SELECT id, email, name, password FROM users WHERE email = ${email.toLowerCase()}`;
    const u = rows[0];
    const passwordHash = u?.password || "dummy:" + Buffer.alloc(64).toString("hex");
    const valid = verifyPassword(password, passwordHash);
    if (!u || !valid) {
      throw new Error("Email or password is incorrect.");
    }
    return { id: u.id, name: u.name, email: u.email };
  };

  const createSession = async (user: string) => {
    const token = randomBytes(32).toString("hex");
    const now = Date.now();
    await sql`DELETE FROM sessions WHERE expires < ${now}`;
    await sql`INSERT INTO sessions (hash, user_id, expires) VALUES (${digest(token)}, ${user}, ${now + 7 * 86400000})`;
    return token;
  };

  const identifyUser = async (token: string) => {
    const rows = await sql`
      SELECT users.id, users.name, users.email
      FROM users
      JOIN sessions ON users.id = sessions.user_id
      WHERE sessions.hash = ${digest(token)} AND sessions.expires > ${Date.now()}
    `;
    const u = rows[0];
    return u ? { id: u.id, name: u.name, email: u.email } : undefined;
  };

  const logoutUser = async (token: string) => {
    await sql`DELETE FROM sessions WHERE hash = ${digest(token)}`;
  };

  const limitAttempts = async (key: string, max = 100) => {
    const now = Date.now();
    await sql`DELETE FROM attempts WHERE expires < ${now}`;
    await sql`
      INSERT INTO attempts (key, count, expires)
      VALUES (${key}, 1, ${now + 60000})
      ON CONFLICT (key) DO UPDATE SET count = attempts.count + 1
    `;
    const rows = await sql`SELECT count FROM attempts WHERE key = ${key}`;
    if (rows[0] && Number(rows[0].count) > max) {
      throw new Error("Too many requests. Please wait a minute.");
    }
  };

  const getInstitutions = async () => {
    const rows =
      await sql`SELECT id, name, kind, country FROM institutions ORDER BY name`;
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
      INSERT INTO institutions (id, name, kind, country, normalized)
      VALUES (${randomUUID()}, ${name}, ${kind}, ${country}, ${normalize(name)})
      ON CONFLICT (kind, country, normalized) DO NOTHING
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

