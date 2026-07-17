// Runs sql/seed.sql through Prisma so `npm run seed` and `psql -f sql/seed.sql`
// both load the exact same data - one source of truth, two ways to run it.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(__dirname, "..", "sql", "seed.sql");

async function main() {
  const sql = readFileSync(sqlPath, "utf-8");

  // Remove full-line SQL comments first, so a comment sitting directly
  // above a statement (no blank line) doesn't get glued onto it and
  // cause the whole chunk to be mistaken for a comment-only block.
  const withoutComments = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  const statements = withoutComments
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
