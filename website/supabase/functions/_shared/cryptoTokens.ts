// AES-GCM token encryption/decryption keyed on OUTLOOK_TOKEN_SECRET.
//
// Output format: base64(iv || ciphertext) — 12-byte IV prepended to the
// ciphertext, then base64 encoded for storage as a plain text column.
//
// If OUTLOOK_TOKEN_SECRET is not set, falls back to a deterministic
// key derived from SUPABASE_SERVICE_ROLE_KEY so the function still
// works in dev without extra config (the service key is already secret).
//
// Tokens stored this way are NOT visible to any client — RLS blocks
// reads by non-developers, and even for developers the ciphertext is
// meaningless without the server-side key.

const SECRET = Deno.env.get("OUTLOOK_TOKEN_SECRET") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "fallback-dev-key-change-me";

let cachedKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const raw = new TextEncoder().encode(SECRET);
  // Derive a 256-bit key by SHA-256 hashing the secret
  const hash = await crypto.subtle.digest("SHA-256", raw);
  cachedKey = await crypto.subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
  return cachedKey;
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function encryptToken(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext))
  );
  const combined = new Uint8Array(iv.length + ct.length);
  combined.set(iv, 0);
  combined.set(ct, iv.length);
  return toBase64(combined);
}

export async function decryptToken(ciphertext: string): Promise<string> {
  const key = await getKey();
  const combined = fromBase64(ciphertext);
  const iv = combined.slice(0, 12);
  const ct = combined.slice(12);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}
