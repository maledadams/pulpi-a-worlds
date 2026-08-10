const TOKEN_ENCODER = new TextEncoder();

async function getHmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    TOKEN_ENCODER.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toBase64Url(bytes: ArrayBuffer) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function signOrderConfirmToken(orderId: string, secret: string) {
  const key = await getHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, TOKEN_ENCODER.encode(orderId));
  return toBase64Url(signature);
}

export async function verifyOrderConfirmToken(orderId: string, token: string, secret: string) {
  if (!token) return false;
  const expected = await signOrderConfirmToken(orderId, secret);
  if (expected.length !== token.length) return false;

  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= expected.charCodeAt(index) ^ token.charCodeAt(index);
  }
  return mismatch === 0;
}
