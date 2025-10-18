// app/api/comments/[submissionId]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Usa Service Role en server para evitar problemas con RLS en inserts/reads.
// (Tu proyecto ya tiene SUPABASE_SERVICE_ROLE_KEY en Vercel según tu captura)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Fallback por si faltan variables
if (!supabaseUrl || !serviceKey) {
  console.warn(
    "[comments API] Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabase = createClient(supabaseUrl, serviceKey);

// Pequeña utilidad para validar y limpiar texto
function clean(str: unknown) {
  return (typeof str === "string" ? str : "").trim();
}

// GET: lista comentarios de un submission
// /api/comments/:submissionId?limit=30
export async function GET(
  req: Request,
  { params }: { params: { submissionId: string } }
) {
  try {
    const submissionId = params.submissionId;
    if (!submissionId) {
      return NextResponse.json(
        { ok: false, error: "Falta submissionId" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit") ?? 30))
    );

    const { data, error } = await supabase
      .from("comments")
      .select("id, body, nickname, created_at")
      .eq("submission_id", submissionId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error" },
      { status: 500 }
    );
  }
}

// POST: crea comentario anónimo en un submission
// body: { body: string, nickname?: string }
export async function POST(
  req: Request,
  { params }: { params: { submissionId: string } }
) {
  try {
    const submissionId = params.submissionId;
    if (!submissionId) {
      return NextResponse.json(
        { ok: false, error: "Falta submissionId" },
        { status: 400 }
      );
    }

    const json = await req.json().catch(() => ({}));
    const body = clean(json.body);
    const nickname = clean(json.nickname);

    // Validaciones simples (ajústalas si quieres otros mínimos/máximos)
    if (body.length < 3 || body.length > 500) {
      return NextResponse.json(
        {
          ok: false,
          error: "El comentario debe tener entre 3 y 500 caracteres.",
        },
        { status: 400 }
      );
    }
    if (nickname && nickname.length > 40) {
      return NextResponse.json(
        { ok: false, error: "El apodo no debe exceder 40 caracteres." },
        { status: 400 }
      );
    }

    // Inserta comentario
    const { data, error } = await supabase
      .from("comments")
      .insert({
        submission_id: submissionId,
        body,
        nickname: nickname || null,
      })
      .select("id, body, nickname, created_at")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error" },
      { status: 500 }
    );
  }
}

// Opcional: CORS preflight si lo necesitas
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
