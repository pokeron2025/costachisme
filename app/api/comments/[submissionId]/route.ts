import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(_: Request, { params }: { params: { submissionId: string } }) {
  const { submissionId } = params;
  const { data, error } = await supabase
    .from("comments")
    .select("id, body, nickname, created_at")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: Request, { params }: { params: { submissionId: string } }) {
  const { submissionId } = params;
  const { body, nickname } = await req.json();

  if (!body || body.length < 3) {
    return NextResponse.json({ ok: false, error: "Comentario muy corto" }, { status: 400 });
  }

  const { error } = await supabase.from("comments").insert([
    { submission_id: submissionId, body, nickname },
  ]);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
