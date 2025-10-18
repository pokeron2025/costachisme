// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface Submission {
  id: string;
  title: string;
  content: string;
  score: number;
  created_at: string;
}

type TopItem = {
  id: string;
  title: string;
  score: number;
  created_at: string;
  category?: string;
  barrio?: string | null;
};

export default function Page() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [bumpedId, setBumpedId] = useState<string | null>(null);
  const [votedIds, setVotedIds] = useState<string[]>([]);
  const [top, setTop] = useState<TopItem[]>([]);

  // Votos guardados localmente
  useEffect(() => {
    const stored = localStorage.getItem("votedIds");
    if (stored) setVotedIds(JSON.parse(stored));
  }, []);

  // Cargar submissions
  useEffect(() => {
    fetchSubmissions();
    loadTop();
  }, []);

  async function fetchSubmissions() {
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setSubmissions(data as Submission[]);
    }
  }

  async function loadTop() {
    try {
      const r = await fetch("/api/top", { cache: "no-store" });
      const j = await r.json();
      if (j.ok) setTop(j.data as TopItem[]);
    } catch {}
  }

  // Manejar voto
  async function handleVote(id: string) {
    if (votedIds.includes(id)) return;

    const voter = "anon";
    const { error } = await supabase.rpc("increment_score", {
      p_submission_id: id,
      p_voter: voter,
    });

    if (!error) {
      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, score: s.score + 1 } : s))
      );
      const next = [...votedIds, id];
      setVotedIds(next);
      localStorage.setItem("votedIds", JSON.stringify(next));
      setBumpedId(id);
      setTimeout(() => setBumpedId(null), 500);
    }
  }

  // Crear rumor
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    const { error } = await supabase.from("submissions").insert([
      {
        title,
        content,
      },
    ]);

    setLoading(false);
    if (!error) {
      setTitle("");
      setContent("");
      fetchSubmissions();
      loadTop();
    }
  }

  return (
    <div className="grid md:grid-cols-3 gap-6 mt-6">
      {/* Columna principal */}
      <div className="md:col-span-2 space-y-8">
        {/* Título principal */}
        <section className="text-center">
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold 
                       text-transparent bg-clip-text 
                       bg-gradient-to-r from-teal-400 via-sky-500 to-indigo-500"
          >
            Costachisme
          </h1>
          <p className="mt-2 text-sm opacity-70">
            Comparte tu voz, tu rumor, tu risa — ¡todo cuenta!
          </p>
        </section>

        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          className="card p-6 space-y-4 animate-fade-in"
        >
          <input
            type="text"
            placeholder="Título (ej: El rumor del día)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2"
          />
          <textarea
            placeholder="Escribe aquí tu rumor o buzón ciudadano..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2"
            rows={3}
          />
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? "Enviando..." : "Enviar"}
          </button>
        </form>

        {/* Lista de rumores */}
        <section className="space-y-4">
          {submissions.map((row) => (
            <div
              key={row.id}
              className="card card-hover p-4 animate-fade-in"
            >
              <h2 className="font-semibold text-lg">{row.title}</h2>
              <p className="text-sm opacity-80 mt-1">{row.content}</p>
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={() => handleVote(row.id)}
                  disabled={votedIds.includes(row.id)}
                  className={`btn btn-primary ${
                    bumpedId === row.id ? "animate-bump" : ""
                  }`}
                >
                  👍 {votedIds.includes(row.id) ? "¡Gracias!" : "Me gusta"}
                </button>
                <span className="chip">+{row.score}</span>
              </div>
            </div>
          ))}
        </section>
      </div>

      {/* Columna lateral: Top del mes */}
      <aside className="space-y-4">
        <section className="card p-4 animate-fade-in">
          <h3 className="font-bold mb-2">🏆 Top del mes</h3>
          {top.length === 0 ? (
            <p className="text-sm opacity-70">
              Aún no hay suficientes votos este mes.
            </p>
          ) : (
            <ol className="space-y-2 list-decimal list-inside">
              {top.map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{t.title}</div>
                    <div className="text-[11px] opacity-70">
                      {t.category} {t.barrio ? `· ${t.barrio}` : ""}
                    </div>
                  </div>
                  <span className="chip">👍 {t.score}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </aside>
    </div>
  );
}
