import "dotenv/config";
import express from "express";
import type { Request } from "express";
import cors from "cors";
import helmet from "helmet";
import bodyParser from "body-parser";
import rateLimit from "express-rate-limit";
import depthLimit from "graphql-depth-limit";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { typeDefs } from "./graphql/typeDefs.js";
import { resolvers } from "./graphql/resolvers.js";
import { issueCsrfToken } from "./security/csrf.js";
import type { GraphQLContext } from "./context.js";

const PORT = Number(process.env.PORT ?? 4000);
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Support either a single CORS_ORIGIN (back-compat) or a comma-separated
// ALLOWED_ORIGINS list for multiple environments (e.g. prod + staging).
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") ?? [];

async function main() {
  const app = express();

  // Behind a reverse proxy (Nginx, Render, Fly, etc.) this makes req.ip
  // reflect the real client IP (from X-Forwarded-For) instead of the
  // proxy's - important for rate limiting to work correctly.
  app.set("trust proxy", 1);

  // Security headers (hides X-Powered-By, sets sensible defaults for
  // HSTS, X-Content-Type-Options, X-Frame-Options, etc.)
  if (IS_PRODUCTION) app.use(helmet());

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      credentials: true,
    }),
  );

  // Coarse, route-level rate limit for the whole /graphql endpoint.
  // The sendMessage mutation additionally has its own, stricter
  // per-IP limit inside the resolver (see src/security/contactRateLimit.ts)
  // since GraphQL multiplexes every operation through this one route.
  const graphqlLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  });

  const csrfLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Frontend calls this once when the contact form mounts (and again if a
  // submission fails with an expired-token error) to get a fresh token to
  // include as `csrfToken` in the sendMessage mutation input.
  app.get("/csrf-token", csrfLimiter, (_req, res) => {
    res.json({ csrfToken: issueCsrfToken() });
  });

  const apolloServer = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    // Disable introspection (schema discovery) outside development so the
    // full schema isn't handed to anyone who asks.
    // introspection: !IS_PRODUCTION,
    // Caps how deeply nested a single query can be, to blunt malicious or
    // accidental resource-exhaustion queries.
    validationRules: [depthLimit(8)],
  });
  await apolloServer.start();

  app.use(
    "/graphql",
    graphqlLimiter,
    // Cap body size - the contact form doesn't need to send megabytes.
    bodyParser.json({ limit: "100kb" }),
    expressMiddleware(apolloServer, {
      context: async ({ req }: { req: Request }): Promise<GraphQLContext> => ({
        ip: req.ip ?? "unknown",
      }),
    }),
  );

  app.listen(PORT, () => {
    console.log(`GraphQL server ready at http://localhost:${PORT}/graphql`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
