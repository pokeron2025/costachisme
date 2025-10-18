import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { id, voter, reaction } = await req.json();

    if (!id || !voter || !reaction) {
      return NextResponse.json({ ok: false, error: "Faltan campos" }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("react", {
      p_submission_id: id,
      p_voter: voter,
      p_reaction: reaction,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, totals: data?.[0] ?? null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
