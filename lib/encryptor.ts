const keyBytes = Uint8Array.from(
  process.env.AES_KEY!.match(/.{2}/g)!.map((b) => parseInt(b, 16)),
);

const cryptoKeyPromise = crypto.subtle.importKey(
  "raw",
  keyBytes,
  "AES-GCM",
  false,
  ["encrypt", "decrypt"],
);

export async function encryptUrl(url: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const key = await cryptoKeyPromise;

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    new TextEncoder().encode(url),
  );

  const out = new Uint8Array(iv.length + encrypted.byteLength);

  out.set(iv, 0);
  out.set(new Uint8Array(encrypted), iv.length);

  return Buffer.from(out)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function decryptUrl(data: string) {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");

  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

  const bytes = Uint8Array.from(Buffer.from(padded, "base64"));

  const iv = bytes.slice(0, 12);
  const encrypted = bytes.slice(12);

  const key = await cryptoKeyPromise;

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    encrypted,
  );

  return new TextDecoder().decode(decrypted);
}
