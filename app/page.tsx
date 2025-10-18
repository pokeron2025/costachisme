"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// --- Config Supabase ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- Tipos ---
type Submission = {
  id: string;
  title: string;
  content: string;
  location?: string;
  image_url?: string;
  score: number;
  created_at: string;
};

type Totals = {
  like_count: number;
  dislike_count: number;
  haha_count: number;
  wow_count: number;
  angry_count: number;
  sad_count: number;
};

// --- Helpers ---
function getVoterId() {
  const key = "voter-id";
  let v = localStorage.getItem(key);
  if (!v) {
    v = crypto.randomUUID();
    localStorage.setItem(key, v);
  }
  return v;
}

// Reacciones disponibles
const REACTIONS = [
  { key: "like", label: "👍" },
  { key: "dislike", label: "👎" },
  { key: "haha", label: "😂" },
  { key: "wow", label: "😮" },
  { key: "angry", label: "😡" },
  { key: "sad", label: "😢" },
];

export default function HomePage() {
  const [feed, setFeed] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [voter, setVoter] = useState<string>("");
  const [reactionTotals, setReactionTotals] = useState<Record<string, Totals>>({});
  const [myReaction, setMyReaction] = useState<Record<string, string>>({});

  const [order, setOrder] = useState<"recent" | "score">("recent");

  // Inicializar voterId
  useEffect(() => {
    setVoter(getVoterId());
  }, []);

  // Cargar feed
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let query = supabase.from("submissions").select("*");
      if (order === "recent") {
        query = query.order("created_at", { ascending: false });
      } else if (order === "score") {
        query = query.order("score", { ascending: false });
      }
      const { data, error } = await query;
      if (!error && data) setFeed(data as Submission[]);
      setLoading(false);
    };
    load();
  }, [order]);

  // Enviar rumor
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (title.length < 5 || content.length < 12) return;

    const { error } = await supabase.from("submissions").insert([
      {
        title,
        content,
        location,
        image_url: imageUrl,
        score: 0,
      },
    ]);

    if (!error) {
      setTitle("");
      setContent("");
      setLocation("");
      setImageUrl("");
      // recargar feed
      const { data: fresh } = await supabase
        .from("submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (fresh) setFeed(fresh as Submission[]);
    }
  }

  // Reaccionar
  async function handleReact(id: string, reaction: string) {
    const res = await fetch("/api/react", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, voter, reaction }),
    });
    const j = await res.json();
    if (res.ok && j.ok && j.totals) {
      setMyReaction((m) => ({ ...m, [id]: reaction }));
      setReactionTotals((m) => ({ ...m, [id]: j.totals as Totals }));
    }
  }

  return (
    <main className="max-w-5xl mx-auto p-4 grid md:grid-cols-2 gap-6">
      {/* Formulario */}
      <section className="rounded-lg border p-4 space-y-3">
        <h2 className="font-semibold text-lg">Enviar Rumor</h2>
        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Se dice que..."
            className="w-full border rounded p-2"
            minLength={5}
            maxLength={80}
            required
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Sin nombres ni datos personales. Enfócate en situaciones."
            className="w-full border rounded p-2"
            minLength={12}
            maxLength={400}
            required
          />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Barrio/Colonia (opcional)"
            className="w-full border rounded p-2"
          />
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="URL de imagen (opcional)"
            className="w-full border rounded p-2"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Enviar
          </button>
        </form>
      </section>

      {/* Feed */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-lg">Rumores</h2>
          <select
            value={order}
            onChange={(e) => setOrder(e.target.value as any)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="recent">Más recientes</option>
            <option value="score">Más votados</option>
          </select>
        </div>

        {loading && <p>Cargando...</p>}
        {!loading &&
          feed.map((item) => (
            <div key={item.id} className="border rounded-lg p-4 space-y-2">
              <p className="text-xs text-gray-500">
                {new Date(item.created_at).toLocaleString()}
              </p>
              <h3 className="font-bold">{item.title}</h3>
              <p>{item.content}</p>
              {item.location && (
                <p className="text-sm text-gray-600">📍 {item.location}</p>
              )}
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt="rumor"
                  className="rounded-lg max-h-60"
                />
              )}

              {/* Reacciones */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {REACTIONS.map((r) => {
                  const selected = myReaction[item.id] === r.key;
                  const totals = reactionTotals[item.id];
                  const count =
                    r.key === "like"
                      ? totals?.like_count
                      : r.key === "dislike"
                      ? totals?.dislike_count
                      : r.key === "haha"
                      ? totals?.haha_count
                      : r.key === "wow"
                      ? totals?.wow_count
                      : r.key === "angry"
                      ? totals?.angry_count
                      : totals?.sad_count;

                  return (
                    <button
                      key={r.key}
                      onClick={() => handleReact(item.id, r.key)}
                      className={`px-2 py-1 rounded border text-sm ${
                        selected
                          ? "bg-emerald-600 text-white"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      {r.label} {typeof count === "number" ? count : ""}
                    </button>
                  );
                })}
              </div>

              {/* Comentarios */}
              <CommentBox submissionId={item.id} />
            </div>
          ))}
      </section>
    </main>
  );
}

// --- Componente de comentarios ---
function CommentBox({ submissionId }: { submissionId: string }) {
  const [list, setList] = useState<
    Array<{ id: string; body: string; nickname: string | null; created_at: string }>
  >([]);
  const [body, setBody] = useState("");
  const [nickname, setNickname] = useState("");

  async function load() {
    const r = await fetch(`/api/comments/${submissionId}`);
    const j = await r.json();
    if (j.ok) setList(j.data);
  }
  useEffect(() => {
    load();
  }, [submissionId]);

  async function submit() {
    if (body.trim().length < 3) return;
    const r = await fetch(`/api/comments/${submissionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, nickname: nickname || null }),
    });
    const j = await r.json();
    if (j.ok) {
      setBody("");
      load();
    }
  }

  return (
    <div className="mt-4 border-t pt-3">
      <div className="flex gap-2 mb-2">
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Apodo (opcional)"
          className="border rounded px-2 py-1 text-sm"
        />
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escribe un comentario..."
          className="flex-1 border rounded px-2 py-1 text-sm"
        />
        <button
          onClick={submit}
          className="px-3 py-1 rounded bg-emerald-600 text-white text-sm"
        >
          Comentar
        </button>
      </div>

      <ul className="space-y-2">
        {list.map((c) => (
          <li key={c.id} className="text-sm">
            <div className="opacity-70 text-[11px]">
              {new Date(c.created_at).toLocaleString()} · {c.nickname || "Anónimo"}
            </div>
            <div>{c.body}</div>
          </li>
        ))}
        {list.length === 0 && (
          <li className="text-xs opacity-60">Sé el primero en comentar</li>
        )}
      </ul>
    </div>
  );
}
