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

// --- Funciones helpers ---
function getVoterId() {
  const key = "voter-id";
  let v = localStorage.getItem(key);
  if (!v) {
    v = crypto.randomUUID();
    localStorage.setItem(key, v);
  }
  return v;
}
function alreadyLiked(id: string) {
  return localStorage.getItem(`liked:${id}`) === "1";
}
function markLiked(id: string) {
  localStorage.setItem(`liked:${id}`, "1");
}

export default function HomePage() {
  const [feed, setFeed] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [voter, setVoter] = useState<string | null>(null);

  // Formulario
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // Cargar voterId
  useEffect(() => {
    try {
      setVoter(getVoterId());
    } catch {}
  }, []);

  // Cargar feed
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) setFeed(data as Submission[]);
      setLoading(false);
    };
    load();
  }, []);

  // Enviar rumor
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (title.length < 5 || content.length < 12) return;

    const { data, error } = await supabase.from("submissions").insert([
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
      // refrescar feed
      const { data: fresh } = await supabase
        .from("submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (fresh) setFeed(fresh as Submission[]);
    }
  }

  // Votar
  async function handleVote(id: string) {
    if (!voter) return;
    if (alreadyLiked(id)) return;
    if (sending === id) return;
    setSending(id);

    const res = await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, voter }),
    });

    const json = await res.json().catch(() => ({}));
    setSending(null);

    if (res.ok && json?.ok) {
      markLiked(id);
      setFeed((cur) =>
        cur.map((x) =>
          x.id === id ? { ...x, score: x.score + 1 } : x
        )
      );
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
        <h2 className="font-semibold text-lg">Lo más reciente (aprobado)</h2>
        {loading && <p>Cargando...</p>}
        {!loading &&
          feed.map((item) => (
            <div
              key={item.id}
              className="border rounded-lg p-4 space-y-2"
            >
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleVote(item.id)}
                  disabled={alreadyLiked(item.id) || sending === item.id}
                  className={`px-3 py-1 rounded border ${
                    alreadyLiked(item.id)
                      ? "opacity-60 cursor-not-allowed"
                      : "hover:bg-gray-50"
                  }`}
                >
                  {alreadyLiked(item.id) ? "¡Gracias! 👍" : "👍 Votar"}
                </button>
                <span>{item.score} votos</span>
              </div>
            </div>
          ))}
      </section>
    </main>
  );
}
