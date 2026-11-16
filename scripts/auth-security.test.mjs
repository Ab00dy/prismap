import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("preview popup accepts a token only from the opened window at the same origin", () => {
  const client = source("src/lib/auth/client.ts");
  assert.match(client, /event\.origin !== origin\s*\|\|\s*event\.source !== popup/);
  assert.match(client, /data\.source !== "grok-auth-popup"/);
  assert.match(client, /typeof data\.token !== "string"/);
});

test("gate session diagnostics never log Set-Cookie credential values", () => {
  const gate = source("src/lib/auth/gate-session.server.ts");
  assert.doesNotMatch(gate, /cookiePreview|signedCookie\.slice\(/);
  assert.match(gate, /signed Set-Cookie missing session token value/);
});
