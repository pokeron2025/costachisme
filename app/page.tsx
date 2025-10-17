'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';

const schema = z.object({
  category: z.enum(['RUMOR', 'REPORTE']),
  title: z.string()
    .min(5, { message: "El título debe tener al menos 5 caracteres." })
    .max(80, { message: "El título no puede superar 80 caracteres." }),
  content: z.string()
    .min(12, { message: "El texto debe tener al menos 12 caracteres." })
    .max(400, { message: "El texto no puede superar 400 caracteres." }),
  barrio: z.string().max(60).optional(),
  imagen_url: z.string().url().optional().or(z.literal('')).transform(() => undefined),
});

export default function Home() {
  const [tab, setTab] = useState<'RUMOR' | 'REPORTE'>('RUMOR');
  const [loading, setLoading] = useState(false);
  const [feed, setFeed] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', content: '', barrio: '', imagen_url: '' });
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const r = await fetch('/api/list');
    const j = await r.json();
    if (j.ok) setFeed(j.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit() {
    setMsg(null);
    const parsed = schema.safeParse({ ...form, category: tab });
    if (!parsed.success) {
      setMsg(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const r = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, category: tab }),
    });
    const j = await r.json();
    setLoading(false);
    if (!j.ok) {
      setMsg(j.error);
    } else {
      setMsg("¡Enviado para revisión!");
      setForm({ title: '', content: '', barrio: '', imagen_url: '' });
      load();
    }
  }

  async function handleVote(id: string) {
    const r = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const j = await r.json();
    if (j.ok) {
      // Actualizar el feed localmente para que el número suba al instante
      setFeed(feed.map(item => 
        item.id === id ? { ...item, score: (item.score ?? 0) + 1 } : item
      ));
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-4">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('RUMOR')}
          className={`px-3 py-1 rounded ${tab === 'RUMOR' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
        >
          Rumor 😉
        </button>
        <button
          onClick={() => setTab('REPORTE')}
          className={`px-3 py-1 rounded ${tab === 'REPORTE' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Buzón 📨
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-bold">Enviar {tab === 'RUMOR' ? 'Rumor' : 'Reporte'}</h2>
        <input
          type="text"
          placeholder="Ej. Se dice que..."
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          className="w-full border p-2 my-2"
        />
        <textarea
          placeholder="Sin nombres ni datos personales. Enfócate en situaciones."
          value={form.content}
          onChange={e => setForm({ ...form, content: e.target.value })}
          className="w-full border p-2 my-2"
        />
        <input
          type="text"
          placeholder="Barrio/Colonia (opcional)"
          value={form.barrio}
          onChange={e => setForm({ ...form, barrio: e.target.value })}
          className="w-full border p-2 my-2"
        />
        <input
          type="text"
          placeholder="URL de imagen (opcional)"
          value={form.imagen_url}
          onChange={e => setForm({ ...form, imagen_url: e.target.value })}
          className="w-full border p-2 my-2"
        />
        <button
          onClick={submit}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          {loading ? 'Enviando...' : 'Enviar'}
        </button>
        {msg && <p className="mt-2 text-red-500">{msg}</p>}
      </div>

      <div>
        <h2 className="text-lg font-bold mb-2">Lo más reciente (aprobado)</h2>
        {feed.map(item => (
          <div key={item.id} className="border p-3 mb-3 rounded bg-white shadow">
            <div className="text-sm text-gray-500">
              {new Date(item.created_at).toLocaleString()}
            </div>
            <div className="space-y-2">
              <h2 className="font-semibold">{item.title}</h2>
              <p className="text-sm text-gray-700">{item.content}</p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => handleVote(item.id)}
                className="text-sm text-blue-600 hover:underline"
              >
                Me pasó también 👍
              </button>
              <span className="text-sm text-gray-500">
                {item.score ?? 0}
              </span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
