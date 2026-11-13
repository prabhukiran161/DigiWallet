import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import type { Sql } from 'postgres';

export async function applyMigrations(sql: Sql, directory: string) {
  for (const name of ['001_initial.sql', '003_relational_wallet.sql']) {
    const body = await readFile(`${directory}/${name}`, 'utf8');
    const checksum = createHash('sha256').update(body).digest('hex');
    await sql.begin(async tx => {
      await tx`SELECT pg_advisory_xact_lock(71904123)`;
      await tx`CREATE TABLE IF NOT EXISTS dw_schema_migrations(name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())`;
      const applied = await tx`SELECT checksum FROM dw_schema_migrations WHERE name=${name}`;
      if (applied[0]) {
        if (applied[0].checksum !== checksum) throw new Error(`Applied migration checksum differs: ${name}`);
        return;
      }
      await tx.unsafe(body);
      await tx`INSERT INTO dw_schema_migrations(name,checksum) VALUES(${name},${checksum})`;
    });
  }
}
