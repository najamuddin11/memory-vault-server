# Portfolio Backend — Express + PostgreSQL + Prisma + GraphQL

This is the backend for the portfolio site. It serves one main GraphQL query
(`homeData`) that returns everything the home page needs (services,
portfolio projects, work experience, education, skills, testimonials,
contact info), plus a `sendMessage` mutation for the contact form.

Image fields (`Portfolio.image`, `Portfolio.projectLogo`,
`CarouselItem.img`) are stored in the database as **filenames only**
(e.g. `"portfolio/cardo/cover.png"`). The GraphQL layer prepends
`IMAGE_BASE_URL` (from `.env`) before sending them to the frontend. That
means moving images to S3 later is a one-line change — see
`src/utils/imageUrl.ts`.

---

## 1. Learning Docker: running Postgres locally

You don't need Postgres installed on your machine at all — Docker runs it
for you in a container. Here's what's happening and how to do it, step by
step.

### What a container actually is (quick mental model)

- An **image** is a snapshot/template (here: `postgres:16-alpine` — a small
  Linux + Postgres bundle downloaded from Docker Hub).
- A **container** is a running instance of that image — like a lightweight,
  disposable VM.
- `docker-compose.yml` describes what containers to run and how (ports,
  passwords, storage). `docker compose` reads that file and does the work.

### Step 1 — Install Docker

Install **Docker Desktop** (Mac/Windows) or `docker` + `docker compose`
(Linux). Verify it worked:

```bash
docker --version
docker compose version
```

### Step 2 — Look at `docker-compose.yml`

It's already written for you in this folder. The important bits:

```yaml
services:
  postgres:
    image: postgres:16-alpine       # what to run
    environment:
      POSTGRES_USER: portfolio      # \_ these three become your
      POSTGRES_PASSWORD: portfolio  # /  connection string below
      POSTGRES_DB: portfolio
    ports:
      - "5432:5432"                 # host_port:container_port
    volumes:
      - portfolio_pgdata:/var/lib/postgresql/data   # persists data
```

`ports: "5432:5432"` means "the Postgres running *inside* the container on
port 5432 is reachable from your own machine (localhost) on port 5432
too." The `volumes` line means your data survives even if you stop/remove
the container — it's stored in a named Docker volume, not inside the
disposable container itself.

### Step 3 — Start it

```bash
cd backend
docker compose up -d
```

`-d` = "detached", i.e. runs in the background. First run downloads the
Postgres image (only once). Check it's healthy:

```bash
docker compose ps
```

You should see `portfolio-postgres` with status `healthy`.

### Step 4 — Useful commands while you're learning

```bash
docker compose logs -f postgres     # tail the database's logs
docker compose exec postgres psql -U portfolio -d portfolio   # open a psql shell INSIDE the container
docker compose down                 # stop + remove containers (keeps your data - the volume survives)
docker compose down -v              # stop + remove containers AND delete all data (fresh start)
```

Inside that `psql` shell you can run raw SQL directly, e.g. `\dt` to list
tables, or `SELECT * FROM portfolios;` once seeded.

A `pgadmin` service is also included (a web UI for browsing the database)
at http://localhost:5050 (login: `admin@example.com` / `admin`, then add a
new server pointing at host `postgres`, port `5432`, user/password
`portfolio`/`portfolio`).

### Step 5 — Point the app at it

The connection string in `.env.example` already matches the compose file:

```
DATABASE_URL="postgresql://portfolio:portfolio@localhost:5432/portfolio?schema=public"
```

Copy it: `cp .env.example .env`

That's the whole Docker learning curve for this project — one file
(`docker-compose.yml`), one command (`docker compose up -d`), and Postgres
is running with a password you chose, on a port you chose, with data that
survives restarts.

---

## 2. Install dependencies & set up the database

```bash
cd backend
npm install
cp .env.example .env   # if you haven't already
```

You have **two ways** to create the tables — pick whichever helps you learn
more of what you want to learn:

### Option A — Prisma migrations (recommended, what you'd use day to day)

```bash
npx prisma migrate dev --name init
```

This reads `prisma/schema.prisma`, generates the matching SQL migration,
applies it to the database in `DATABASE_URL`, and generates the Prisma
Client your code imports from `@prisma/client`.

### Option B — Raw SQL (if you want to see exactly what's happening)

```bash
docker compose exec -T postgres psql -U portfolio -d portfolio < sql/schema.sql
```

`sql/schema.sql` is hand-written to match `prisma/schema.prisma` exactly,
column for column — useful for learning what Prisma does under the hood,
or if you ever want to run this on a database without Prisma at all.

If you use Option B, still run `npx prisma generate` afterwards so
`@prisma/client` exists and matches the schema.

## 3. Seed the database with your real portfolio data

Two ways again, same data either way (`sql/seed.sql` is the single source
of truth for both):

```bash
# via Prisma / Node:
npm run seed

# or directly with psql:
docker compose exec -T postgres psql -U portfolio -d portfolio < sql/seed.sql
```

`sql/seed.sql` inserts everything currently hardcoded in the frontend's
`src/helper/*.ts` files — all 9 portfolio projects with their galleries,
services, education, work experience, skills, testimonials, and contact
info — so you start with real content, not placeholders.

## 4. Run the server

```bash
npm run dev
```

GraphQL playground / endpoint: **http://localhost:4000/graphql**

Try it with this query:

```graphql
query {
  homeData {
    portfolioData {
      title
      image
      carousel {
        img
      }
    }
  }
}
```

You should get back full URLs for `image`/`img` (built from
`IMAGE_BASE_URL` + the stored filename).

## 5. Moving images to S3 later

1. Upload your frontend's `public/assets/images` folder to an S3 bucket,
   keeping the same folder structure (e.g. `portfolio/cardo/cover.png`
   stays at that same relative path inside the bucket).
2. Change one line in `.env`:
   ```
   IMAGE_BASE_URL="https://your-bucket-name.s3.amazonaws.com/assets/images"
   ```
   (or your CloudFront URL, if you put a CDN in front of the bucket).
3. Restart the server. Every image URL returned by every query updates
   automatically — nothing in the database or in the frontend needs to
   change.

## 6. Security layer

This backend now has several layers of protection, mostly focused on the
`sendMessage` (contact form) mutation, since it's the only public write
path:

| Layer | What it does | Where |
|---|---|---|
| Helmet | Security headers (hides `X-Powered-By`, sets HSTS, etc.) | `src/index.ts` |
| CORS whitelist | Only origins in `ALLOWED_ORIGINS`/`CORS_ORIGIN` can call the API | `src/index.ts` |
| Route-level rate limit | 300 req / 15 min per IP on `/graphql` overall | `src/index.ts` |
| Contact-specific rate limit | 5 submissions / hour per IP, since GraphQL has one route for everything | `src/security/contactRateLimit.ts` |
| Zod validation | Rejects malformed/oversized name, email, message | `src/security/validation.ts` |
| Honeypot field | Hidden `company` field - if filled, silently treated as spam | `src/graphql/resolvers.ts` |
| reCAPTCHA v3 | Invisible bot-score check (skipped with a warning if `RECAPTCHA_SECRET` isn't set) | `src/security/recaptcha.ts` |
| CSRF-style token | Stateless, signed, short-lived token from `GET /csrf-token` required on every submission | `src/security/csrf.ts` |
| GraphQL hardening | Introspection off in production, query depth capped at 8, body size capped at 100kb | `src/index.ts` |

**What your frontend needs to change** for the contact form to keep working:

1. On mount (or right before submit), call `GET /csrf-token` and store the
   returned `csrfToken`.
2. Get a reCAPTCHA v3 token client-side (Google's `grecaptcha.execute(...)`
   with your site key) right before submitting.
3. Include both in the mutation:

```graphql
mutation {
  sendMessage(input: {
    name: "...",
    email: "...",
    message: "...",
    csrfToken: "...",
    recaptchaToken: "..."
  }) {
    success
    message
  }
}
```

4. Add a `company` field to the form's HTML, but hide it visually with CSS
   that a bot's scraper won't recognize as "don't fill this in" — e.g.
   move it off-screen with `position: absolute; left: -9999px`, **not**
   `display: none` (some bots skip fields hidden that way).

If you skip steps 1–2, `sendMessage` will reject with `FORBIDDEN` (missing/
expired CSRF token) or a bot-verification error — that's expected, it means
the checks are working.

## Project layout

```
backend/
  docker-compose.yml     # local Postgres (+ pgAdmin)
  .env.example
  prisma/
    schema.prisma        # source of truth for the DB shape
    seed.ts              # runs sql/seed.sql through Prisma
  sql/
    schema.sql            # same shape as schema.prisma, raw SQL
    seed.sql               # INSERT statements with your real content
  src/
    index.ts               # Express + Apollo Server setup + security wiring
    context.ts              # shared GraphQL context type (req IP, etc.)
    prismaClient.ts
    graphql/
      typeDefs.ts
      resolvers.ts
    security/
      csrf.ts                # stateless CSRF-style token issue/verify
      recaptcha.ts            # reCAPTCHA v3 server-side verification
      contactRateLimit.ts     # per-IP limiter just for sendMessage
      validation.ts           # zod schema for contact form input
    utils/
      imageUrl.ts           # <- the S3-base-URL logic lives here
```
