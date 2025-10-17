'use client';

import React, { useEffect, useState } from 'react';
import { z } from 'zod';

/** -------------------------------
 *  Esquema de validación (Zod)
 *  ------------------------------- */
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
  barrio: z.string().max(60, { message: 'El barrio/colonia no puede superar 60 caracteres.' }).optional(),
  imagen_url: z
    .string()
    .optional()
    .transform((v) => (v?.trim() === '' ? undefined : v?.trim()))
    .pipe(z.string().url({ message: 'La URL de imagen no es válida.' }).optional()),
});

type Submission = {
  id: string;
  category: 'RUMOR' | 'REPORTE';
  title: string;
  content: string;
  barrio: string | null;
  imagen_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  score: number;
};

export default function Home() {
  /** -------------------------------
   *  Estados de UI
   *  ------------------------------- */
  const [tab, setTab] = useState<'RUMOR' | 'REPORTE'>('RUMOR');
  const [loading, setLoading] = useState(false);
  const [feed, setFeed] = useState<Submission[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  // Evitar clics repetidos en “Me pasó también”
  const [voted, setVoted] = useState<Record<string, boolean>>({});
  const [voting, setVoting] = useState<Record<string, boolean>>({});

  // Formulario controlado
  const [form, setForm] = useState({
    title: '',
    content: '',
    barrio: '',
    imagen_url: '',
  });

  // Identificador de votante por dispositivo
  const [voterId, setVoterId] = useState<string>('');

  /** -------------------------------
   *  Cargar feed
   *  ------------------------------- */
  async function load() {
    try {
      const r = await fetch('/api/list');
      const j = await r.json();
      if (j.ok) setFeed(j.data as Submission[]);
    } catch (_) {
      // no-op
    }
  }

  useEffect(() => {
    load();
  }, []);

  /** -------------------------------
   *  Generar / Leer voterId + hidratar "voted"
   *  ------------------------------- */
  useEffect(() => {
    // voter id persistente en el dispositivo
    const key = 'costa:voterId';
    let v = localStorage.getItem(key);
    if (!v) {
      // usa crypto si existe, o un aleatorio
      const rnd = (globalThis.crypto?.randomUUID?.() ?? `anon-${Math.random().toString(36).slice(2)}`);
      v = rnd;
      localStorage.setItem(key, v);
    }
    setVoterId(v);

    // hidratar marcadores de "ya votado"
    const map: Record<string, boolean> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || '';
      if (k.startsWith('costa:voted:')) {
        const id = k.replace('costa:voted:', '');
        map[id] = true;
      }
    }
    setVoted(map);
  }, []);

  /** -------------------------------
   *  Enviar formulario
   *  ------------------------------- */
  async function submit() {
    setMsg(null);
    setErrors({});
    setLoading(true);

    const payload = { category: tab, ...form };
    const parsed = schema.safeParse(payload);

    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setErrors(flat);
      setMsg('Revisa los campos con errores.');
      setLoading(false);
      return;
    }

    try {
      const r = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const j = await r.json();

      if (!j.ok) throw new Error(j.error || 'Error al enviar');

      setMsg('¡Enviado! Tu publicación entrará a revisión.');
      setForm({ title: '', content: '', barrio: '', imagen_url: '' });
      // Opcional: refrescar lista si tu /api/list solo trae aprobados no verás el nuevo hasta aprobarlo
      await load();
    } catch (e: any) {
      setMsg(e?.message || 'No se pudo enviar. Intenta más tarde.');
    } finally {
      setLoading(false);
    }
  }

  /** -------------------------------
   *  Votar (“Me pasó también”)
   *  ------------------------------- */
  async function vote(id: string) {
    const votedKey = `costa:voted:${id}`;

    // Si ya votó este dispositivo
    if (localStorage.getItem(votedKey) || voted[id]) return;
    // Si ya hay una petición en curso
    if (voting[id]) return;

    // Marca “en curso”
    setVoting((m) => ({ ...m, [id]: true }));

    // Optimista: sube +1 en UI
    setFeed((prev) => prev.map((s) => (s.id === id ? { ...s, score: s.score + 1 } : s)));

    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, voter: voterId }),
      });

      if (!res.ok) {
        // Revertir si falla
        setFeed((prev) => prev.map((s) => (s.id === id ? { ...s, score: s.score - 1 } : s)));
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'No se pudo registrar tu voto.');
      }

      // Éxito: recordar que ya votó este dispositivo
      localStorage.setItem(votedKey, '1');
      setVoted((m) => ({ ...m, [id]: true }));
    } catch (e: any) {
      alert(e?.message || 'No se pudo registrar tu voto. Intenta más tarde.');
    } finally {
      setVoting((m) => {
        const { [id]: _, ...rest } = m;
        return rest;
      });
    }
  }

  /** -------------------------------
   *  Render
   *  ------------------------------- */
  return (
    <div className="mx-auto max-w-5xl p-4">
      {/* Héroe / Encabezado simple */}
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
        🚀 Hola desde Tailwind!
      </h1>

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab('RUMOR')}
          className={`px-3 py-2 rounded-full border ${tab === 'RUMOR' ? 'bg-emerald-600 text-white' : 'bg-white'}`}
        >
          Rumor 🫢
        </button>
        <button
          onClick={() => setTab('REPORTE')}
          className={`px-3 py-2 rounded-full border ${tab === 'REPORTE' ? 'bg-emerald-600 text-white' : 'bg-white'}`}
        >
          Buzón 📮
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Formulario */}
        <section className="border rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold mb-2">Enviar {tab === 'RUMOR' ? 'Rumor' : 'Reporte'}</h2>

          <label className="block text-sm mb-1">Título</label>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full border rounded-lg p-2 mb-2"
            placeholder="Ej. Se dice que..."
          />
          {errors.title?.length ? (
            <p className="text-xs text-red-600 mb-2">{errors.title[0]}</p>
          ) : (
            <p className="text-xs text-muted-foreground mb-2">Mínimo 5 y máximo 80 caracteres.</p>
          )}

          <label className="block text-sm mb-1">Texto</label>
          <textarea
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            className="w-full border rounded-lg p-2 mb-2"
            rows={5}
            placeholder="Sin nombres ni datos personales. Enfócate en situaciones."
          />
          {errors.content?.length ? (
            <p className="text-xs text-red-600 mb-2">{errors.content[0]}</p>
          ) : (
            <p className="text-xs text-muted-foreground mb-2">Mínimo 12 y máximo 400 caracteres.</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Barrio/Colonia (opcional)</label>
              <input
                value={form.barrio}
                onChange={(e) => setForm((f) => ({ ...f, barrio: e.target.value }))}
                className="w-full border rounded-lg p-2"
                placeholder="Centro..."
              />
              {errors.barrio?.length ? (
                <p className="text-xs text-red-600 mt-1">{errors.barrio[0]}</p>
              ) : null}
            </div>
            <div>
              <label className="block text-sm mb-1">URL de imagen (opcional)</label>
              <input
                value={form.imagen_url}
                onChange={(e) => setForm((f) => ({ ...f, imagen_url: e.target.value }))}
                className="w-full border rounded-lg p-2"
                placeholder="https://..."
              />
              {errors.imagen_url?.length ? (
                <p className="text-xs text-red-600 mt-1">{errors.imagen_url[0]}</p>
              ) : null}
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            Reglas: sin nombres, teléfonos, matrículas, amenazas ni insultos. Todo pasa por revisión.
          </p>

          <div className="mt-3">
            <button
              onClick={submit}
              disabled={loading}
              className="bg-emerald-600 text-white rounded-lg px-4 py-2 disabled:opacity-50"
            >
              {loading ? 'Enviando…' : 'Enviar'}
            </button>
          </div>

          {msg && <p className="mt-3 text-sm">{msg}</p>}
        </section>

        {/* Lo más reciente */}
        <section className="border rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold mb-2">Lo más reciente (aprobado)</h2>

          <div className="space-y-3">
            {feed.length === 0 && <p className="text-sm text-muted-foreground">Sin publicaciones aún.</p>}

            {feed.map((item) => (
              <article key={item.id} className="border rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider opacity-60">{item.category}</span>
                  <span className="text-xs opacity-60">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>

                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm mt-1">{item.content}</p>

                <div className="mt-2 flex items-center gap-2">
                  {item.barrio ? (
                    <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full">
                      📍 {item.barrio}
                    </span>
                  ) : null}
                  {item.imagen_url ? (
                    <a
                      className="text-xs underline"
                      href={item.imagen_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver imagen
                    </a>
                  ) : null}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-sm">👍 {item.score} votos</div>

                  <button
                    onClick={() => vote(item.id)}
                    disabled={!!voted[item.id] || !!voting[item.id]}
                    className={`text-sm px-3 py-1.5 rounded-md border ${
                      voted[item.id] ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50'
                    }`}
                    aria-label="Me pasó también"
                  >
                    {voted[item.id] ? '¡Gracias! 👍' : voting[item.id] ? 'Enviando…' : 'Me pasó también 👍'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
