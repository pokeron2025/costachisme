
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const url =
      process.env.DISCORD_PUBLISH_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;

    if (!url) {
      return NextResponse.json(
        { ok: false, error: "No hay DISCORD_WEBHOOK_URL ni DISCORD_PUBLISH_WEBHOOK_URL en env." },
        { status: 500 }
      );
    }

    const body = {
      content: "🔔 Ping de prueba desde `/api/discord-ping` (Costachisme).",
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await res.text();

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      usedEnv: url.includes("DISCORD_PUBLISH_WEBHOOK_URL")
        ? "DISCORD_PUBLISH_WEBHOOK_URL"
        : "DISCORD_WEBHOOK_URL",
      note: res.ok ? "Mensaje enviado a Discord." : "Discord respondió error.",
      bodyPreview: text.slice(0, 200),
    }, { status: res.ok ? 200 : 500 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Fallo inesperado enviando al webhook." },
      { status: 500 }
    );
  }
}
