// app/api/report/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { submissionId, reason, voter } = await req.json();

    if (!submissionId) {
      return NextResponse.json(
        { ok: false, error: "submissionId requerido" },
        { status: 400 }
      );
    }
    if (!voter) {
      return NextResponse.json(
        { ok: false, error: "voter requerido" },
        { status: 400 }
      );
    }

    const cleanReason = String(reason ?? "").slice(0, 300);

    const { error } = await supabase.from("reports").insert({
      submission_id: submissionId, // 👈 nombre de columna en DB
      reason: cleanReason,
      voter,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Error de parseo" },
      { status: 400 }
    );
  }
}
