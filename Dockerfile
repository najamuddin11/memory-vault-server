# ---- Base image (shared by every stage) ----
FROM node:20-alpine AS base
# Prisma's engine needs openssl on Alpine
RUN apk add --no-cache openssl
WORKDIR /app

# ---- Install ALL deps (needed to build TypeScript) ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- Build: compile TS + generate Prisma client ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- Production: only prod deps + compiled output ----
FROM base AS production
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
RUN npx prisma generate

EXPOSE 4000

# Applies any pending migrations, then starts the server.
# Safe to run on every boot - migrate deploy is a no-op if nothing is pending.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
