'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';

// Esquema de validación del formulario
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

type Item = {
  id: string;
  title: string;
  content: string;
  barrio?: string | null;
  imagen_url?: string | null;
  category: 'RUMOR' | 'REPORTE';
  created_at: string;
  score?: number | null;
};

export default function Home() {
  const [tab, setTab] = useState<'RUMOR' | 'REPORTE'>('RUMOR');
  const [loading, setLoading] = useState(false);
  const [feed, setFeed] = useState<Item[]>([]);
  const [form, setForm] = useState({ title: '', content: '', barrio: '', imagen_url: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [voted, setVoted] = useState<Record<string, true>>({}); // ids ya votados en este navegador

  // Asegura un device_id por navegador (para RPC)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!localStorage.getItem('device_id')) {
        localStorage.setItem('device_id', crypto.randomUUID());
      }
      // Carga ids votados previamente
      const raw = localStorage.getItem('voted_ids');
      if (raw) {
        try {
          const arr: string[] = JSON.parse(raw);
          const map: Record<string, true> = {};
          arr.forEach(id => (map[id] = true));
          setVoted(map);
        } catch {}
      }
    }
  }, []);

  // Carga de publicaciones aprobadas
  async function load() {
    try {
      const r = await fetch('/api/list');
      const j = await r.json();
      if (j.ok) setFeed(j.data as Item[]);
    } catch (e) {
      console.error(e);
    }
  }
  useEffect(() => { load(); }, []);

  // Enviar formulario
  async function submit() {
    setMsg(null);
    const parsed = schema.safeParse({ ...form, category: tab });
    if (!parsed.success) {
      setMsg(parsed.error.errors.map(e => e.message).join(' · '));
      return;
    }
    setLoading(true);
    try {
      const r = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, category: tab }),
      });
      const j = await r.json();
      if (!j.ok) {
        setMsg(j.error || 'No se pudo enviar. Intenta de nuevo.');
      } else {
        setMsg('✅ ¡Enviado para revisión!');
        setForm({ title: '', content: '', barrio: '', imagen_url: '' });
        load(); // recarga la lista
      }
    } catch (e: any) {
      setMsg(e?.message || 'Error de red.');
    } finally {
      setLoading(false);
    }
  }

  // Votar (optimista + evita duplicados)
  async function handleVote(id: string) {
    // si ya votó este navegador, no permitir
    if (voted[id]) return;

    const voter = (typeof window !== 'undefined' && localStorage.getItem('device_id')) || 'anon';

    // 1) Actualización optimista en UI
    setFeed(prev =>
      prev.map(item =>
        item.id === id ? { ...item, score: (item.score ?? 0) + 1 } : item
      )
    );
    setVoted(prev => ({ ...prev, [id]: true }));

    // Persistir ids votados
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('voted_ids');
      const arr: string[] = raw ? (() => { try { return JSON.parse(raw); } catch { return []; } })() : [];
      if (!arr.includes(id)) {
        localStorage.setItem('voted_ids', JSON.stringify([...arr, id]));
      }
    }

    // 2) Llamada al servidor
    try {
      const r = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, voter }),
      });
      const j = await r.json();
      if (!j.ok) {
        // rollback si hay error
        setFeed(prev =>
          prev.map(item =>
            item.id === id ? { ...item, score: Math.max((item.score ?? 1) - 1, 0) } : item
          )
        );
        setVoted(prev => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });
        if (typeof window !== 'undefined') {
          const raw2 = localStorage.getItem('voted_ids');
          if (raw2) {
            try {
              const arr2: string[] = JSON.parse(raw2).filter(x => x !== id);
              localStorage.setItem('voted_ids', JSON.stringify(arr2));
            } catch {}
          }
        }
        alert(j.error || 'No se pudo registrar tu voto.');
      }
    } catch (e) {
      // rollback por error de red
      setFeed(prev =>
        prev.map(item =>
          item.id === id ? { ...item, score: Math.max((item.score ?? 1) - 1, 0) } : item
        )
      );
      setVoted(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      if (typeof window !== 'undefined') {
        const raw2 = localStorage.getItem('voted_ids');
        if (raw2) {
          try {
            const arr2: string[] = JSON.parse(raw2).filter(x => x !== id);
            localStorage.setItem('voted_ids', JSON.stringify(arr2));
          } catch {}
        }
      }
      alert('Error de red al votar.');
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
              <div className="mt-2 flex items-center gap-3">
                <button
                  onClick={() => handleVote(item.id)}
                  disabled={!!voted[item.id]}
                  className={`px-2 py-1 rounded text-sm ${
                    voted[item.id] ? 'bg-gray-300 text-gray-700 cursor-not-allowed' : 'bg-blue-500 text-white'
                  }`}
                  title={voted[item.id] ? 'Ya votaste' : 'Me pasó también'}
                >
                  {voted[item.id] ? '¡Gracias! 👍' : 'Me pasó también 👍'}
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
