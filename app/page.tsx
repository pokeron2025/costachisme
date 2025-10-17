'use client';
import { useEffect, useState } from 'react';
import { z } from 'zod';

const schema = z.object({
  category: z.enum(['RUMOR','REPORTE']),
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

  // Generar un ID único por navegador (para evitar votos repetidos)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!localStorage.getItem('device_id')) {
        localStorage.setItem('device_id', crypto.randomUUID());
      }
    }
  }, []);

  async function load() {
    const r = await fetch('/api/list');
    const j = await r.json();
    if (j.ok) setFeed(j.data);
  }

  useEffect(() => { load(); }, []);

  async function submit() {
    setMsg(null);
    const parsed = schema.safeParse({ ...form, category: tab });
    if (!parsed.success) {
      setMsg(parsed.error.errors.map(e => e.message).join(', '));
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
      setMsg('¡Enviado para revisión!');
      setForm({ title: '', content: '', barrio: '', imagen_url: '' });
      load();
    }
  }

  async function handleVote(id: string) {
    const voter = (typeof window !== 'undefined' && localStorage.getItem('device_id')) || 'anon';
    const r = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, voter }),
    });
    const j = await r.json();
    if (j.ok) {
      setFeed(feed.map(item =>
        item.id === id ? { ...item, score: (item.score ?? 0) + 1 } : item
      ));
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="text-3xl font-bold mb-4">🚀 Hola desde Tailwind!</h1>

      <div className="flex gap-2 mb-4">
        <button
          className={`px-4 py-2 rounded ${tab==='RUMOR'?'bg-green-600 text-white':'bg-gray-200'}`}
          onClick={() => setTab('RUMOR')}
        >
          Rumor 🫢
        </button>
        <button
          className={`px-4 py-2 rounded ${tab==='REPORTE'?'bg-green-600 text-white':'bg-gray-200'}`}
          onClick={() => setTab('REPORTE')}
        >
          Buzón 📬
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Formulario */}
        <div className="p-4 border rounded shadow">
          <h2 className="text-lg font-semibold mb-2">Enviar {tab==='RUMOR'?'Rumor':'Reporte'}</h2>
          <input
            className="border p-2 mb-2 w-full"
            placeholder="Ej. Se dice que..."
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
          />
          <textarea
            className="border p-2 mb-2 w-full"
            rows={4}
            placeholder="Sin nombres ni datos personales. Enfócate en situaciones."
            value={form.content}
            onChange={e => setForm({ ...form, content: e.target.value })}
          />
          <input
            className="border p-2 mb-2 w-full"
            placeholder="Barrio/Colonia (opcional)"
            value={form.barrio}
            onChange={e => setForm({ ...form, barrio: e.target.value })}
          />
          <input
            className="border p-2 mb-2 w-full"
            placeholder="URL de imagen (opcional)"
            value={form.imagen_url}
            onChange={e => setForm({ ...form, imagen_url: e.target.value })}
          />
          <button
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded"
            onClick={submit}
          >
            {loading ? 'Enviando...' : 'Enviar'}
          </button>
          {msg && <p className="mt-2 text-sm text-red-600">{msg}</p>}
        </div>

        {/* Feed */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Lo más reciente (aprobado)</h2>
          {feed.map(item => (
            <div key={item.id} className="p-3 mb-3 border rounded shadow-sm">
              <p className="text-xs text-gray-500">
                {new Date(item.created_at).toLocaleString()}
              </p>
              <h3 className="font-bold">{item.title}</h3>
              <p>{item.content}</p>
              {item.barrio && <p className="text-sm">📍 {item.barrio}</p>}
              {item.imagen_url && (
                <img
                  src={item.imagen_url}
                  alt="imagen"
                  className="mt-2 rounded max-h-48"
                />
              )}
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => handleVote(item.id)}
                  className="px-2 py-1 bg-blue-500 text-white rounded text-sm"
                >
                  Me pasó también 👍
                </button>
                <span className="text-sm text-gray-700">
                  {item.score ?? 0} votos
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
