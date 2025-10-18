// app/api/vote/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Cliente público (anon) para RPC
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type VoteBody = { id?: string; voter?: string };

export async function POST(req: Request) {
  try {
    const { id, voter }: VoteBody = await req.json();

    // Validaciones básicas
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { ok: false, error: "Falta 'id' (UUID de la publicación)." },
        { status: 400 }
      );
    }
    const voterSafe =
      typeof voter === "string" && voter.trim().length > 0 ? voter.trim() : "anon";

    // Llamada a la función SQL (RPC) que suma solo si no existe voto previo
    const { error } = await supabase.rpc("increment_score", {
      p_submission_id: id,
      p_voter: voterSafe,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Error procesando la solicitud" },
      { status: 500 }
    );
  }
}
