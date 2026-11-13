import type { Store } from "./types";
import { openPostgresStore } from "./postgres-store";

export * from "./types";
export * from "./config";
export * from "./normalize";
export { openPostgresStore };

const globals = globalThis as typeof globalThis & { walletPostgresStore?: Store };
export const store = () => globals.walletPostgresStore ??= openPostgresStore();

export async function register(
  s: Store,
  email: string,
  password: string,
  name: string,
) {
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

