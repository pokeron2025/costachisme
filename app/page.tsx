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

  async function load() {
    const r = await fetch('/api/list');
    const j = await r.json();
    if (j.ok) setFeed(j.data);
  }

  useEffect(() => { load(); }, []);

  async function submit() {
    setMsg(null);
    try {
      const parsed = schema.parse({ ...form, category: tab });
      setLoading(true);
      const r = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...parsed, category: tab }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setMsg('Enviado con éxito 🎉');
      setForm({ title: '', content: '', barrio: '', imagen_url: '' });
      load();
    } catch (e: any) {
      setMsg(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function votar(id: string) {
    try {
      const voter = localStorage.getItem(`voted_${id}`);
      if (voter) {
        setMsg('Ya votaste este rumor/reporte 👍');
        return;
      }
      const r = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, voter: 'anon' }),
      });
      const j = await r.json();
      if (j.ok) {
        localStorage.setItem(`voted_${id}`, 'true');
        load();
      } else {
        setMsg(j.error || 'Error al votar');
      }
    } catch (e) {
      setMsg('Error al conectar con el servidor');
    }
  }

  return (
    <main className="max-w-5xl mx-auto p-4">
      {/* Encabezado moderno */}
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 bg-clip-text text-transparent drop-shadow-sm">
        Costachisme
      </h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('RUMOR')}
          className={`px-4 py-2 rounded-full font-semibold ${tab === 'RUMOR' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
        >
          Rumor 🤭
        </button>
        <button
          onClick={() => setTab('REPORTE')}
          className={`px-4 py-2 rounded-full font-semibold ${tab === 'REPORTE' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Buzón 📬
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Formulario */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="text-lg font-semibold mb-2">Enviar {tab === 'RUMOR' ? 'Rumor' : 'Reporte'}</h2>
          <input
            type="text"
            placeholder="Ej. Se dice que..."
            className="border rounded w-full p-2 mb-2"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <p className="text-xs text-gray-500 mb-2">Mínimo 5 y máximo 80 caracteres.</p>

          <textarea
            placeholder="Sin nombres ni datos personales. Enfócate en situaciones."
            className="border rounded w-full p-2 mb-2"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
          />
          <p className="text-xs text-gray-500 mb-2">Mínimo 12 y máximo 400 caracteres.</p>

          <input
            type="text"
            placeholder="Barrio/Colonia (opcional)"
            className="border rounded w-full p-2 mb-2"
            value={form.barrio}
            onChange={(e) => setForm({ ...form, barrio: e.target.value })}
          />

          <input
            type="url"
            placeholder="URL de imagen (opcional)"
            className="border rounded w-full p-2 mb-2"
            value={form.imagen_url}
            onChange={(e) => setForm({ ...form, imagen_url: e.target.value })}
          />

          <button
            onClick={submit}
            disabled={loading}
            className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800"
          >
            {loading ? 'Enviando...' : 'Enviar'}
          </button>

          {msg && <p className="mt-2 text-sm text-gray-700">{msg}</p>}
        </div>

        {/* Feed */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Lo más reciente (aprobado)</h2>
          {feed.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow p-4 mb-3">
              <p className="text-xs text-gray-500 mb-1">
                {new Date(item.created_at).toLocaleString('es-MX')}
              </p>
              <p className="font-bold">{item.title}</p>
              <p className="text-gray-700 mb-2">{item.content}</p>
              {item.barrio && <p className="text-sm text-gray-500">📍 {item.barrio}</p>}
              <p className="text-sm">👍 {item.score} votos</p>
              <button
                onClick={() => votar(item.id)}
                disabled={!!localStorage.getItem(`voted_${item.id}`)}
                className="mt-2 text-xs px-2 py-1 rounded border border-gray-300 bg-gray-50 hover:bg-yellow-200 disabled:opacity-50"
              >
                {localStorage.getItem(`voted_${item.id}`) ? '¡Gracias! 👍' : 'Me gusta 👍'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
