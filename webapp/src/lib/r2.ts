// Cloudflare R2 via REST API (Global API Key auth)
// No S3-compatible tokens needed

const ACCOUNT_ID = process.env.CF_ACCOUNT_ID || "";
const API_KEY = process.env.CF_API_KEY || "";
const API_EMAIL = process.env.CF_API_EMAIL || "";
const BUCKET = process.env.R2_BUCKET_NAME || "kigyo-dm-images";
const PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

const BASE = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/objects`;

function headers(contentType?: string): Record<string, string> {
  const h: Record<string, string> = {
    "X-Auth-Email": API_EMAIL,
    "X-Auth-Key": API_KEY,
  };
  if (contentType) h["Content-Type"] = contentType;
  return h;
}

export async function uploadJpg(key: string, buffer: Buffer): Promise<string> {
  const res = await fetch(`${BASE}/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: headers("image/jpeg"),
    body: new Uint8Array(buffer),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`R2 upload failed (${res.status}): ${text}`);
  }
  return `${PUBLIC_URL}/${key}`;
}

export async function deleteJpg(key: string): Promise<void> {
  try {
    await fetch(`${BASE}/${encodeURIComponent(key)}`, {
      method: "DELETE",
      headers: headers(),
    });
  } catch {
    // best-effort deletion
  }
}
