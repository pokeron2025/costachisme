'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

// ====== Validaciones (Zod) con mensajes claros ======
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
  barrio: z.string().max(60).optional(),
  imagen_url: z
    .string()
    .url({ message: 'Debe ser una URL válida que empiece con http(s)://' })
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

type Submission = {
  id: string;
  created_at: string;
  category: 'RUMOR' | 'REPORTE';
  title: string;
  content: string;
  barrio?: string | null;
  imagen_url?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  score: number;
};

export default function Home() {
  const [tab, setTab] = useState<'RUMOR' | 'REPORTE'>('RUMOR');
  const [form, setForm] = useState({
    title: '',
    content: '',
    barrio: '',
    imagen_url: '',
  });
  const [loading, setLoading] = useState(false);
  const [feed, setFeed] = useState<Submission[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ====== ID de "votante" por dispositivo para evitar duplicar votos ======
  const voterId = useMemo(() => {
    const k = 'costa:voter';
    let v = localStorage.getItem(k);
    if (!v) {
      v = 'v_' + crypto.randomUUID();
      localStorage.setItem(k, v);
    }
    return v;
  }, []);

  // ====== Cargar feed ======
  async function load() {
    try {
      const r = await fetch('/api/list', { cache: 'no-store' });
      const j = await r.json();
      if (j.ok) setFeed(j.data as Submission[]);
    } catch (e) {
      // no-op
    }
  }

  useEffect(() => {
    load();
  }, []);

  // ====== Enviar formulario ======
  async function submit() {
    setMsg(null);
    setErrors({});
    const payload = { category: tab, ...form };

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      // Construimos mapa de errores por campo
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((iss) => {
        const key = iss.path[0] as string;
        if (!fieldErrors[key]) fieldErrors[key] = iss.message;
      });
      setErrors(fieldErrors);
      setMsg('Revisa los campos (mínimos y máximos).');
      return;
    }

    setLoading(true);
    try {
      const r = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!j.ok) {
        setMsg(j.error ?? 'Hubo un error al enviar. Intenta de nuevo.');
      } else {
        setMsg(
          '¡Gracias! Tu publicación se envió y será revisada antes de aparecer.'
        );
        setForm({ title: '', content: '', barrio: '', imagen_url: '' });
        // Opcional: volver a cargar la lista aprobada
        await load();
      }
    } catch {
      setMsg('No se pudo enviar. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  // ====== Votar (Me pasó también) ======
  async function vote(id: string) {
    // Evita votar repetido en cliente (mejora UX)
    const votedKey = `costa:voted:${id}`;
    if (localStorage.getItem(votedKey)) return;

    // Optimista: sube 1 en UI
    setFeed((prev) =>
      prev.map((s) => (s.id === id ? { ...s, score: s.score + 1 } : s))
    );
    localStorage.setItem(votedKey, '1');

    // Llama a la API: /api/vote (que usa RPC increment_score)
    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, voter: voterId }),
    });

    if (!res.ok) {
      // Revertir si falló
      setFeed((prev) =>
        prev.map((s) => (s.id === id ? { ...s, score: s.score - 1 } : s))
      );
      localStorage.removeItem(votedKey);
      const j = await res.json().catch(() => ({}));
      alert(j?.error ?? 'No se pudo registrar tu voto.');
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-4">
      {/* Tabs */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setTab('RUMOR')}
          className={`px-3 py-2 rounded-full border ${
            tab === 'RUMOR'
              ? 'bg-emerald-700 text-white'
              : 'bg-white text-black'
          }`}
        >
          Rumor 🫢
        </button>
        <button
          onClick={() => setTab('REPORTE')}
          className={`px-3 py-2 rounded-full border ${
            tab === 'REPORTE'
              ? 'bg-emerald-700 text-white'
              : 'bg-white text-black'
          }`}
        >
          Buzón 📮
        </button>
      </div>

      {/* Formulario */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="border rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold mb-2">
            {tab === 'RUMOR' ? 'Enviar Rumor' : 'Enviar Reporte'}
          </h2>

          <label className="block text-sm mb-1">Título</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 mb-1"
            placeholder="Ej. Se dice que…"
          />
          {errors.title ? (
            <p className="text-xs text-red-600 mb-2">{errors.title}</p>
          ) : (
            <p className="text-xs text-muted-foreground mb-2">
              Mínimo 5 y máximo 80 caracteres.
            </p>
          )}

          <label className="block text-sm mb-1">Texto</label>
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 h-36 mb-1"
            placeholder="Sin nombres ni datos personales. Enfócate en situaciones."
          />
          {errors.content ? (
            <p className="text-xs text-red-600 mb-2">{errors.content}</p>
          ) : (
            <p className="text-xs text-muted-foreground mb-2">
              Mínimo 12 y máximo 400 caracteres.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">
                Barrio/Colonia (opcional)
              </label>
              <input
                value={form.barrio}
                onChange={(e) => setForm({ ...form, barrio: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
              {errors.barrio && (
                <p className="text-xs text-red-600 mt-1">{errors.barrio}</p>
              )}
            </div>
            <div>
              <label className="block text-sm mb-1">
                URL de imagen (opcional)
              </label>
              <input
                value={form.imagen_url}
                onChange={(e) =>
                  setForm({ ...form, imagen_url: e.target.value })
                }
                className="w-full border rounded-lg px-3 py-2"
                placeholder="https://…"
              />
              {errors.imagen_url && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.imagen_url}
                </p>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-3 mb-3">
            Reglas: sin nombres, teléfonos, matrículas, amenazas ni insultos. Todo pasa por revisión.
          </p>

          {msg && (
            <div className="text-sm mb-2 text-emerald-700">{msg}</div>
          )}

          <button
            onClick={submit}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-emerald-700 text-white disabled:opacity-60"
          >
            {loading ? 'Enviando…' : 'Enviar'}
          </button>
        </div>

        {/* Feed */}
        <div>
          <h3 className="font-semibold mb-2">Lo más reciente (aprobado)</h3>
          <div className="space-y-3">
            {feed.map((item) => (
              <article
                key={item.id}
                className="border rounded-xl p-3 shadow-sm"
              >
                <div className="text-[11px] text-muted-foreground mb-1">
                  {new Date(item.created_at).toLocaleString()} · {item.category}
                </div>
                <h4 className="font-semibold">{item.title}</h4>
                <p className="text-sm mt-1 mb-2">{item.content}</p>
                {item.barrio && (
                  <div className="text-xs opacity-70">📍 {item.barrio}</div>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => vote(item.id)}
                    className="text-sm px-2 py-1 rounded-md border hover:bg-gray-50"
                    aria-label="Me pasó también"
                  >
                    Me pasó también 👍
                  </button>
                  <span className="text-sm opacity-80">
                    {item.score} {item.score === 1 ? 'voto' : 'votos'}
                  </span>
                </div>
              </article>
            ))}
            {feed.length === 0 && (
              <p className="text-sm opacity-70">Aún no hay publicaciones aprobadas.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
