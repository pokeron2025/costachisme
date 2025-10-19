// app/api/submit/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// Supabase (usa tus keys públicas ya configuradas)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Validación: igual que en tu cliente
const schema = z.object({
  category: z.enum(["RUMOR", "REPORTE"]),
  title: z.string().min(5).max(80),
  content: z.string().min(12).max(400),
  barrio: z.string().max(60).optional().or(z.literal("")),
  imagen_url: z.string().url().optional().or(z.literal("")),
});

// Enviar a Discord (si hay webhook configurado)
async function notifyDiscord(payload: {
  category: "RUMOR" | "REPORTE";
  title: string;
  content: string;
  barrio?: string | null;
}) {
  const url =
    process.env.DISCORD_PUBLISH_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
  if (!url) return; // sin webhook, no notificamos

  const { category, title, content, barrio } = payload;

  const icon = category === "RUMOR" ? "📰 Rumor" : "📮 Buzón";
  const preview =
    content.length > 200 ? content.slice(0, 200).trimEnd() + "…" : content;

  const lines = [
    `**${icon} nuevo**`,
    `• **Título:** ${title}`,
    `• **Texto:** ${preview}`,
    barrio ? `• **Barrio/Colonia:** ${barrio}` : null,
  ].filter(Boolean);

  const body = { content: lines.join("\n") };

  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message || "Datos inválidos";
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }

    const { category, title, content, barrio, imagen_url } = parsed.data;

    // Normalizar strings opcionales a null
    const barrioNorm = barrio?.trim() ? barrio.trim() : null;
    const imgNorm = imagen_url?.trim() ? imagen_url.trim() : null;

    // Insertar en submissions con moderación ("pending")
    const { data, error } = await supabase
      .from("submissions")
      .insert({
        category,
        title: title.trim(),
        content: content.trim(),
        barrio: barrioNorm,
        imagen_url: imgNorm,
        status: "pending", // 👈 quedará visible cuando lo apruebes
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    // Notificar a Discord (no bloquea la respuesta si falla)
    notifyDiscord({
      category,
      title: title.trim(),
      content: content.trim(),
      barrio: barrioNorm ?? undefined,
    }).catch(() => {});

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Error inesperado" },
      { status: 500 }
    );
  }
}
