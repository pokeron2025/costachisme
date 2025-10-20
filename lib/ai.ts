// lib/ai.ts
import { supabaseAdmin } from "@/lib/supabase";

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_API_TOKEN  = process.env.CF_API_TOKEN  || process.env.CLOUDFLARE_API_TOKEN;
const CF_MODEL      = process.env.CF_MODEL || "cf/black-forest-labs/flux-1-schnell";

// Sube PNG a Supabase Storage (bucket: ai-images) y devuelve URL pública
async function uploadToSupabase(imageBuffer: Buffer, fileName: string): Promise<string> {
  const { error } = await supabaseAdmin
    .storage
    .from("ai-images")
    .upload(fileName, imageBuffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabaseAdmin.storage.from("ai-images").getPublicUrl(fileName);
  return data.publicUrl;
}

// Genera imagen con Cloudflare Workers AI y la sube a Supabase
export async function generateImageFromPrompt(prompt: string): Promise<string> {
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
    throw new Error("Faltan CF_ACCOUNT_ID / CF_API_TOKEN en variables de entorno");
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${encodeURIComponent(CF_MODEL)}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Cloudflare AI ${res.status}: ${errText}`);
  }

  // Algunos modelos devuelven JSON(base64), otros PNG binario. Soportamos ambos.
  const ct = res.headers.get("content-type") || "";
  let pngBuffer: Buffer;

  if (ct.includes("application/json")) {
    const data: any = await res.json();
    const b64 =
      data?.result?.image_base64 ||
      data?.result?.image ||
      data?.image;
    if (!b64) throw new Error("Respuesta sin image_base64");
    pngBuffer = Buffer.from(b64, "base64");
  } else {
    const ab = await res.arrayBuffer();
    pngBuffer = Buffer.from(ab);
  }

  const fileName = `cf-${Date.now()}.png`;
  const publicUrl = await uploadToSupabase(pngBuffer, fileName);
  return publicUrl; // <- esto usará el resto del flujo (cola/approve) como antes
}
