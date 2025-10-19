// app/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { supabaseBrowser } from "@/lib/supabase-browser";

/* =======================
   Tipos
======================= */
type Category = "RUMOR" | "REPORTE";

type Submission = {
  id: string;
  created_at: string;
  category: Category;
  title: string;
  content: string;
  barrio: string | null;
  imagen_url?: string | null;
};

type ReactionTotals = {
  like_count: number;
  dislike_count: number;
  haha_count: number;
  wow_count: number;
  angry_count: number;
  sad_count: number;
};

type Comment = { id: string; body: string; nickname: string | null; created_at: string };

type FeedItem = Submission & {
  totals: ReactionTotals;
  comments?: Comment[];
};

/* =======================
   Constantes / util
======================= */
const REACTIONS: Array<{ key: keyof ReactionTotals; code: string; label: string; tag: string }> = [
  { key: "like_count", code: "👍", label: "Me gusta", tag: "like" },
  { key: "dislike_count", code: "👎", label: "No me gusta", tag: "dislike" },
  { key: "haha_count", code: "😂", label: "Jaja", tag: "haha" },
  { key: "wow_count", code: "😮", label: "Wow", tag: "wow" },
  { key: "angry_count", code: "😡", label: "Enojo", tag: "angry" },
  { key: "sad_count", code: "😢", label: "Triste", tag: "sad" },
];

function getVoter() {
  const k = "__voter_id__";
  if (typeof window === "undefined") return "anon";
  let v = localStorage.getItem(k);
  if (!v) {
    v = `anon_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(k, v);
  }
  return v;
}

// marca local por publicación para evitar doble click en la misma reacción en la misma sesión
const REACTED_KEY = "__reacted__";
function getLocalReacted(id: string) {
  if (typeof window === "undefined") return null;
  const map = JSON.parse(localStorage.getItem(REACTED_KEY) || "{}") as Record<string, string>;
  return map[id] ?? null;
}
function setLocalReacted(id: string, tag: string) {
  if (typeof window === "undefined") return;
  const map = JSON.parse(localStorage.getItem(REACTED_KEY) || "{}") as Record<string, string>;
  map[id] = tag;
  localStorage.setItem(REACTED_KEY, JSON.stringify(map));
}

// marca local para “ya reportó”
const REPORTED_KEY = "__reported__";
function getReported(id: string) {
  if (typeof window === "undefined") return false;
  const set = new Set<string>(JSON.parse(localStorage.getItem(REPORTED_KEY) || "[]"));
  return set.has(id);
}
function setReported(id: string) {
  if (typeof window === "undefined") return;
  const list: string[] = JSON.parse(localStorage.getItem(REPORTED_KEY) || "[]");
  if (!list.includes(id)) {
    list.push(id);
    localStorage.setItem(REPORTED_KEY, JSON.stringify(list));
  }
}

/* =======================
   Validación formulario envío
======================= */
const schema = z.object({
  category: z.enum(["RUMOR", "REPORTE"]),
  title: z.string().min(5).max(80),
  content: z.string().min(12).max(400),
  barrio: z.string().max(60).optional().or(z.literal("")),
  imagen_url: z.string().url().optional().or(z.literal("")),
});

/* =======================
   Botón de reacción (con animación “sube y se desvanece”)
======================= */
function ReactionButton({
  emoji,
  count,
  active,
  title,
  onClick,
}: {
  emoji: string;
  count: number;
  active: boolean;
  title: string;
  onClick: () => void;
}) {
  const [burst, setBurst] = useState(0); // para disparar la animación ascendente

  const handle = () => {
    setBurst((b) => b + 1);
    onClick();
  };

  return (
    <button
      type="button"
      onClick={handle}
      title={title}
      className={`relative px-3 py-1 rounded-full border text-sm flex items-center gap-1 transition
        ${active ? "bg-emerald-50 border-emerald-300" : "bg-white hover:bg-gray-50"}`}
    >
      {/* emoji base + micro rebote */}
      <motion.span
        layout="position"
        whileTap={{ scale: 0.8 }}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
      >
        {emoji}
      </motion.span>
      <span>{count}</span>

      {/* clon que sube y se desvanece */}
      <AnimatePresence>
        <motion.span
          key={burst}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: -22, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <span className="text-lg">{emoji}</span>
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

/* =======================
   Página
======================= */
export default function Home() {
  // estado UI
  const [tab, setTab] = useState<Category>("RUMOR");
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // filtros
  const [sort, setSort] = useState<"recent" | "popular" | "commented" | "viewed">("recent");
  const [q, setQ] = useState("");

  // formulario
  const [form, setForm] = useState({ title: "", content: "", barrio: "", imagen_url: "" });

  // throttling de refresco (para realtime)
  const timer = useRef<NodeJS.Timeout | null>(null);
  const scheduleRefresh = (fn: () => void) => {
    if (timer.current) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      fn();
    }, 200);
  };

  // carga de lista
  async function load() {
    const url = `/api/list?sort=${sort}&q=${encodeURIComponent(q)}`;
    try {
      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "No se pudo cargar el feed");
      const normalized: FeedItem[] = (j.data as any[]).map((s) => ({
        id: s.id,
        created_at: s.created_at,
        category: s.category,
        title: s.title,
        content: s.content,
        barrio: s.barrio ?? null,
        imagen_url: s.imagen_url ?? null,
        totals: {
          like_count: s.like_count ?? 0,
          dislike_count: s.dislike_count ?? 0,
          haha_count: s.haha_count ?? 0,
          wow_count: s.wow_count ?? 0,
          angry_count: s.angry_count ?? 0,
          sad_count: s.sad_count ?? 0,
        },
        comments: [],
      }));
      setFeed(normalized);
      // precarga comentarios de los visibles
      normalized.slice(0, 10).forEach((it) => fetchComments(it.id));
    } catch (e: any) {
      setMsg(e?.message || "Error al cargar publicaciones");
    }
  }

  // efectos de carga
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, q]);

  // Realtime: escuchar reacciones y comentarios y actualizar sólo la tarjeta afectada
  useEffect(() => {
    const ch = supabaseBrowser
      .channel("public:reactions-comments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reactions" },
        (payload) => {
          const sid = (payload.new as any)?.submission_id ?? (payload.old as any)?.submission_id;
          if (!sid) return;
          scheduleRefresh(() => refreshOneTotals(sid));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments" },
        (payload) => {
          const sid = (payload.new as any)?.submission_id ?? (payload.old as any)?.submission_id;
          if (!sid) return;
          scheduleRefresh(() => fetchComments(sid));
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(ch);
    };
  }, []);

  async function refreshOneTotals(submissionId: string) {
    try {
      const r = await fetch(`/api/reaction-totals/${submissionId}`, { cache: "no-store" });
      const j = await r.json();
      if (j.ok && j.totals) {
        setFeed((curr) =>
          curr.map((it) => (it.id === submissionId ? { ...it, totals: j.totals } : it))
        );
      }
    } catch {
      /* silent */
    }
  }

  // enviar publicación
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const parsed = schema.safeParse({
        category: tab,
        title: form.title,
        content: form.content,
        barrio: form.barrio,
        imagen_url: form.imagen_url,
      });
      if (!parsed.success) throw new Error(parsed.error.errors[0].message);

      const r = await fetch("/api/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "No se pudo enviar");
      setMsg("¡Enviado! Quedará visible al ser aprobado.");
      setForm({ title: "", content: "", barrio: "", imagen_url: "" });
    } catch (err: any) {
      setMsg(err?.message || "Error al enviar");
    } finally {
      setLoading(false);
    }
  }

  // reaccionar
  async function react(submissionId: string, tag: string) {
    const voter = getVoter();
    const already = getLocalReacted(submissionId);
    if (already === tag) return;

    try {
      const r = await fetch("/api/react", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: submissionId, reaction: tag, voter }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "No se pudo reaccionar");

      // actualiza contadores desde backend
      if (j.totals) {
        setFeed((curr) =>
          curr.map((it) => (it.id === submissionId ? { ...it, totals: j.totals } : it))
        );
      }
      setLocalReacted(submissionId, tag);
    } catch (err: any) {
      alert("❌ Error al reaccionar: " + (err?.message || "desconocido"));
    }
  }

  // reportar
  async function report(submissionId: string) {
    if (getReported(submissionId)) return; // ya reportado en este dispositivo

    const reason = prompt("¿Por qué la reportas?");
    if (!reason || reason.trim().length < 3) return;

    const voter = getVoter(); // asegura voter
    try {
      const r = await fetch("/api/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: submissionId, reason, voter }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "No se pudo reportar");

      setReported(submissionId);
      alert("✅ ¡Gracias! Tu reporte fue recibido.");
    } catch (err: any) {
      alert("❌ No se pudo reportar: " + (err?.message || "desconocido"));
    }
  }

  // comentarios
  async function fetchComments(submissionId: string) {
    try {
      const r = await fetch(`/api/comments/${submissionId}`, { cache: "no-store" });
      const j = await r.json();
      if (j.ok) {
        setFeed((curr) =>
          curr.map((it) => (it.id === submissionId ? { ...it, comments: j.data } : it))
        );
      }
    } catch {
      /* silent */
    }
  }

  async function submitComment(submissionId: string, body: string, nickname?: string) {
    const r = await fetch(`/api/comments/${submissionId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body, nickname }),
    });
    const j = await r.json();
    if (j.ok) {
      fetchComments(submissionId);
      return true;
    } else {
      alert("❌ Error al comentar: " + (j.error || "desconocido"));
      return false;
    }
  }

  const voterId = useMemo(() => getVoter(), []);
  const debQ = useRef<NodeJS.Timeout | null>(null);
  const onSearch = (v: string) => {
    if (debQ.current) clearTimeout(debQ.current);
    debQ.current = setTimeout(() => setQ(v), 250);
  };

  return (
    <main className="mx-auto max-w-5xl p-4">
      {/* Tabs categoría */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setTab("RUMOR")}
          className={`px-4 py-2 rounded-full border ${
            tab === "RUMOR" ? "bg-emerald-600 text-white" : "bg-white"
          }`}
        >
          Rumor 🧐
        </button>
        <button
          onClick={() => setTab("REPORTE")}
          className={`px-4 py-2 rounded-full border ${
            tab === "REPORTE" ? "bg-emerald-600 text-white" : "bg-white"
          }`}
        >
          Buzón 📨
        </button>
      </div>

      {/* Filtros & Buscador */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setSort("recent")}
          className={`px-3 py-1 rounded-full border text-sm ${
            sort === "recent" ? "bg-emerald-100 border-emerald-300" : "bg-white"
          }`}
        >
          🆕 Recientes
        </button>
        <button
          onClick={() => setSort("popular")}
          className={`px-3 py-1 rounded-full border text-sm ${
            sort === "popular" ? "bg-emerald-100 border-emerald-300" : "bg-white"
          }`}
        >
          🔥 Populares
        </button>
        <button
          onClick={() => setSort("commented")}
          className={`px-3 py-1 rounded-full border text-sm ${
            sort === "commented" ? "bg-emerald-100 border-emerald-300" : "bg-white"
          }`}
        >
          💬 Comentados
        </button>
        <button
          onClick={() => setSort("viewed")}
          className={`px-3 py-1 rounded-full border text-sm ${
            sort === "viewed" ? "bg-emerald-100 border-emerald-300" : "bg-white"
          }`}
        >
          👀 Vistos
        </button>

        <div className="ml-auto">
          <input
            className="w-64 rounded-full border px-4 py-2 text-sm"
            placeholder="Filtrar por texto o barrio…"
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* FORM */}
        <section className="rounded-2xl border p-4">
          <h2 className="text-lg font-semibold mb-4">Enviar {tab === "RUMOR" ? "Rumor" : "Reporte"}</h2>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Título</label>
              <input
                className="w-full rounded-lg border px-3 py-2"
                placeholder="Ej. Se dice que…"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
              <p className="text-xs text-gray-500 mt-1">Mínimo 5 y máximo 80 caracteres.</p>
            </div>

            <div>
              <label className="block text-sm mb-1">Texto</label>
              <textarea
                className="w-full rounded-lg border px-3 py-2 h-32"
                placeholder="Sin nombres ni datos personales. Enfócate en situaciones."
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              />
              <p className="text-xs text-gray-500 mt-1">Mínimo 12 y máximo 400 caracteres.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Barrio/Colonia (opcional)</label>
                <input
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="Centro…"
                  value={form.barrio}
                  onChange={(e) => setForm((f) => ({ ...f, barrio: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">URL de imagen (opcional)</label>
                <input
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="https://…"
                  value={form.imagen_url}
                  onChange={(e) => setForm((f) => ({ ...f, imagen_url: e.target.value }))}
                />
              </div>
            </div>

            {msg && <div className="text-sm text-emerald-700">{msg}</div>}

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-50"
            >
              {loading ? "Enviando…" : "Enviar"}
            </button>
          </form>
        </section>

        {/* FEED */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Lo más reciente (aprobado)</h2>

          {feed.length === 0 && (
            <div className="text-sm text-gray-500">Aún no hay publicaciones coincidentes.</div>
          )}

          {feed.map((it) => {
            const reacted = getLocalReacted(it.id);
            const disabledReport = getReported(it.id);
            const totals = it.totals;

            return (
              <article key={it.id} className="relative rounded-2xl border p-4 flex flex-col gap-3 bg-white">
                {/* Botón reportar arriba-derecha */}
                <button
                  onClick={() => report(it.id)}
                  disabled={disabledReport}
                  className={`absolute right-3 top-3 px-3 py-1 rounded-full border text-sm
                    ${disabledReport ? "opacity-50 cursor-not-allowed" : "hover:bg-rose-50"}
                    `}
                  title={disabledReport ? "Ya reportaste esta publicación" : "Reportar"}
                >
                  🚩 Reportar
                </button>

                <div className="text-xs text-gray-500">{new Date(it.created_at).toLocaleString()}</div>
                <div>
                  <div className="text-[10px] tracking-wide text-gray-500 mb-1">{it.category}</div>
                  <h3 className="font-semibold">{it.title}</h3>
                  <p className="text-sm mt-1">{it.content}</p>
                  {it.barrio ? <div className="text-xs mt-1">📍 {it.barrio}</div> : null}
                </div>

                {/* Reacciones */}
                <div className="flex flex-wrap items-center gap-2">
                  {REACTIONS.map((r) => (
                    <ReactionButton
                      key={r.key}
                      emoji={r.code}
                      title={r.label}
                      count={(totals as any)[r.key] as number}
                      active={reacted === r.tag}
                      onClick={() => react(it.id, r.tag)}
                    />
                  ))}
                </div>

                {/* Comentarios */}
                <CommentsBlock
                  submissionId={it.id}
                  comments={it.comments ?? []}
                  onAdd={(body, nickname) => submitComment(it.id, body, nickname)}
                />
              </article>
            );
          })}
        </section>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 mt-10">
        Costachisme © {new Date().getFullYear()} · Hecho con ❤ en Salina Cruz
      </div>
    </main>
  );
}

/* =======================
   Bloque de comentarios
======================= */
function CommentsBlock({
  submissionId,
  comments,
  onAdd,
}: {
  submissionId: string;
  comments: Comment[];
  onAdd: (body: string, nickname?: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [body, setBody] = useState("");
  const [nick, setNick] = useState("");

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (body.trim().length < 3) return;
    setSending(true);
    const ok = await onAdd(body.trim(), nick.trim() || undefined);
    setSending(false);
    if (ok) {
      setBody("");
      setNick("");
    }
  }

  return (
    <div className="border-t pt-3 mt-2">
      <button onClick={() => setOpen((v) => !v)} className="text-sm text-emerald-700 hover:underline">
        {open ? "Ocultar comentarios" : `Comentarios (${comments.length})`}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <form onSubmit={handleSend} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
            <input
              className="rounded-lg border px-3 py-2"
              placeholder="Escribe un comentario (anónimo)…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <input
              className="rounded-lg border px-3 py-2"
              placeholder="Apodo (opcional)"
              value={nick}
              onChange={(e) => setNick(e.target.value)}
            />
            <button
              type="submit"
              disabled={sending || body.trim().length < 3}
              className="md:col-span-2 px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-50"
            >
              {sending ? "Enviando…" : "Comentar"}
            </button>
          </form>

          <ul className="space-y-2">
            {comments.map((c) => (
              <li key={c.id} className="text-sm rounded-lg bg-gray-50 p-2">
                <div className="text-xs text-gray-500 mb-1">
                  {c.nickname ? c.nickname : "Anónimo"} · {new Date(c.created_at).toLocaleString()}
                </div>
                <div>{c.body}</div>
              </li>
            ))}
            {comments.length === 0 && <li className="text-xs text-gray-500">Sé el primero en comentar.</li>}
          </ul>
        </div>
      )}
    </div>
  );
              }
