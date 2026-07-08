-- ============================================================================
-- Raw SQL schema, matching prisma/schema.prisma column-for-column.
--
-- You normally would NOT run this by hand once Prisma is wired up - you'd
-- run `npx prisma migrate dev` and Prisma generates + applies this for you.
-- It's included so you can see exactly what tables look like, and/or load
-- everything with plain `psql` while you're still learning the Docker/Prisma
-- pieces.
--
-- Usage:
--   psql "$DATABASE_URL" -f sql/schema.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS "portfolios" (
  "id"               SERIAL PRIMARY KEY,
  "slug"             TEXT NOT NULL UNIQUE,
  "featured"         BOOLEAN NOT NULL DEFAULT false,
  "title"            TEXT NOT NULL,
  "companyBuiltWith" TEXT,
  "desc"             TEXT NOT NULL,
  "projectColor"     TEXT,
  "projectText"      TEXT,
  "outcome"          TEXT,
  "link"             TEXT,
  "moreInfoLink"     TEXT,
  "projectLogo"      TEXT,
  "image"            TEXT NOT NULL,
  "status"           TEXT NOT NULL,
  "skills"           TEXT[] NOT NULL DEFAULT '{}',
  "order"            INTEGER NOT NULL DEFAULT 0,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "carousel_items" (
  "id"          SERIAL PRIMARY KEY,
  "img"         TEXT NOT NULL,
  "desc"        TEXT,
  "title"       TEXT,
  "gridArea"    TEXT,
  "order"       INTEGER NOT NULL DEFAULT 0,
  "portfolioId" INTEGER NOT NULL REFERENCES "portfolios"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "intro" (
  "id"          SERIAL PRIMARY KEY,
  "img"         TEXT NOT NULL,
  "firstName"   TEXT NOT NULL,
  "lastName"    TEXT NOT NULL,
  "summary"     TEXT NOT NULL,
  "resume"      TEXT NOT NULL,
  "order"       INTEGER NOT NULL DEFAULT 0,
);

CREATE TABLE IF NOT EXISTS "services" (
  "id"        SERIAL PRIMARY KEY,
  "iconLight" TEXT NOT NULL,
  "iconDark"  TEXT NOT NULL,
  "title"     TEXT NOT NULL,
  "details"   TEXT NOT NULL,
  "order"     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "education" (
  "id"       SERIAL PRIMARY KEY,
  "city"     TEXT NOT NULL,
  "duration" TEXT NOT NULL,
  "academy"  TEXT NOT NULL,
  "degree"   TEXT NOT NULL,
  "order"    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "work_experience" (
  "id"                  SERIAL PRIMARY KEY,
  "duration"            TEXT NOT NULL,
  "designation"         TEXT NOT NULL,
  "company"             TEXT NOT NULL,
  "location"            TEXT,
  "icon"                TEXT,
  "companyDescription"  TEXT NOT NULL,
  "whatIdid"            JSONB NOT NULL,
  "skillsUsed"          TEXT[] NOT NULL DEFAULT '{}',
  "achievement"         TEXT,
  "companySite"         TEXT,
  "order"               INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "skills" (
  "id"       SERIAL PRIMARY KEY,
  "title"    TEXT NOT NULL,
  "level"    TEXT,
  "progress" INTEGER,
  "order"    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "testimonials" (
  "id"          SERIAL PRIMARY KEY,
  "profile"     TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "designation" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "order"       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "contact_info" (
  "id"        SERIAL PRIMARY KEY,
  "text"      TEXT[] NOT NULL DEFAULT '{}',
  "iconLight" TEXT NOT NULL,
  "iconDark"  TEXT NOT NULL,
  "link"      TEXT NOT NULL,
  "order"     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "contact_messages" (
  "id"        SERIAL PRIMARY KEY,
  "name"      TEXT NOT NULL,
  "email"     TEXT NOT NULL,
  "message"   TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
