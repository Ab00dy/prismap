import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Shared LIVE-PREVIEW OAuth client (server-only — NEVER import from the client).
 *
 * The sandbox serves each live preview on a dynamic `https://*.grok-sandbox.com`
 * URL, which can't be pre-registered per app. The broker instead exposes ONE
 * shared "preview" client that accepts any
 * `https://*.grok-sandbox.com/api/auth/oauth2/callback/*`.
 * When deployed, the deployer injects a per-app `GROK_AUTH_*` that overrides
 * these (see `server.ts`).
 *
 * The preview client secret is never committed. Set `GROK_PREVIEW_CLIENT_SECRET`,
 * or place it in the untracked file `.grok/preview-client-secret`.
 */
export const PREVIEW_CLIENT_ID = "grok_preview";

function readPreviewSecret(): string {
  const fromEnv = process.env.GROK_PREVIEW_CLIENT_SECRET?.trim();
  if (fromEnv) return fromEnv;
  try {
    return readFileSync(join(process.cwd(), ".grok", "preview-client-secret"), "utf8").trim();
  } catch {
    return "";
  }
}

export const PREVIEW_CLIENT_SECRET = readPreviewSecret();

/** The shared auth broker issuer (OIDC discovery lives under it). */
export const GROK_ISSUER_DEFAULT = "https://auth.grok.me";

/**
 * Host patterns whose callbacks the preview client accepts. Better Auth derives
 * the live preview's real origin from the request host and validates it against
 * this list (wildcard-matched), so the OAuth `redirect_uri` becomes the concrete
 * `https://<preview-host>/api/auth/oauth2/callback/...` the broker allows.
 */
export const PREVIEW_ALLOWED_HOSTS = ["*.grok-sandbox.com"] as const;
