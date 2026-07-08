// Lightweight, stateless "CSRF-style" token.
//
// Why this instead of classic session-cookie CSRF tokens: this API has no
// login/session cookies, so there's no session to forge a request against
// in the traditional CSRF sense. What we DO want to stop is random other
// origins/scripts blind-POSTing to /graphql's sendMessage mutation.
//
// The trick: /csrf-token can only be *read* by the real frontend, because
// our CORS policy blocks other origins from reading the response body
// (the browser still lets them fire the request, but they can't see the
// token in the reply). So a token only becomes usable if you could load it
// from an allowed origin - good enough defense-in-depth for a public form,
// with no server-side session state to manage.
//
// The token itself is just an HMAC-signed timestamp + nonce, so any
// instance of this server can verify it without a shared session store.

import crypto from "node:crypto";

const CSRF_SECRET = process.env.CSRF_SECRET ?? "dev-only-change-me";
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

if (process.env.NODE_ENV === "production" && process.env.CSRF_SECRET === undefined) {
  console.warn(
    "[security] CSRF_SECRET is not set - using an insecure default. Set CSRF_SECRET in your environment.",
  );
}

export function issueCsrfToken(): string {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload = `${timestamp}.${nonce}`;
  const signature = crypto.createHmac("sha256", CSRF_SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

export function verifyCsrfToken(token: string | undefined | null): boolean {
  if (!token) return false;

  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(".");
    if (parts.length !== 3) return false;
    const [timestamp, nonce, signature] = parts;

    const payload = `${timestamp}.${nonce}`;
    const expected = crypto.createHmac("sha256", CSRF_SECRET).update(payload).digest("hex");

    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length) return false;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return false;

    const age = Date.now() - Number(timestamp);
    if (Number.isNaN(age) || age < 0 || age > TOKEN_TTL_MS) return false;

    return true;
  } catch {
    return false;
  }
}
