import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

export const digest = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(hash, "hex"));
}

export { randomBytes, randomUUID };

