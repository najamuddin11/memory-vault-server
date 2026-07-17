# Portfolio Backend

A GraphQL API for a developer portfolio site — one `homeData` query that returns everything the home page needs (services, projects, work experience, education, skills, testimonials, contact info), plus a `sendMessage` mutation for the contact form, with multiple layers of abuse protection baked in.

Pair it with the frontend as a full-stack template, or borrow individual pieces (the Prisma schema, the CSRF/rate-limit/honeypot stack, the image-URL indirection, etc.) for another project.

## Tech stack

- **Express** + **TypeScript**
- **Apollo Server** for the GraphQL layer
- **Prisma** as the ORM, **PostgreSQL** as the database
- **Zod** for input validation
- **Helmet**, **CORS whitelist**, **express-rate-limit** for baseline hardening
- **Nodemailer** for contact-form email delivery
- **Docker Compose** for a local Postgres + pgAdmin setup

## Prerequisites

- Node.js 20+
- Docker Desktop (or `docker` + `docker compose` on Linux) — used to run Postgres locally, see below

## Getting started

```bash
git clone <this-repo-url>
cd backend
npm install
# create a .env file with the variables listed below, then:
docker compose up -d
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Other scripts:

| Command                   | What it does                           |
| ------------------------- | -------------------------------------- |
| `npm run dev`             | Start the dev server (`tsx watch`)     |
| `npm run build`           | Type-check and compile to `dist/`      |
| `npm run start`           | Run the compiled build                 |
| `npm run seed`            | Seed the database from `sql/seed.sql`  |
| `npm run prisma:generate` | Regenerate the Prisma client           |
| `npm run prisma:migrate`  | Create/apply a Prisma migration        |
| `npm run prisma:studio`   | Open Prisma Studio (visual DB browser) |

## Environment variables

Create a `.env` file in the project root and set:

| Variable           | Required | Description                                                                                      |
| ------------------ | -------- | ------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`     | Yes      | Postgres connection string, e.g. `postgresql://user:pass@localhost:5432/portfolio?schema=public` |
| `IMAGE_BASE_URL`   | Yes      | Base URL prepended to every image/icon filename stored in the DB (e.g. an R2/S3 bucket URL)      |
| `ALLOWED_ORIGINS`  | Yes      | Comma-separated list of origins allowed to call the API (CORS whitelist)                         |
| `CSRF_SECRET`      | Yes      | Signing secret for the stateless CSRF token issued at `GET /csrf-token`                          |
| `CONTACT_TO_EMAIL` | Yes      | Inbox address that contact-form submissions are forwarded to                                     |
| `RECAPTCHA_SECRET` | No       | reCAPTCHA v3 server-side secret; if unset, that check is skipped with a warning                  |

Image fields (`Portfolio.image`, `Portfolio.projectLogo`,
`CarouselItem.img`) are stored in the database as **filenames only**
(e.g. `"portfolio/cardo/cover.png"`). The GraphQL layer prepends
`IMAGE_BASE_URL` before sending them to the frontend — see
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
    image: postgres:16-alpine # what to run
    environment:
      POSTGRES_USER: portfolio # \_ these three become your
      POSTGRES_PASSWORD: portfolio # /  connection string below
      POSTGRES_DB: portfolio
    ports:
      - "5432:5432" # host_port:container_port
    volumes:
      - portfolio_pgdata:/var/lib/postgresql/data # persists data
```

`ports: "5432:5432"` means "the Postgres running _inside_ the container on
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

| Layer                       | What it does                                                                             | Where                              |
| --------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------- |
| Helmet                      | Security headers (hides `X-Powered-By`, sets HSTS, etc.)                                 | `src/index.ts`                     |
| CORS whitelist              | Only origins in `ALLOWED_ORIGINS`/`CORS_ORIGIN` can call the API                         | `src/index.ts`                     |
| Route-level rate limit      | 300 req / 15 min per IP on `/graphql` overall                                            | `src/index.ts`                     |
| Contact-specific rate limit | 5 submissions / hour per IP, since GraphQL has one route for everything                  | `src/security/contactRateLimit.ts` |
| Zod validation              | Rejects malformed/oversized name, email, message                                         | `src/security/validation.ts`       |
| Honeypot field              | Hidden `company` field - if filled, silently treated as spam                             | `src/graphql/resolvers.ts`         |
| reCAPTCHA v3                | Invisible bot-score check (skipped with a warning if `RECAPTCHA_SECRET` isn't set)       | `src/security/recaptcha.ts`        |
| CSRF-style token            | Stateless, signed, short-lived token from `GET /csrf-token` required on every submission | `src/security/csrf.ts`             |
| GraphQL hardening           | Introspection off in production, query depth capped at 8, body size capped at 100kb      | `src/index.ts`                     |

**What your frontend needs to change** for the contact form to keep working:

1. On mount (or right before submit), call `GET /csrf-token` and store the
   returned `csrfToken`.
2. Get a reCAPTCHA v3 token client-side (Google's `grecaptcha.execute(...)`
   with your site key) right before submitting.
3. Include both in the mutation:

```graphql
mutation {
  sendMessage(
    input: {
      name: "..."
      email: "..."
      message: "..."
      csrfToken: "..."
      recaptchaToken: "..."
    }
  ) {
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

## Deploying to Cloud Run

This backend is set up to build and deploy as a container on **Google Cloud
Run**, with Postgres hosted externally (e.g. [Neon](https://neon.tech)).

### One-time setup

1. Create a Postgres database with your provider of choice and grab its
   connection string.
2. Store secrets in **Secret Manager** rather than a plaintext env file:
   ```bash
   echo -n "postgresql://user:password@host/dbname?sslmode=require" | \
     gcloud secrets create database-url --data-file=-
   ```
   Repeat for any other secret values (`csrf-secret`, `recaptcha-secret`,
   etc.) instead of committing them to `cloud-run-env.yaml`.

### Deploy

`cloudbuild.yaml` builds the Docker image, pushes it to Artifact Registry,
and deploys it to Cloud Run:

```bash
gcloud builds submit --config cloudbuild.yaml
```

The first deploy also needs the non-secret env vars and secret references
attached to the service:

```bash
gcloud run deploy memory-vault-backend \
  --image=us-central1-docker.pkg.dev/<PROJECT_ID>/cloud-run-source-deploy/memory-vault-backend \
  --region=us-central1 \
  --set-env-vars="NODE_ENV=production,IMAGE_BASE_URL=<your-bucket-url>,CONTACT_TO_EMAIL=<your-email>,^;^ALLOWED_ORIGINS=<origin1>,<origin2>" \
  --set-secrets="DATABASE_URL=database-url:latest,CSRF_SECRET=csrf-secret:latest"
```

(`^;^` before `ALLOWED_ORIGINS` tells gcloud to split env-var pairs on `;`
instead of `,`, since the value itself contains commas.)

### Updating env vars or secrets later

```bash
# Update a plain env var:
gcloud run services update memory-vault-backend \
  --region=us-central1 \
  --update-env-vars="^;^ALLOWED_ORIGINS=<origin1>,<origin2>"

# Rotate a secret (e.g. after changing the DB password):
echo -n "postgresql://user:new-password@host/dbname?sslmode=require" | \
  gcloud secrets versions add database-url --data-file=-
# Cloud Run picks up :latest on the next revision — redeploy to pick it up:
gcloud run services update memory-vault-backend --region=us-central1
```

Check the live config anytime with:

```bash
gcloud run services describe memory-vault-backend \
  --region=us-central1 \
  --format="value(spec.template.spec.containers[0].env)"
```

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
