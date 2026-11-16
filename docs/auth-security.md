# Authentication security and deployment checklist

Prismap is a public atlas. Its Better Auth framework is **opt-in**; enabling it
does not automatically protect the atlas route. Do not enable login or add a
user database unless product requirements demand user accounts.

## Source-level safeguards

- The preview popup listener must validate both the expected origin **and**
  `event.source === popup` before accepting a bearer token.
- Never include session cookies, bearer tokens, OAuth codes, or identity headers
  in logs, including truncated diagnostic snippets.
- Preview bearer tokens currently live in `sessionStorage` because embedded
  iframe cookies are partitioned. This is an XSS exposure surface; never
  transplant preview token storage into a deployed production login flow.
- Production sessions should remain in `Secure`, `HttpOnly`, host-only
  `__Host-` cookies. Maintain the server-side session verifier and origin checks.

## Deployment requirements (cannot be enforced by repository code alone)

1. Terminate HTTPS at a trusted reverse proxy or the official platform gate.
   Block direct public access to the application backend when it accepts
   `x-grok-identity` or `x-connector-access-token`.
2. Have the trusted proxy **strip and replace** inbound client-supplied
   `x-grok-identity`, `x-connector-access-token`, `x-forwarded-host`,
   `forwarded`, and similar forwarded identity/host headers. Do not
   trust an arbitrary client's forwarded host to select an identity issuer.
3. Prefer a trusted server-configured `GROK_GATE_ORIGIN` for deployments,
   with the exact gateway issuer, rather than deriving the issuer from an
   untrusted host header. Ensure the gateway issuer and audience are the
   intended ones, and use HTTPS for deployed gate origins.
4. Inject `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
   `GROK_AUTH_CLIENT_ID`, and `GROK_AUTH_CLIENT_SECRET` as secrets in
   the deployment environment. Never place them in client-side `VITE_*`
   values, tracked config, logs, or commits.
5. When enabling accounts, mount the Better Auth handler, add a login route,
   protect every private server function with `authMiddleware`, and scope
   every per-user SQL query to `context.userId`. Test signed-out and
   cross-user access server-side.
6. Deploy a durable database and migrations for accounts. Rotate compromised
   credentials and invalidate affected sessions.
7. Enforce a content security policy, escape untrusted HTML, audit third-party
   scripts, and test for XSS before enabling embedded-preview auth in untrusted
   contexts.
8. Test the login/callback, cross-origin rejection, logout, identity switching,
   and recovery flows after deployment. These controls have not been validated
   against a running hosted application by this review.

Run `npm test`, `npm run typecheck`, and `npm run lint` in CI.
