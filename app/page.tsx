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

function totalReactions(t: ReactionTotals) {
  return (
    (t.like_count || 0) +
    (t.dislike_count || 0) +
    (t.haha_count || 0) +
    (t.wow_count || 0) +
    (t.angry_count || 0) +
    (t.sad_count || 0)
  );
}

/* ========================= Mini componentes (UI + Animaciones) ========================= */

function Chip({
  active,
  children,
  onClick,
  title,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-3 py-1 rounded-full border text-sm ${
        active ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}

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

  // Controles de filtro/orden/búsqueda (UI modernizada)
  const [queryInput, setQueryInput] = React.useState(''); // input inmediato
  const [query, setQuery] = React.useState(''); // query con debounce
  const [sortBy, setSortBy] = React.useState<'recent' | 'reactions' | 'comments'>('recent');
  const [onlyWithImage, setOnlyWithImage] = React.useState(false);
  const [minReactionsChip, setMinReactionsChip] = React.useState<0 | 5>(0);
  const [minCommentsChip, setMinCommentsChip] = React.useState<0 | 3>(0);

  const [form, setForm] = React.useState({
    title: '',
    content: '',
    barrio: '',
    imagen_url: '',
  });

  /* ---------- Debounce de búsqueda ---------- */
  React.useEffect(() => {
    const t = setTimeout(() => setQuery(queryInput.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [queryInput]);

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
      .channel('public:reactions-comments-v5')

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

      // Comentarios UPDATE -> refrescar lista (simple)
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

  /* ---------- Derivados: lista filtrada/ordenada ---------- */
  const derived = React.useMemo(() => {
    let list = feed.filter((it) => it.category === tab);

    if (query) {
      list = list.filter((it) => {
        const hay =
          it.title.toLowerCase().includes(query) ||
          it.content.toLowerCase().includes(query) ||
          (it.barrio || '').toLowerCase().includes(query);
        return hay;
      });
    }

    if (onlyWithImage) list = list.filter((it) => !!it.imagen_url);
    if (minReactionsChip > 0) list = list.filter((it) => totalReactions(it.totals) >= minReactionsChip);
    if (minCommentsChip > 0) list = list.filter((it) => (it.comments?.length || 0) >= minCommentsChip);

    list = [...list].sort((a, b) => {
      if (sortBy === 'recent') return +new Date(b.created_at) - +new Date(a.created_at);
      if (sortBy === 'reactions') return totalReactions(b.totals) - totalReactions(a.totals);
      const ac = a.comments?.length || 0;
      const bc = b.comments?.length || 0;
      return bc - ac;
    });

    return list;
  }, [feed, tab, query, sortBy, onlyWithImage, minReactionsChip, minCommentsChip]);

  function clearFilters() {
    setQueryInput('');
    setQuery('');
    setOnlyWithImage(false);
    setMinReactionsChip(0);
    setMinCommentsChip(0);
    setSortBy('recent');
  }

  /* ========================= Render ========================= */

  return (
    <main className="mx-auto max-w-6xl p-4">
      {/* Tabs */}
      <div className="flex gap-2 mb-3">
        <Chip active={tab === 'RUMOR'} onClick={() => setTab('RUMOR')}>Rumor 🧐</Chip>
        <Chip active={tab === 'REPORTE'} onClick={() => setTab('REPORTE')}>Buzón 📨</Chip>
      </div>

      {/* Controles modernizados */}
      <div className="rounded-2xl border p-3 mb-4 bg-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Búsqueda */}
          <input
            className="rounded-lg border px-3 py-2 w-full md:w-80"
            placeholder="Buscar por título, texto o barrio…"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
          />

          {/* Orden */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Ordenar:</span>
            <Chip active={sortBy === 'recent'} onClick={() => setSortBy('recent')} title="Más recientes">⏱️ Recientes</Chip>
            <Chip active={sortBy === 'reactions'} onClick={() => setSortBy('reactions')} title="Más reacciones">🔥 Reaccionados</Chip>
            <Chip active={sortBy === 'comments'} onClick={() => setSortBy('comments')} title="Más comentarios">💬 Comentados</Chip>
          </div>
        </div>

        {/* Filtros rápidos */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-xs text-gray-500">Filtros:</span>
          <Chip active={onlyWithImage} onClick={() => setOnlyWithImage((v) => !v)}>🖼️ Con imagen</Chip>
          <Chip
            active={minReactionsChip === 5}
            onClick={() => setMinReactionsChip((v) => (v === 5 ? 0 : 5))}
            title="Mostrar publicaciones con 5+ reacciones"
          >
            ✋ 5+ reacciones
          </Chip>
          <Chip
            active={minCommentsChip === 3}
            onClick={() => setMinCommentsChip((v) => (v === 3 ? 0 : 3))}
            title="Mostrar publicaciones con 3+ comentarios"
          >
            🗣️ 3+ comentarios
          </Chip>

          {(query || onlyWithImage || minReactionsChip || minCommentsChip || sortBy !== 'recent') && (
            <button
              className="ml-auto text-xs text-emerald-700 hover:underline"
              onClick={clearFilters}
              title="Quitar filtros"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6">
        {/* FORM */}
        <motion.section
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className="rounded-2xl border p-4 bg-white"
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
          <h2 className="text-lg font-semibold">Resultados</h2>

          {derived.length === 0 && (
            <div className="text-sm text-gray-500">
              No hay publicaciones que coincidan con los filtros.
            </div>
          )}

          <AnimatePresence initial={false}>
            {derived.map((it) => {
              const reacted = getLocalReacted(it.id);
              const commentsCount = it.comments?.length || 0;
              const reactsCount = totalReactions(it.totals);
              const isHot = reactsCount >= 5 || commentsCount >= 3;

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
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-gray-500">
                      {new Date(it.created_at).toLocaleString()}
                    </div>
                    {isHot && (
                      <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200">
                        🔥 Popular
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="text-[10px] tracking-wide text-gray-500 mb-1">
                      {it.category}
                    </div>
                    <h3 className="font-semibold">{it.title}</h3>
                    <p className="text-sm mt-1">{it.content}</p>
                    {it.barrio ? <div className="text-xs mt-1">📍 {it.barrio}</div> : null}
                    {it.imagen_url ? (
                      <img
                        src={it.imagen_url}
                        alt="Imagen adjunta"
                        className="mt-2 rounded-lg border max-h-64 object-cover w-full"
                        loading="lazy"
                      />
                    ) : null}
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
                    <span className="ml-2 text-xs text-gray-500">
                      {reactsCount} reacciones · {commentsCount} comentarios
                    </span>
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
    setTimeout(() => {
      fetch(`/api/comments/${submissionId}`).then(() => {});
    }, 150);
    return true;
  } else {
    alert('❌ Error al comentar: ' + (j.error || 'Desconocido'));
    return false;
  }
}
