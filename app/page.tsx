// app/page.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { supabaseBrowser } from '@/lib/supabase-browser';

/* ─────────────────────── Tipos ─────────────────────── */
type Category = 'RUMOR' | 'REPORTE';

type Submission = {
  id: string;
  created_at: string;
  category: Category;
  title: string;
  content: string;
  barrio: string | null;
  imagen_url?: string | null;
  report_count?: number;
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

/* ───────────────────── Constantes / util ───────────────────── */
const schema = z.object({
  category: z.enum(['RUMOR', 'REPORTE']),
  title: z.string().min(5).max(80),
  content: z.string().min(12).max(400),
  barrio: z.string().max(60).optional().or(z.literal('')),
  imagen_url: z.string().url().optional().or(z.literal('')),
});

const REACTIONS: Array<{ key: keyof ReactionTotals; code: string; label: string; tag: string }> = [
  { key: 'like_count', code: '👍', label: 'Me gusta', tag: 'like' },
  { key: 'dislike_count', code: '👎', label: 'No me gusta', tag: 'dislike' },
  { key: 'haha_count', code: '😂', label: 'Jaja', tag: 'haha' },
  { key: 'wow_count', code: '😮', label: 'Wow', tag: 'wow' },
  { key: 'angry_count', code: '😡', label: 'Enojo', tag: 'angry' },
  { key: 'sad_count', code: '😢', label: 'Triste', tag: 'sad' },
];

// Filtros con figuritas
const FILTERS: Array<{ id: string; label: string; icon: string }> = [
  { id: 'recent', label: 'Recientes', icon: '🆕' },
  { id: 'popular', label: 'Populares', icon: '🔥' },
  { id: 'commented', label: 'Comentados', icon: '💬' },
  { id: 'viewed', label: 'Vistos', icon: '👀' },
];

// Modo admin (contador de reportes se muestra con ?admin=1)
const useIsAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setIsAdmin(params.get('admin') === '1');
    }
  }, []);
  return isAdmin;
};

/* Identidad “voter” local robusta */
function getVoter() {
  const KEY = '__voter_id__';
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      let v = localStorage.getItem(KEY);
      if (!v) {
        v = `anon_${Math.random().toString(36).slice(2)}`;
        localStorage.setItem(KEY, v);
      }
      return v;
    }
  } catch {}
  try {
    if (typeof document !== 'undefined') {
      const m = document.cookie.match(/(?:^|;\s*)__voter_id__=([^;]+)/);
      if (m?.[1]) return decodeURIComponent(m[1]);
      const v = `anon_${Math.random().toString(36).slice(2)}`;
      document.cookie = `__voter_id__=${encodeURIComponent(v)}; path=/; samesite=lax`;
      return v;
    }
  } catch {}
  // fallback memoria
  // @ts-ignore
  if (typeof window !== 'undefined') {
    // @ts-ignore
    if (!window.__tmp_voter_id__) {
      // @ts-ignore
      window.__tmp_voter_id__ = `anon_${Math.random().toString(36).slice(2)}`;
    }
    // @ts-ignore
    return window.__tmp_voter_id__;
  }
  return 'anon';
}

/* almacenamiento local para reacciones/reportes */
function getLocalReacted(submissionId: string) {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('__reacted__') || '{}';
  const map = JSON.parse(raw) as Record<string, string>;
  return map[submissionId] ?? null;
}
function setLocalReacted(submissionId: string, reaction: string) {
  if (typeof window === 'undefined') return;
  const raw = localStorage.getItem('__reacted__') || '{}';
  const map = JSON.parse(raw) as Record<string, string>;
  map[submissionId] = reaction;
  localStorage.setItem('__reacted__', JSON.stringify(map));
}
function getReported(submissionId: string) {
  if (typeof window === 'undefined') return false;
  const raw = localStorage.getItem('__reported__') || '{}';
  const map = JSON.parse(raw) as Record<string, boolean>;
  return !!map[submissionId];
}
function setReported(submissionId: string) {
  if (typeof window === 'undefined') return;
  const raw = localStorage.getItem('__reported__') || '{}';
  const map = JSON.parse(raw) as Record<string, boolean>;
  map[submissionId] = true;
  localStorage.setItem('__reported__', JSON.stringify(map));
}

/* ─────────────────────── Página ─────────────────────── */
export default function Home() {
  const [tab, setTab] = useState<Category>('RUMOR');
  const [filter, setFilter] = useState<string>('recent');

  const [loading, setLoading] = useState(false);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const [form, setForm] = useState({ title: '', content: '', barrio: '', imagen_url: '' });

  // reporte
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportText, setReportText] = useState('');
  const [reportSending, setReportSending] = useState(false);

  const isAdmin = useIsAdmin();

  // refresco general con debounce
  const refreshTimer = useRef<NodeJS.Timeout | null>(null);
  const scheduleRefresh = () => {
    if (refreshTimer.current) return;
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      load();
    }, 250);
  };

  // refrescar solo una (totales reacciones)
  async function refreshOne(submissionId: string) {
    try {
      const r = await fetch(`/api/reaction-totals/${submissionId}`, { cache: 'no-store' });
      const j = await r.json();
      if (!j.ok || !j.totals) return;
      setFeed((curr) =>
        curr.map((it) => (it.id === submissionId ? { ...it, totals: j.totals as ReactionTotals } : it))
      );
    } catch {}
  }

  // realtime: reacciones y comentarios
  useEffect(() => {
    const channel = supabaseBrowser
      .channel('public:reactions-comments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, (payload) => {
        const sid = (payload.new as any)?.submission_id ?? (payload.old as any)?.submission_id;
        if (sid) refreshOne(sid);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (payload) => {
        const sid = (payload.new as any)?.submission_id ?? (payload.old as any)?.submission_id;
        if (sid) fetchComments(sid);
      })
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, []);

  // cargar feed
  async function load() {
    try {
      setLoading(true);
      const r = await fetch(`/api/list?filter=${encodeURIComponent(filter)}`, { cache: 'no-store' });
      const j = await r.json();
      if (j.ok) {
        const norm: FeedItem[] = (j.data as Submission[]).map((s) => ({
          ...s,
          totals: {
            like_count: (s as any).like_count ?? 0,
            dislike_count: (s as any).dislike_count ?? 0,
            haha_count: (s as any).haha_count ?? 0,
            wow_count: (s as any).wow_count ?? 0,
            angry_count: (s as any).angry_count ?? 0,
            sad_count: (s as any).sad_count ?? 0,
          },
          comments: [],
          report_count: (s as any).report_count ?? 0,
        }));
        setFeed(norm);
        norm.forEach((it) => fetchComments(it.id));
      } else {
        setMsg(j.error || 'No se pudo cargar el feed.');
      }
    } catch (e: any) {
      setMsg(e?.message || 'Error de red al cargar el feed.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // enviar rumor/reporte
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const payload = {
        category: tab,
        title: form.title,
        content: form.content,
        barrio: form.barrio,
        imagen_url: form.imagen_url,
      };
      const parsed = schema.safeParse(payload);
      if (!parsed.success) {
        setMsg(parsed.error.errors[0].message);
        setLoading(false);
        return;
      }
      const r = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const j = await r.json();
      if (!j.ok) {
        setMsg(j.error ?? 'Ocurrió un error. Revisa los campos.');
      } else {
        setMsg('¡Enviado! Quedará visible cuando sea aprobado.');
        setForm({ title: '', content: '', barrio: '', imagen_url: '' });
        load();
      }
    } catch (err: any) {
      setMsg(err?.message ?? 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  // reaccionar (optimista + animaciones)
  async function react(submissionId: string, tag: string) {
    const voter = getVoter();
    const already = getLocalReacted(submissionId);
    if (already === tag) return;

    try {
      // Optimista para que el contador “pop” y el burst salgan de inmediato
      setFeed((curr) =>
        curr.map((it) =>
          it.id === submissionId
            ? {
                ...it,
                totals: {
                  ...it.totals,
                  ...(tag === 'like' ? { like_count: it.totals.like_count + 1 } : {}),
                  ...(tag === 'dislike' ? { dislike_count: it.totals.dislike_count + 1 } : {}),
                  ...(tag === 'haha' ? { haha_count: it.totals.haha_count + 1 } : {}),
                  ...(tag === 'wow' ? { wow_count: it.totals.wow_count + 1 } : {}),
                  ...(tag === 'angry' ? { angry_count: it.totals.angry_count + 1 } : {}),
                  ...(tag === 'sad' ? { sad_count: it.totals.sad_count + 1 } : {}),
                },
              }
            : it
        )
      );

      const res = await fetch('/api/react', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: submissionId, reaction: tag, voter }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        alert('❌ Error al reaccionar: ' + (j?.error || 'Desconocido'));
        scheduleRefresh();
        return;
      }
      if (j.totals) {
        setFeed((curr) =>
          curr.map((it) => (it.id === submissionId ? { ...it, totals: j.totals as ReactionTotals } : it))
        );
      }
      setLocalReacted(submissionId, tag);
    } catch (err: any) {
      alert('⚠️ Fallo de red al reaccionar: ' + (err?.message || 'sin detalle'));
      scheduleRefresh();
    }
  }

  // comentarios
  async function fetchComments(submissionId: string) {
    try {
      const r = await fetch(`/api/comments/${submissionId}`);
      const j = await r.json();
      if (j.ok) {
        setFeed((curr) => curr.map((it) => (it.id === submissionId ? { ...it, comments: j.data } : it)));
      }
    } catch {}
  }
  async function submitComment(submissionId: string, body: string, nickname?: string) {
    const r = await fetch(`/api/comments/${submissionId}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body, nickname }),
    });
    const j = await r.json();
    if (j.ok) {
      fetchComments(submissionId);
      return true;
    } else {
      alert('❌ Error al comentar: ' + (j.error || 'Desconocido'));
      return false;
    }
  }

  // reportar
  function openReport(id: string) {
    if (getReported(id)) return;
    setReportingId(id);
    setReportText('');
  }
  async function sendReport() {
    if (!reportingId) return;
    const voter = getVoter();
    if (!reportText.trim()) return;

    setReportSending(true);
    try {
      const r = await fetch('/api/report', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-voter': voter },
        body: JSON.stringify({ submissionId: reportingId, reason: reportText.trim(), voter }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        if (r.status === 409) alert('Ya reportaste esta publicación.');
        else if (r.status === 429) alert('Límite de reportes por hora. Intenta más tarde.');
        else alert('No se pudo reportar: ' + (j?.error || 'desconocido'));
      } else {
        setReported(reportingId);
        if (typeof j.report_count === 'number') {
          setFeed((curr) =>
            curr.map((it) => (it.id === reportingId ? { ...it, report_count: j.report_count } : it))
          );
        }
        setReportingId(null);
      }
    } catch (e: any) {
      alert('Fallo de red: ' + (e?.message ?? ''));
    } finally {
      setReportSending(false);
    }
  }

  const voterId = useMemo(() => getVoter(), []);

  return (
    <main className="mx-auto max-w-5xl p-4">
      {/* Tabs Enviar */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('RUMOR')}
          className={`px-4 py-2 rounded-full border ${tab === 'RUMOR' ? 'bg-emerald-600 text-white' : 'bg-white'}`}
        >
          Rumor 🧐
        </button>
        <button
          onClick={() => setTab('REPORTE')}
          className={`px-4 py-2 rounded-full border ${tab === 'REPORTE' ? 'bg-emerald-600 text-white' : 'bg-white'}`}
        >
          Buzón 📨
        </button>
      </div>

      {/* Barra de filtros con figuritas */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1 rounded-full border text-sm flex items-center gap-2 ${
              filter === f.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white'
            }`}
            title={f.label}
          >
            <span>{f.icon}</span>
            <span>{f.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* FORM */}
        <section className="rounded-2xl border p-4">
          <h2 className="text-lg font-semibold mb-4">Enviar {tab === 'RUMOR' ? 'Rumor' : 'Reporte'}</h2>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Título</label>
              <input
                className="w-full rounded-lg border px-3 py-2"
                placeholder="Ej. Se dice que..."
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
                  placeholder="Centro..."
                  value={form.barrio}
                  onChange={(e) => setForm((f) => ({ ...f, barrio: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">URL de imagen (opcional)</label>
                <input
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="https://..."
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
              {loading ? 'Enviando...' : 'Enviar'}
            </button>
          </form>
        </section>

        {/* FEED */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Lo más reciente (aprobado)</h2>

          {feed.length === 0 && <div className="text-sm text-gray-500">Aún no hay publicaciones aprobadas.</div>}

          {feed.map((it) => {
            const reacted = getLocalReacted(it.id);
            const reported = getReported(it.id);

            return (
              <article key={it.id} className="rounded-2xl border p-4 flex flex-col gap-3 bg-white relative">
                {/* Reportar (arriba derecha) */}
                <button
                  className={`absolute right-3 top-3 px-3 py-1 rounded-full text-sm flex items-center gap-2 shadow-sm ${
                    reported ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-red-50 text-red-600 hover:bg-red-100'
                  }`}
                  onClick={() => !reported && openReport(it.id)}
                  disabled={reported}
                  title={reported ? 'Ya reportaste desde este dispositivo' : 'Reportar'}
                >
                  🚩 Reportar
                </button>

                <div className="text-xs text-gray-500">{new Date(it.created_at).toLocaleString()}</div>
                <div>
                  <div className="text-[10px] tracking-wide text-gray-500 mb-1">{it.category}</div>
                  <h3 className="font-semibold">{it.title}</h3>
                  <p className="text-sm mt-1">{it.content}</p>
                  {it.barrio ? <div className="text-xs mt-1">📍 {it.barrio}</div> : null}
                  {isAdmin && typeof it.report_count === 'number' && it.report_count > 0 ? (
                    <div className="text-xs mt-1 text-red-600">(Reportes: {it.report_count})</div>
                  ) : null}
                </div>

                {/* Reacciones con animación (burst) */}
                <div className="flex flex-wrap items-center gap-2">
                  {REACTIONS.map((r) => (
                    <ReactionButton
                      key={r.key}
                      emoji={r.code}
                      title={r.label}
                      count={(it.totals as any)[r.key] as number}
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

      {/* Modal de Reporte */}
      {reportingId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-xl p-4">
            <h3 className="font-semibold text-lg mb-2">¿Por qué la reportas?</h3>
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              className="w-full border rounded-lg p-2 h-28"
              placeholder="Explica brevemente el motivo…"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                className="px-3 py-2 rounded-lg border"
                onClick={() => !reportSending && setReportingId(null)}
                disabled={reportSending}
              >
                Cancelar
              </button>
              <button
                className="px-3 py-2 rounded-lg bg-red-600 text-white disabled:opacity-50"
                onClick={sendReport}
                disabled={reportSending || reportText.trim().length < 3}
              >
                {reportSending ? 'Enviando…' : 'Enviar reporte'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 mt-10">
        Costachisme © {new Date().getFullYear()} · Hecho con ❤ en Salina Cruz
      </div>
    </main>
  );
}

/* ──────────────────── Botón de reacción con burst ──────────────────── */
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
  // cada click incrementa para forzar un nuevo "burst"
  const [burstId, setBurstId] = React.useState(0);

  const handleClick = () => {
    setBurstId((n) => n + 1);
    onClick();
  };

  return (
    <motion.button
      onClick={handleClick}
      title={title}
      className={[
        'relative', // para posicionar el burst
        'px-3 py-1 rounded-full border text-sm flex items-center gap-1',
        active ? 'bg-emerald-50 border-emerald-300' : 'bg-white hover:bg-gray-50',
      ].join(' ')}
      whileTap={{ scale: 0.92 }}
      animate={{ scale: active ? 1.06 : 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      layout
    >
      {/* emoji base con pequeño wobble si queda activo */}
      <motion.span
        key={active ? 'on' : 'off'}
        initial={{ rotate: 0 }}
        animate={{ rotate: active ? [0, -15, 0, 15, 0] : 0 }}
        transition={{ duration: 0.35 }}
      >
        {emoji}
      </motion.span>

      {/* contador con pop cuando cambia */}
      <AnimatePresence mode="popLayout">
        <motion.span
          key={count}
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 8, opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {count}
        </motion.span>
      </AnimatePresence>

      {/* ✨ BURST: el mismo emoji “sube y se desvanece” en cada click */}
      <AnimatePresence>
        <motion.span
          key={`burst-${burstId}`}
          className="absolute left-1/2 -translate-x-1/2"
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: -22, opacity: 1 }}
          exit={{ y: -36, opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          style={{ pointerEvents: 'none' }}
        >
          {emoji}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

/* ──────────────────── Bloque de comentarios ──────────────────── */
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
  const [body, setBody] = useState('');
  const [nick, setNick] = useState('');

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (body.trim().length < 3) return;
    setSending(true);
    const ok = await onAdd(body.trim(), nick.trim() || undefined);
    setSending(false);
    if (ok) {
      setBody('');
      setNick('');
    }
  }

  return (
    <div className="border-t pt-3 mt-2">
      <button onClick={() => setOpen((v) => !v)} className="text-sm text-emerald-700 hover:underline">
        {open ? 'Ocultar comentarios' : `Comentarios (${comments.length})`}
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
              {sending ? 'Enviando…' : 'Comentar'}
            </button>
          </form>

          <ul className="space-y-2">
            {comments.map((c) => (
              <li key={c.id} className="text-sm rounded-lg bg-gray-50 p-2">
                <div className="text-xs text-gray-500 mb-1">
                  {c.nickname ? c.nickname : 'Anónimo'} · {new Date(c.created_at).toLocaleString()}
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
