'use client';

import React from 'react';
import { z } from 'zod';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { motion, AnimatePresence } from 'framer-motion';

/* ========================= Tipos ========================= */

type Submission = {
  id: string;
  created_at: string;
  category: 'RUMOR' | 'REPORTE';
  title: string;
  content: string;
  barrio: string | null;
  imagen_url?: string | null;
  score?: number;
};

type ReactionTotals = {
  like_count: number;
  dislike_count: number;
  haha_count: number;
  wow_count: number;
  angry_count: number;
  sad_count: number;
};

type Comment = {
  id: string;
  body: string;
  nickname: string | null;
  created_at: string;
  submission_id?: string;
};

type FeedItem = Submission & {
  totals: ReactionTotals;
  comments?: Comment[];
};

/* ==================== Validación del formulario ==================== */

const schema = z.object({
  category: z.enum(['RUMOR', 'REPORTE']),
  title: z
    .string()
    .min(5, { message: 'El título debe tener al menos 5 caracteres.' })
    .max(80, { message: 'El título no puede superar 80 caracteres.' }),
  content: z
    .string()
    .min(12, { message: 'El texto debe tener al menos 12 caracteres.' })
    .max(400, { message: 'El texto no puede superar 400 caracteres.' }),
  barrio: z.string().max(60).optional().or(z.literal('')),
  imagen_url: z.string().url().optional().or(z.literal('')),
});

/* ========================= Constantes UI ========================= */

const REACTIONS: Array<{
  key: keyof ReactionTotals;
  code: string;
  label: string;
  tag: 'like' | 'dislike' | 'haha' | 'wow' | 'angry' | 'sad';
}> = [
  { key: 'like_count', code: '👍', label: 'Me gusta', tag: 'like' },
  { key: 'dislike_count', code: '👎', label: 'No me gusta', tag: 'dislike' },
  { key: 'haha_count', code: '😂', label: 'Jaja', tag: 'haha' },
  { key: 'wow_count', code: '😮', label: 'Wow', tag: 'wow' },
  { key: 'angry_count', code: '😡', label: 'Enojo', tag: 'angry' },
  { key: 'sad_count', code: '😢', label: 'Triste', tag: 'sad' },
];

/* ========================= Helpers cliente ========================= */

function getVoter() {
  const k = '__voter_id__';
  if (typeof window === 'undefined') return 'anon';
  let v = localStorage.getItem(k);
  if (!v) {
    v = `anon_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(k, v);
  }
  return v;
}

function getLocalReacted(submissionId: string) {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('__reacted__') || '{}';
  try {
    const map = JSON.parse(raw) as Record<string, string>;
    return map[submissionId] ?? null;
  } catch {
    return null;
  }
}

function setLocalReacted(submissionId: string, reaction: string) {
  if (typeof window === 'undefined') return;
  const raw = localStorage.getItem('__reacted__') || '{}';
  const map = (() => {
    try {
      return JSON.parse(raw) as Record<string, string>;
    } catch {
      return {} as Record<string, string>;
    }
  })();
  map[submissionId] = reaction;
  localStorage.setItem('__reacted__', JSON.stringify(map));
}

/* ========================= Mini componentes (UI + Animaciones) ========================= */

function ReactionButton({
  active,
  emoji,
  count,
  label,
  onClick,
}: {
  active: boolean;
  emoji: string;
  count: number;
  label: string;
  onClick: () => void;
}) {
  const [burst, setBurst] = React.useState(false);

  function handleClick() {
    onClick();
    setBurst(true);
    setTimeout(() => setBurst(false), 500);
  }

  return (
    <div className="relative inline-flex">
      <motion.button
        whileTap={{ scale: 0.9 }}
        animate={active ? { scale: [1, 1.1, 1] } : { scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        onClick={handleClick}
        className={`px-3 py-1 rounded-full border text-sm flex items-center gap-1 ${
          active ? 'bg-emerald-50 border-emerald-300' : 'bg-white hover:bg-gray-50'
        }`}
        title={label}
      >
        <span>{emoji}</span>
        <span>{count}</span>
      </motion.button>

      <AnimatePresence>
        {burst && (
          <motion.div
            initial={{ opacity: 0, y: 0, scale: 0.8 }}
            animate={{ opacity: 1, y: -18, scale: 1 }}
            exit={{ opacity: 0, y: -26, scale: 0.9 }}
            transition={{ duration: 0.45 }}
            className="absolute left-1/2 -translate-x-1/2 -top-2 pointer-events-none select-none"
          >
            <span className="text-base">{emoji}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ========================= Página ========================= */

export default function Home() {
  const [tab, setTab] = React.useState<'RUMOR' | 'REPORTE'>('RUMOR');
  const [loading, setLoading] = React.useState(false);
  const [feed, setFeed] = React.useState<FeedItem[]>([]);
  const [msg, setMsg] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    title: '',
    content: '',
    barrio: '',
    imagen_url: '',
  });

  /* ---------- Carga de feed ---------- */
  async function load() {
    try {
      const r = await fetch('/api/list', { cache: 'no-store' });
      const j = await r.json();
      if (!j.ok) {
        setMsg(j.error || 'No se pudo cargar el feed.');
        return;
      }
      const normalized: FeedItem[] = (j.data as Submission[]).map((s: any) => ({
        ...s,
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
      normalized.forEach((it) => fetchComments(it.id)); // precarga comentarios
    } catch (e: any) {
      setMsg(e?.message || 'Error de red al cargar el feed.');
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  /* ---------- Refresh puntual desde Supabase (vista reaction_totals) ---------- */
  async function refreshOne(submissionId: string) {
    const { data, error } = await supabaseBrowser
      .from('reaction_totals')
      .select(
        'like_count,dislike_count,haha_count,wow_count,angry_count,sad_count'
      )
      .eq('submission_id', submissionId)
      .maybeSingle();

    if (error) {
      console.warn('refreshOne error', error);
      return;
    }

    const totals: ReactionTotals =
      data ?? {
        like_count: 0,
        dislike_count: 0,
        haha_count: 0,
        wow_count: 0,
        angry_count: 0,
        sad_count: 0,
      };

    setFeed((curr) =>
      curr.map((it) => (it.id === submissionId ? { ...it, totals } : it))
    );
  }

  /* ---------- Comentarios: fetch lista por publicación ---------- */
  async function fetchComments(submissionId: string) {
    try {
      const r = await fetch(`/api/comments/${submissionId}`, { cache: 'no-store' });
      const j = await r.json();
      if (j.ok) {
        setFeed((curr) =>
          curr.map((it) => (it.id === submissionId ? { ...it, comments: j.data } : it))
        );
      }
    } catch {
      /* noop */
    }
  }

  /* ---------- Realtime: reacciones y comentarios ---------- */
  React.useEffect(() => {
    const channel = supabaseBrowser
      .channel('public:reactions-comments-v3')

      // Reacciones -> refrescar solo la tarjeta
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reactions' },
        (payload) => {
          const sid =
            (payload.new as any)?.submission_id ??
            (payload.old as any)?.submission_id;
          if (sid) refreshOne(sid);
        }
      )

      // Comentarios INSERT -> merge inmediato
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' },
        (payload) => {
          const c = payload.new as Comment;
          const sid = (c as any)?.submission_id as string | undefined;
          if (!sid) return;
          setFeed((curr) =>
            curr.map((it) =>
              it.id === sid
                ? {
                    ...it,
                    comments: [
                      ...(it.comments ?? []),
                      { id: c.id, body: c.body, nickname: c.nickname, created_at: c.created_at },
                    ],
                  }
                : it
            )
          );
        }
      )

      // Comentarios DELETE -> sacar en memoria
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'comments' },
        (payload) => {
          const c = payload.old as Comment;
          const sid = (c as any)?.submission_id as string | undefined;
          if (!sid) return;
          setFeed((curr) =>
            curr.map((it) =>
              it.id === sid
                ? { ...it, comments: (it.comments ?? []).filter((x) => x.id !== c.id) }
                : it
            )
          );
        }
      )

      // Comentarios UPDATE -> refrescar lista (por simplicidad)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'comments' },
        (payload) => {
          const sid =
            (payload.new as any)?.submission_id ??
            (payload.old as any)?.submission_id;
          if (sid) fetchComments(sid);
        }
      )

      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, []);

  /* ---------- Enviar rumor/reporte ---------- */
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

  /* ---------- Reaccionar (optimista + verificación) ---------- */
  async function react(submissionId: string, tag: 'like' | 'dislike' | 'haha' | 'wow' | 'angry' | 'sad') {
    const voter = getVoter();
    const already = getLocalReacted(submissionId);
    if (already === tag) return;

    // Optimismo: +1 local
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

    try {
      const res = await fetch('/api/react', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: submissionId, reaction: tag, voter }),
      });
      const j = await res.json();

      if (!res.ok || !j.ok) {
        alert('❌ Error al reaccionar: ' + (j?.error || 'Desconocido'));
        await refreshOne(submissionId);
        return;
      }

      if (j.totals) {
        setFeed((curr) =>
          curr.map((it) =>
            it.id === submissionId ? { ...it, totals: j.totals as ReactionTotals } : it
          )
        );
      } else {
        setTimeout(() => refreshOne(submissionId), 350);
      }

      setLocalReacted(submissionId, tag);
    } catch (err: any) {
      alert('⚠️ Fallo de red al reaccionar: ' + (err?.message || 'sin detalle'));
      refreshOne(submissionId);
    }
  }

  /* ========================= Render ========================= */

  return (
    <main className="mx-auto max-w-5xl p-4">
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('RUMOR')}
          className={`px-4 py-2 rounded-full border ${
            tab === 'RUMOR' ? 'bg-emerald-600 text-white' : 'bg-white'
          }`}
        >
          Rumor 🧐
        </button>
        <button
          onClick={() => setTab('REPORTE')}
          className={`px-4 py-2 rounded-full border ${
            tab === 'REPORTE' ? 'bg-emerald-600 text-white' : 'bg-white'
          }`}
        >
          Buzón 📨
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* FORM */}
        <motion.section
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className="rounded-2xl border p-4"
        >
          <h2 className="text-lg font-semibold mb-4">
            Enviar {tab === 'RUMOR' ? 'Rumor' : 'Reporte'}
          </h2>

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
        </motion.section>

        {/* FEED */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Lo más reciente (aprobado)</h2>

          {feed.length === 0 && (
            <div className="text-sm text-gray-500">Aún no hay publicaciones aprobadas.</div>
          )}

          <AnimatePresence initial={false}>
            {feed.map((it) => {
              const reacted = getLocalReacted(it.id);
              return (
                <motion.article
                  key={it.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  className="rounded-2xl border p-4 flex flex-col gap-3 bg-white"
                >
                  <div className="text-xs text-gray-500">
                    {new Date(it.created_at).toLocaleString()}
                  </div>
                  <div>
                    <div className="text-[10px] tracking-wide text-gray-500 mb-1">
                      {it.category}
                    </div>
                    <h3 className="font-semibold">{it.title}</h3>
                    <p className="text-sm mt-1">{it.content}</p>
                    {it.barrio ? <div className="text-xs mt-1">📍 {it.barrio}</div> : null}
                  </div>

                  {/* Reacciones */}
                  <div className="flex flex-wrap items-center gap-2">
                    {REACTIONS.map((r) => (
                      <ReactionButton
                        key={r.key}
                        active={reacted === r.tag}
                        emoji={r.code}
                        count={(it.totals as any)[r.key]}
                        label={r.label}
                        onClick={() => react(it.id, r.tag)}
                      />
                    ))}
                  </div>

                  {/* Comentarios */}
                  <CommentsBlock
                    submissionId={it.id}
                    comments={it.comments ?? []}
                    onAdd={async (body, nickname) => submitComment(it.id, body, nickname)}
                  />
                </motion.article>
              );
            })}
          </AnimatePresence>
        </section>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="text-center text-xs text-gray-500 mt-10"
      >
        Costachisme © {new Date().getFullYear()} · Hecho con ❤ en Salina Cruz
      </motion.div>
    </main>
  );
}

/* ========================= Bloque de comentarios ========================= */

function CommentsBlock({
  submissionId,
  comments,
  onAdd,
}: {
  submissionId: string;
  comments: Comment[];
  onAdd: (body: string, nickname?: string) => Promise<boolean>;
}) {
  const [open, setOpen] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [body, setBody] = React.useState('');
  const [nick, setNick] = React.useState('');

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
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-sm text-emerald-700 hover:underline"
      >
        {open ? 'Ocultar comentarios' : `Comentarios (${comments.length})`}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="comments-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="mt-3 space-y-3 overflow-hidden"
          >
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
              <AnimatePresence initial={false}>
                {comments.map((c) => (
                  <motion.li
                    key={c.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm rounded-lg bg-gray-50 p-2"
                  >
                    <div className="text-xs text-gray-500 mb-1">
                      {c.nickname ? c.nickname : 'Anónimo'} ·{' '}
                      {new Date(c.created_at).toLocaleString()}
                    </div>
                    <div>{c.body}</div>
                  </motion.li>
                ))}
              </AnimatePresence>

              {comments.length === 0 && (
                <li className="text-xs text-gray-500">Sé el primero en comentar.</li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ========================= Envío de comentario ========================= */
async function submitComment(
  submissionId: string,
  body: string,
  nickname?: string
) {
  const r = await fetch(`/api/comments/${submissionId}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ body, nickname }),
  });
  const j = await r.json();
  if (j.ok) {
    // El INSERT hará merge en realtime; confirmamos por si acaso:
    setTimeout(() => {
      // best-effort, no bloquea
      fetch(`/api/comments/${submissionId}`).then(() => {});
    }, 150);
    return true;
  } else {
    alert('❌ Error al comentar: ' + (j.error || 'Desconocido'));
    return false;
  }
}
