import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const schema = z.object({
  submissionId: z.string().uuid(),
  voter: z.string().min(3),
  reason: z.string().min(3).max(200),
});

async function notifyDiscord(submissionId: string, title: string | null, reason: string) {
  if (!process.env.DISCORD_WEBHOOK_URL) return;
  const content =
    `🚩 **Nuevo reporte**\n` +
    `• **Publicación**: ${title || "(sin título)"}\n` +
    `• **ID**: ${submissionId}\n` +
    `• **Motivo**: ${reason}`;
  await fetch(process.env.DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content }),
  }).catch(() => {});
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse({
      submissionId: body?.submissionId ?? body?.id,
      voter: body?.voter,
      reason: body?.reason,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.errors[0]?.message || "Datos inválidos" },
        { status: 400 }
      );
    }
    const { submissionId, voter, reason } = parsed.data;

    const { error: errIns } = await supabase.from("reports").insert({
      submission_id: submissionId,
      voter,
      reason,
    });
    if (errIns) {
      return NextResponse.json(
        { ok: false, error: errIns.message || "No se pudo guardar el reporte" },
        { status: 500 }
      );
    }

    // buscar título (opcional, para que el mensaje sea más útil)
    const { data: sub } = await supabase
      .from("submissions")
      .select("title")
      .eq("id", submissionId)
      .maybeSingle();

    await notifyDiscord(submissionId, sub?.title ?? null, reason);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error inesperado" }, { status: 500 });
  }
}
