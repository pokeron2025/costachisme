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

export default function Page() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [bumpedId, setBumpedId] = useState<string | null>(null);
  const [votedIds, setVotedIds] = useState<string[]>([]);

  // Cargar votos guardados en localStorage
  useEffect(() => {
    const stored = localStorage.getItem("votedIds");
    if (stored) setVotedIds(JSON.parse(stored));
  }, []);

  // Traer submissions
  useEffect(() => {
    fetchSubmissions();
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
    }
  }

  return (
    <div className="space-y-8">
      {/* Título principal */}
      <section className="text-center mt-6">
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
  );
}
