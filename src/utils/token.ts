/**
 * HMAC-SHA256 token generation and verification.
 * Uses only Web Crypto API available in Bun — zero npm dependencies.
 */

async function getKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate a random 32-byte hex token string.
 */
export function generateTokenId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Sign a payload with HMAC-SHA256, returning `base64url(payload).base64url(signature)`.
 */
export async function signToken(payload: string, secret: string): Promise<string> {
  const key = await getKey(secret);
  const encoder = new TextEncoder();
  const payloadB64 = toBase64Url(encoder.encode(payload).buffer as ArrayBuffer);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64));
  const signatureB64 = toBase64Url(signature);
  return `${payloadB64}.${signatureB64}`;
}

/**
 * Verify an HMAC-signed token. Returns the original payload if valid, null otherwise.
 */
export async function verifyToken(token: string, secret: string): Promise<string | null> {
  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return null;

  const payloadB64 = token.slice(0, dotIndex);
  const signatureB64 = token.slice(dotIndex + 1);

  try {
    const key = await getKey(secret);
    const encoder = new TextEncoder();
    const signatureBytes = fromBase64Url(signatureB64);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      encoder.encode(payloadB64)
    );

    if (!valid) return null;

    const payloadBytes = fromBase64Url(payloadB64);
    return new TextDecoder().decode(payloadBytes);
  } catch {
    return null;
  }
}
