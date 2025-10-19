// app/page.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { supabaseBrowser } from '@/lib/supabase-browser';

/* ======================
   Tipos
====================== */
type Category = 'RUMOR' | 'REPORTE';

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

/* ======================
   Constantes / util
====================== */
const REACTIONS: Array<{ key: keyof ReactionTotals; code: string; label: string; tag: string }> = [
  { key: 'like_count', code: '👍', label: 'Me gusta', tag: 'like' },
  { key: 'dislike_count', code: '👎', label: 'No me gusta', tag: 'dislike' },
  { key: 'haha_count', code: '😂', label: 'Jaja', tag: 'haha' },
  { key: 'wow_count', code: '😮', label: 'Wow', tag: 'wow' },
  { key: 'angry_count', code: '😡', label: 'Enojo', tag: 'angry' },
  { key: 'sad_count', code: '😢', label: 'Triste', tag: 'sad' },
];

const formSchema = z.object({
  category: z.enum(['RUMOR', 'REPORTE']),
  title: z.string().min(5).max(80),
  content: z.string().min(12).max(400),
  barrio: z.string().max(60).optional().or(z.literal('')),
  imagen_url: z.string().url().optional().or(z.literal('')),
});

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

/* ======================
   Página
====================== */
export default function Home() {
  // pestaña Rumor/Buzón
  const [tab, setTab] = useState<Category>('RUMOR');

  // filtros UI
  const [q, setQ] = useState('');
  const [onlyBarrio, setOnlyBarrio] = useState('');
  const [withImage, setWithImage] = useState(false);
  type SortMode = 'recientes' | 'mas_votados' | 'mas_reacciones' | 'mas_comentados';
  const [sortMode, setSortMode] = useState<SortMode>('recientes');

  // feed y estados
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // formulario
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', barrio: '', imagen_url: '' });

  // throttle global de recarga completa (fallback)
  const refreshTimer = useRef<NodeJS.Timeout | null>(null);
  const scheduleRefreshAll = () => {
    if (refreshTimer.current) return;
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      load();
    }, 250);
  };

  // ------- carga inicial (desde /api/list) ------
  async function load() {
    setLoadingFeed(true);
    setMsg(null);
    try {
      const r = await fetch('/api/list', { cache: 'no-store' });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'No se pudo cargar');
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
      normalized.forEach((it) => fetchComments(it.id));
    } catch (e: any) {
      setMsg(e?.message || 'Error cargando el feed');
    } finally {
      setLoadingFeed(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // ------- realtime (reacciones y comentarios) -------
  useEffect(() => {
    const channel = supabaseBrowser
      .channel('public:reactions-comments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, (payload) => {
        const sid =
          (payload.new as any)?.submission_id ?? (payload.old as any)?.submission_id ?? null;
        if (sid) refreshOne(sid);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (payload) => {
        const sid =
          (payload.new as any)?.submission_id ?? (payload.old as any)?.submission_id ?? null;
        if (sid) fetchComments(sid);
      })
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, []);

  // refresco fino: sólo totales de una publicación (usa /api/reaction-totals/[id])
  const perItemTimers = useRef<Record<string, NodeJS.Timeout>>({});
  function refreshOne(id: string) {
    if (perItemTimers.current[id]) return;
    perItemTimers.current[id] = setTimeout(async () => {
      delete perItemTimers.current[id];
      try {
        const r = await fetch(`/api/reaction-totals/${id}`, { cache: 'no-store' });
        const j = await r.json();
        if (j.ok && j.totals) {
          setFeed((curr) =>
            curr.map((it) => (it.id === id ? { ...it, totals: j.totals as ReactionTotals } : it))
          );
        } else {
          scheduleRefreshAll();
        }
      } catch {
        scheduleRefreshAll();
      }
    }, 180);
  }

  // ------- enviar publicación (usa /api/submit) -------
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    const payload = {
      category: tab,
      title: form.title,
      content: form.content,
      barrio: form.barrio,
      imagen_url: form.imagen_url,
    };
    const parsed = formSchema.safeParse(payload);
    if (!parsed.success) {
      setMsg(parsed.error.errors[0]?.message || 'Revisa los campos.');
      return;
    }

    setSending(true);
    try {
      const r = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const j = await r.json();
      if (!j.ok) {
        setMsg(j.error || 'No se pudo enviar');
      } else {
        setMsg('¡Enviado! Aparecerá cuando sea aprobado.');
        setForm({ title: '', content: '', barrio: '', imagen_url: '' });
      }
    } catch (e: any) {
      setMsg(e?.message || 'Error de red');
    } finally {
      setSending(false);
    }
  }

  // ------- reaccionar (usa /api/react) -------
  async function react(submissionId: string, tag: string) {
    const already = getLocalReacted(submissionId);
    if (already === tag) return;

    try {
      const res = await fetch('/api/react', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: submissionId, reaction: tag, voter: getVoter() }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        alert('❌ Error al reaccionar: ' + (j?.error || 'desconocido'));
        return;
      }

      if (j.totals) {
        setFeed((curr) =>
          curr.map((it) => (it.id === submissionId ? { ...it, totals: j.totals } : it))
        );
      }
      setLocalReacted(submissionId, tag);
    } catch (e: any) {
      alert('⚠️ Fallo de red: ' + (e?.message || 'sin detalle'));
    }
  }

  // ------- comentarios (usa /api/comments/[id]) -------
  async function fetchComments(id: string) {
    try {
      const r = await fetch(`/api/comments/${id}`, { cache: 'no-store' });
      const j = await r.json();
      if (j.ok) {
        setFeed((curr) => curr.map((it) => (it.id === id ? { ...it, comments: j.data } : it)));
      }
    } catch {
      /* silent */
    }
  }

  async function submitComment(id: string, body: string, nickname?: string) {
    const r = await fetch(`/api/comments/${id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body, nickname }),
    });
    const j = await r.json();
    if (j.ok) {
      fetchComments(id);
      return true;
    } else {
      alert('❌ Error al comentar: ' + (j.error || 'Desconocido'));
      return false;
    }
  }

  // Reemplaza tu función report() por esta
async function report(submissionId: string, reason: string) {
  try {
    const r = await fetch('/api/report', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ submissionId, reason, voter: getVoter() }),
    });
    const j = await r.json();

    if (!r.ok || !j.ok) {
      // Mensajes claros según código
      if (r.status === 409) {
        alert('Ya reportaste esta publicación desde este dispositivo.');
      } else if (r.status === 429) {
        alert('Has alcanzado el límite de reportes por hora. Intenta más tarde.');
      } else {
        alert('No se pudo reportar: ' + (j?.error || 'desconocido'));
      }
      return false;
    }

    alert('✅ Reporte enviado. ¡Gracias!');
    return true;
  } catch (e: any) {
    alert('⚠️ Fallo de red al reportar: ' + (e?.message || 'sin detalle'));
    return false;
  }
}

  // ------- filtros + sort -------
  const filtered = useMemo(() => {
    const words = q.trim().toLowerCase();
    return feed
      .filter((it) => {
        const okTab = it.category === tab;
        const okBarrio =
          !onlyBarrio || (it.barrio || '').trim().toLowerCase().includes(onlyBarrio.toLowerCase());
        const okText =
          !words ||
          it.title.toLowerCase().includes(words) ||
          it.content.toLowerCase().includes(words) ||
          (it.barrio || '').toLowerCase().includes(words);
        const okImage = !withImage || !!it.imagen_url;
        return okTab && okBarrio && okText && okImage;
      })
      .sort((a, b) => {
        if (sortMode === 'recientes') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortMode === 'mas_votados') {
          const sa = a.totals.like_count - a.totals.dislike_count;
          const sb = b.totals.like_count - b.totals.dislike_count;
          return sb - sa || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortMode === 'mas_reacciones') {
          const ta =
            a.totals.like_count +
            a.totals.dislike_count +
            a.totals.haha_count +
            a.totals.wow_count +
            a.totals.angry_count +
            a.totals.sad_count;
          const tb =
            b.totals.like_count +
            b.totals.dislike_count +
            b.totals.haha_count +
            b.totals.wow_count +
            b.totals.angry_count +
            b.totals.sad_count;
          return tb - ta || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        const ca = a.comments?.length ?? 0;
        const cb = b.comments?.length ?? 0;
        return cb - ca || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [feed, tab, q, onlyBarrio, withImage, sortMode]);

  const voterId = useMemo(() => getVoter(), []);

  /* ======================
     Render
  ====================== */
  return (
    <main className="mx-auto max-w-5xl p-4">
      {/* Tabs y filtro de texto */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
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

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrar por texto o barrio…"
          className="ml-auto w-64 rounded-full border px-3 py-2 text-sm"
        />
      </div>

      {/* Controles: sort + filtros rápidos */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {([
          { key: 'recientes', label: 'Recientes' },
          { key: 'mas_votados', label: 'Más votados' },
          { key: 'mas_reacciones', label: 'Más reacciones' },
          { key: 'mas_comentados', label: 'Más comentados' },
        ] as { key: SortMode; label: string }[]).map((s) => (
          <button
            key={s.key}
            onClick={() => setSortMode(s.key)}
            className={`px-3 py-1 rounded-full border text-sm ${
              sortMode === s.key ? 'bg-emerald-600 text-white' : 'bg-white'
            }`}
          >
            {s.label}
          </button>
        ))}

        <button
          onClick={() => setWithImage((v) => !v)}
          className={`px-3 py-1 rounded-full border text-sm ${
            withImage ? 'bg-emerald-50 border-emerald-300' : 'bg-white'
          }`}
          title="Mostrar sólo publicaciones con imagen"
        >
          🖼️ Con imagen {withImage ? '✓' : ''}
        </button>

        <input
          value={onlyBarrio}
          onChange={(e) => setOnlyBarrio(e.target.value)}
          placeholder="Filtrar por barrio…"
          className="ml-auto w-48 rounded-full border px-3 py-1.5 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* FORM */}
        <section className="rounded-2xl border p-4 bg-white">
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
              disabled={sending}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-50"
            >
              {sending ? 'Enviando…' : 'Enviar'}
            </button>
          </form>
        </section>

        {/* FEED */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Lo más reciente (aprobado)</h2>

          {loadingFeed && <div className="text-sm text-gray-500">Cargando…</div>}
          {!loadingFeed && filtered.length === 0 && (
            <div className="text-sm text-gray-500">No hay publicaciones que coincidan con los filtros.</div>
          )}

          {filtered.map((it) => {
            const reacted = getLocalReacted(it.id);
            return (
              <article
                key={it.id}
                className="relative rounded-2xl border p-4 flex flex-col gap-3 bg-white"
              >
                {/* 🚩 Botón de reportar fijo arriba derecha */}
                <ReportButton
                  onReport={async (reason) => report(it.id, reason)}
                />

                <div className="text-xs text-gray-500">
                  {new Date(it.created_at).toLocaleString()}
                </div>

                <div>
                  <div className="text-[10px] tracking-wide text-gray-500 mb-1">
                    {it.category}
                  </div>
                  <h3 className="font-semibold pr-10">{it.title}</h3>
                  <p className="text-sm mt-1">{it.content}</p>
                  {it.barrio ? <div className="text-xs mt-1">📍 {it.barrio}</div> : null}
                  {it.imagen_url ? (
                    <img
                      src={it.imagen_url}
                      alt="Imagen"
                      className="mt-2 rounded-lg max-h-64 w-full object-cover"
                    />
                  ) : null}
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

/* ======================
   Botón/menú de Reporte
====================== */
function ReportButton({
  onReport,
}: {
  onReport: (reason: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [reason, setReason] = useState('');

  return (
    <div className="absolute right-3 top-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border px-2 py-1 text-xs bg-white hover:bg-red-50"
        title="Reportar publicación"
      >
        🚩 Reportar
      </button>

      {open && (
        <div className="mt-2 w-64 rounded-xl border bg-white p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">¿Por qué la reportas?</p>
          <textarea
            className="w-full rounded-lg border px-2 py-1 text-sm h-20"
            placeholder="Ej. contiene datos personales, insultos, etc."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              className="px-3 py-1 text-sm rounded border"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </button>
            <button
              className="px-3 py-1 text-sm rounded bg-red-600 text-white disabled:opacity-50"
              disabled={sending || reason.trim().length < 3}
              onClick={async () => {
                setSending(true);
                const ok = await onReport(reason.trim());
                setSending(false);
                if (ok) {
                  setReason('');
                  setOpen(false);
                }
              }}
            >
              {sending ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ======================
   Bloque de comentarios
====================== */
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
