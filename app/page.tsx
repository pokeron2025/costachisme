'use client';

import React from 'react';
import { z } from 'zod';
import { supabaseBrowser } from '@/lib/supabase-browser';

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

type FeedItem = Submission & {
  totals: ReactionTotals;
  comments?: Array<{ id: string; body: string; nickname: string | null; created_at: string }>;
};

/* ==================== Validación del formulario ==================== */

const schema = z.object({
  category: z.enum(['RUMOR', 'REPORTE']),
  title: z.string().min(5).max(80),
  content: z.string().min(12).max(400),
  barrio: z.string().max(60).optional().or(z.literal('')),
  imagen_url: z.string().url().optional().or(z.literal('')),
});

/* ========================= Constantes UI ========================= */

const REACTIONS: Array<{ key: keyof ReactionTotals; code: string; label: string; tag: string }> = [
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
      const normalized: FeedItem[] = (j.data as Submission[]).map((s) => ({
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
      }));
      setFeed(normalized);
      // opcional: precargar comentarios
      normalized.forEach((it) => fetchComments(it.id));
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

  /* ---------- Realtime: reacciones y comentarios ---------- */
  React.useEffect(() => {
    const channel = supabaseBrowser
      .channel('public:reactions-comments')
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
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

  /* ---------- Hacer reacción (optimista + verificación) ---------- */
  async function react(submissionId: string, tag: string) {
    const voter = getVoter();
    const already = getLocalReacted(submissionId);
    if (already === tag) return;

    // Optimista: sube 1 al contador local antes de la respuesta
    setFeed((curr) =>
      curr.map((it) =>
        it.id === submissionId
          ? {
              ...it,
              totals: {
                ...it.totals,
                ...(tag === 'like' ? { like_count: it.totals.like_count + 1 } : {}),
                ...(tag === 'dislike'
                  ? { dislike_count: it.totals.dislike_count + 1 }
                  : {}),
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
        // revertir optimismo ante error
        refreshOne(submissionId);
        return;
      }

      // Si el backend devuelve totales, úsalo; si no, hacemos un refresh.
      if (j.totals) {
        setFeed((curr) =>
          curr.map((it) =>
            it.id === submissionId ? { ...it, totals: j.totals as ReactionTotals } : it
          )
        );
      } else {
        setTimeout(() => refreshOne(submissionId), 400);
      }

      setLocalReacted(submissionId, tag);
    } catch (err: any) {
      alert('⚠️ Fallo de red al reaccionar: ' + (err?.message || 'sin detalle'));
      refreshOne(submissionId);
    }
  }

  /* ---------- Comentarios ---------- */
  async function fetchComments(submissionId: string) {
    try {
      const r = await fetch(`/api/comments/${submissionId}`);
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

  async function submitComment(
    submissionId: string,
    body: string,
    nickname: string | undefined
  ) {
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

  const voterId = React.useMemo(() => getVoter(), []);

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
        <section className="rounded-2xl border p-4">
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
        </section>

        {/* FEED */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Lo más reciente (aprobado)</h2>

          {feed.length === 0 && (
            <div className="text-sm text-gray-500">Aún no hay publicaciones aprobadas.</div>
          )}

          {feed.map((it) => {
            const reacted = getLocalReacted(it.id);
            return (
              <article
                key={it.id}
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
                    <button
                      key={r.key}
                      onClick={() => react(it.id, r.tag)}
                      className={`px-3 py-1 rounded-full border text-sm flex items-center gap-1 ${
                        reacted === r.tag
                          ? 'bg-emerald-50 border-emerald-300'
                          : 'bg-white hover:bg-gray-50'
                      }`}
                      title={r.label}
                    >
                      <span>{r.code}</span>
                      <span>{(it.totals as any)[r.key]}</span>
                    </button>
                  ))}
                </div>

                {/* Comentarios */}
                <CommentsBlock
                  submissionId={it.id}
                  comments={it.comments ?? []}
                  onAdd={async (body, nickname) => {
                    const ok = await submitComment(it.id, body, nickname);
                    return ok;
                  }}
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

/* ========================= Bloque de comentarios ========================= */

function CommentsBlock({
  submissionId,
  comments,
  onAdd,
}: {
  submissionId: string;
  comments: Array<{ id: string; body: string; nickname: string | null; created_at: string }>;
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
            {comments.length === 0 && (
              <li className="text-xs text-gray-500">Sé el primero en comentar.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
