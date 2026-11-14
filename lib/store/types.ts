import type { Wallet } from "../ledger";
import type { Institution } from "../institutions";

export interface Store {
  read(user: string): Promise<Wallet>;
  change(user: string, action: string, fn: (w: Wallet) => Wallet): Promise<Wallet>;
  register(
    email: string,
    password: string,
    name: string,
  ): Promise<{ id: string; email: string; name: string }>;
  login(
    email: string,
    password: string,
  ): Promise<{ id: string; name: string; email: string }>;
  session(user: string): Promise<string>;
  identify(
    token: string,
  ): Promise<{ id: string; name: string; email: string } | undefined>;
  logout(token: string): Promise<void>;
  limit(key: string, max?: number): Promise<void>;
  getInstitutions(): Promise<Institution[]>;
  getInstitutionLogo(id: string): Promise<Uint8Array | undefined>;
  addInstitution(name: string, kind: string, country: string, logo?: Uint8Array): Promise<void>;
  close(): Promise<void>;
}

