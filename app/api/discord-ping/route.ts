// app/api/discord-ping/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.DISCORD_PUBLISH_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;

  if (!url) {
    return NextResponse.json({ ok: false, error: "No webhook URL configurado" }, { status: 500 });
  }

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "✅ Test desde /api/discord-ping — conexión funcionando.",
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error enviando a Discord" }, { status: 500 });
  }
}
