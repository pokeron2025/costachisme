// app/api/submit/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// Supabase (keys públicas del cliente)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Validación (igual que en el cliente)
const schema = z.object({
  category: z.enum(["RUMOR", "REPORTE"]),
  title: z.string().min(5).max(80),
  content: z.string().min(12).max(400),
  barrio: z.string().max(60).optional().or(z.literal("")),
  imagen_url: z.string().url().optional().or(z.literal("")),
});

// Notificación a Discord (opcional)
async function notifyDiscord(payload: {
  category: "RUMOR" | "REPORTE";
  title: string;
  content: string;
  barrio?: string | null;
}) {
  const url =
    process.env.DISCORD_PUBLISH_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;

  const { category, title, content, barrio } = payload;
  const icon = category === "RUMOR" ? "📰 Rumor" : "📮 Buzón";
  const preview = content.length > 200 ? content.slice(0, 200).trimEnd() + "…" : content;

  const body = {
    content: [
      `**${icon} nuevo**`,
      `• **Título:** ${title}`,
      `• **Texto:** ${preview}`,
      barrio ? `• **Barrio/Colonia:** ${barrio}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  };

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

    // Normaliza opcionales a null
    const barrioNorm = barrio?.trim() ? barrio.trim() : null;
    const imgNorm = imagen_url?.trim() ? imagen_url.trim() : null;

    // Inserta como 'pending' y NO hagas SELECT después
    const { error } = await supabase
      .from("submissions")
      .insert(
        [
          {
            category,
            title: title.trim(),
            content: content.trim(),
            barrio: barrioNorm,
            imagen_url: imgNorm,
            status: "pending",
          },
        ],
        { returning: "minimal" } // <- clave: evita SELECT post-insert
      );

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    // Notifica a Discord (no bloqueante)
    notifyDiscord({
      category,
      title: title.trim(),
      content: content.trim(),
      barrio: barrioNorm,
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Error inesperado" },
      { status: 500 }
    );
  }
}
