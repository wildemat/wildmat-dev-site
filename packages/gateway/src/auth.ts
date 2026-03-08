const COOKIE_NAME = 'site_auth';
const HMAC_PAYLOAD = 'wildmat-authenticated';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

async function getKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function bufToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function createToken(secret: string): Promise<string> {
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(HMAC_PAYLOAD));
  return bufToHex(sig);
}

export async function verifyToken(token: string, secret: string): Promise<boolean> {
  const expected = await createToken(secret);
  if (token.length !== expected.length) return false;

  // Timing-safe comparison
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

export function parseCookie(header: string | undefined): string | null {
  if (!header) return null;
  const match = header.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

export function buildSetCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; Max-Age=${MAX_AGE}; Path=/; Domain=.wildmat.dev; HttpOnly; Secure; SameSite=Lax`;
}

export function buildClearCookie(): string {
  return `${COOKIE_NAME}=; Max-Age=0; Path=/; Domain=.wildmat.dev; HttpOnly; Secure; SameSite=Lax`;
}
