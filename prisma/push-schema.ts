/**
 * Push the Prisma schema to a remote Turso/LibSQL database.
 *
 * Since `prisma db push` doesn't support libsql:// URLs with the SQLite
 * provider, this script generates the DDL via `prisma migrate diff` and
 * executes each statement against the remote database using @libsql/client.
 *
 * Usage:
 *   DATABASE_URL="libsql://..." DATABASE_AUTH_TOKEN="..." npx tsx prisma/push-schema.ts
 */

import { createClient } from "@libsql/client";
import { execSync } from "child_process";

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("ERROR: DATABASE_URL and DATABASE_AUTH_TOKEN must be set");
  process.exit(1);
}

async function main() {
  console.log("Connecting to:", url);
  const client = createClient({ url, authToken });

  // Generate DDL from Prisma schema
  console.log("Generating DDL from prisma/schema.prisma...");
  const ddl = execSync(
    "npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script",
    { encoding: "utf-8" }
  );

  // Strip comment-only lines, then split on semicolons
  const cleaned = ddl
    .split("\n")
    .filter((line) => !line.match(/^\s*--/))
    .join("\n");
  const statements = cleaned
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`Executing ${statements.length} statements...\n`);

  let success = 0;
  let skipped = 0;

  for (const stmt of statements) {
    // Add semicolon back (split removed it)
    const sql = stmt.endsWith(";") ? stmt : stmt + ";";
    const label = sql.substring(0, 80).replace(/\n/g, " ");
    try {
      await client.execute(sql);
      success++;
      console.log(`  OK: ${label}...`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // "already exists" is fine — means we're re-running on an existing DB
      if (msg.includes("already exists")) {
        skipped++;
        console.log(`  SKIP (exists): ${label}...`);
      } else {
        console.error(`  FAIL: ${label}...`);
        console.error(`        ${msg}`);
        process.exit(1);
      }
    }
  }

  console.log(`\nDone: ${success} created, ${skipped} already existed.`);
  client.close();
}

main();
