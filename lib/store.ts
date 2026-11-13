import {randomBytes,scryptSync,timingSafeEqual,createHash,randomUUID} from 'node:crypto';
import postgres from 'postgres';
import {emptyWallet,upgradeWallet,type Wallet} from './ledger';

export interface Store {
  read(user: string): Promise<Wallet>;
  change(user: string, action: string, fn: (w: Wallet) => Wallet): Promise<Wallet>;
  register(email: string, password: string, name: string): Promise<{id: string; email: string; name: string}>;
  login(email: string, password: string): Promise<{id: string; name: string; email: string}>;
  session(user: string): Promise<string>;
  identify(token: string): Promise<{id: string; name: string; email: string} | undefined>;
  logout(token: string): Promise<void>;
  limit(key: string, max?: number): Promise<void>;
  getInstitutions(): Promise<{id: string; name: string; kind: string; country: string}[]>;
  addInstitution(name: string, kind: string, country: string): Promise<void>;
  close(): Promise<void>;
}

export function normalize(name: string) {
  return name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
}

const digest = (token: string) => createHash('sha256').update(token).digest('hex');

/** Validate configuration without returning credentials in errors. Connections stay lazy for builds. */
export function requireDatabaseUrl(value: string | undefined): string {
  if (!value?.trim()) throw new Error('DATABASE_URL is required. Configure the Supabase PostgreSQL connection string.');
  const message = 'DATABASE_URL must be a valid PostgreSQL connection URL with a host and database name.';
  let url: URL;
  try { url = new URL(value); } catch { throw new Error(message); }
  if (value !== value.trim() || !['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || url.pathname.length < 2 || url.hash)
    throw new Error(message);
  return value;
}

export function openPostgresStore(url = process.env.DATABASE_URL, options: {schema?:string} = {}): Store {
  const sql = postgres(requireDatabaseUrl(url), {
    ...(options.schema ? {connection: {search_path: options.schema}} : {}),
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false, // Required for Supabase transaction pooler (port 6543)
  });

  const read = async (user: string): Promise<Wallet> => {
    const rows = await sql`SELECT state FROM wallets WHERE user_id = ${user}`;
    if (!rows || rows.length === 0) throw new Error('Wallet not found.');
    const raw = rows[0].state;
    return upgradeWallet(typeof raw === 'string' ? JSON.parse(raw) : (raw as Wallet));
  };

  const change = async (user: string, action: string, fn: (w: Wallet) => Wallet): Promise<Wallet> => {
    return await sql.begin(async tx => {
      const rows = await tx`SELECT state FROM wallets WHERE user_id = ${user} FOR UPDATE`;
      if (!rows || rows.length === 0) throw new Error('Wallet not found.');
      const raw = rows[0].state;
      const current = upgradeWallet(typeof raw === 'string' ? JSON.parse(raw) : (raw as Wallet));
      const updated = fn(current);
      await tx`UPDATE wallets SET state = ${JSON.stringify(updated)}::jsonb, version = version + 1, updated_at = NOW() WHERE user_id = ${user}`;
      await tx`INSERT INTO audit (id, user_id, action, recorded_at) VALUES (${randomUUID()}, ${user}, ${action}, ${new Date().toISOString()})`;
      return updated;
    });
  };

  const registerUser = async (email: string, password: string, name: string) => {
    const id = randomUUID(), salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    await sql.begin(async tx => {
      await tx`INSERT INTO users (id, email, password, name) VALUES (${id}, ${email.toLowerCase()}, ${`${salt}:${hash}`}, ${name})`;
      await tx`INSERT INTO wallets (user_id, state) VALUES (${id}, ${JSON.stringify(emptyWallet())}::jsonb)`;
    });
    return { id, email, name };
  };

  const loginUser = async (email: string, password: string) => {
    const rows = await sql`SELECT id, email, name, password FROM users WHERE email = ${email.toLowerCase()}`;
    const u = rows[0];
    const [salt, hash] = (u?.password || 'dummy:' + Buffer.alloc(64).toString('hex')).split(':');
    const actual = scryptSync(password, salt, 64);
    if (!u || !timingSafeEqual(actual, Buffer.from(hash, 'hex'))) {
      throw new Error('Email or password is incorrect.');
    }
    return { id: u.id, name: u.name, email: u.email };
  };

  const createSession = async (user: string) => {
    const token = randomBytes(32).toString('hex');
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
      throw new Error('Too many requests. Please wait a minute.');
    }
  };

  const getInstitutions = async () => {
    const rows = await sql`SELECT id, name, kind, country FROM institutions ORDER BY name`;
    return rows as unknown as { id: string; name: string; kind: string; country: string }[];
  };

  const addInstitution = async (name: string, kind: string, country: string) => {
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
    close: async () => { await sql.end(); }
  };
}

const globals = globalThis as typeof globalThis & { walletPostgresStore?: Store };
export const store = () => globals.walletPostgresStore ??= openPostgresStore();

export async function register(s: Store, email: string, password: string, name: string) {
  return await s.register(email, password, name);
}

export async function login(s: Store, email: string, password: string) {
  return await s.login(email, password);
}

export async function session(s: Store, user: string) {
  return await s.session(user);
}

export async function identify(s: Store, token: string) {
  return await s.identify(token);
}

export async function logout(s: Store, token: string) {
  return await s.logout(token);
}

export async function limit(s: Store, key: string, max = 100) {
  return await s.limit(key, max);
}
