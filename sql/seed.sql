-- ============================================================================
-- Seed data, generated from the frontend's src/helper/*.ts files.
-- Usage: psql "$DATABASE_URL" -f sql/seed.sql
-- (safe to re-run: it clears the tables first)
-- ============================================================================
ALTER TABLE "portfolios" ALTER COLUMN "updatedAt" SET DEFAULT now();

TRUNCATE TABLE "intro", "portfolios", "carousel_items", "services", "education", "work_experience", "skills", "testimonials", "contact_info", "contact_messages" RESTART IDENTITY CASCADE;
