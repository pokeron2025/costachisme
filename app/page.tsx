'use client';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// 🔑 Conexión a Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 📋 Validaciones
const schema = z.object({
  category: z.enum(['RUMOR', 'REPORTE']),
  title: z
    .string()
    .min(5, { message: "El título debe tener al menos 5 caracteres." })
    .max(80, { message: "El título no puede superar 80 caracteres." }),
  content: z
    .string()
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

  // 🔄 Cargar publicaciones
  async function load() {
    const r = await fetch('/api/list');
    const j = await r.json();
    if (j.ok) setFeed(j.data);
  }

  useEffect(() => {
    load();
  }, []);

  // 📩 Enviar reporte/rumor
  async function submit() {
    setMsg(null);
    try {
      schema.parse({ ...form, category: tab });
    } catch (e: any) {
      setMsg(e.errors[0].message);
      return;
    }
    setLoading(true);
    const r = await fetch('/api/submit', {
      method: 'POST',
      body: JSON.stringify({ ...form, category: tab }),
    });
    const j = await r.json();
    setLoading(false);
    if (j.ok) {
      setForm({ title: '', content: '', barrio: '', imagen_url: '' });
      load();
    } else {
      setMsg('Error al enviar.');
    }
  }

  // 👍 Función para dar like (incrementar score)
  async function handleLike(id: string) {
    const { error } = await supabase.rpc('increment_score', { submission_id: id });
    if (error) {
      console.error("Error al incrementar score:", error);
    } else {
      load(); // recarga para ver el nuevo score
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">🚀 Hola desde Tailwind!</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('RUMOR')}
          className={`px-4 py-2 rounded ${tab === 'RUMOR' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
        >
          Rumor 😉
        </button>
        <button
          onClick={() => setTab('REPORTE')}
          className={`px-4 py-2 rounded ${tab === 'REPORTE' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
        >
          Buzón 📩
        </button>
      </div>

      {/* Formulario */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Título"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="border p-2 w-full mb-2"
        />
        <textarea
          placeholder="Texto"
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          className="border p-2 w-full mb-2"
        />
        <input
          type="text"
          placeholder="Barrio/Colonia (opcional)"
          value={form.barrio}
          onChange={(e) => setForm({ ...form, barrio: e.target.value })}
          className="border p-2 w-full mb-2"
        />
        <input
          type="text"
          placeholder="URL de imagen (opcional)"
          value={form.imagen_url}
          onChange={(e) => setForm({ ...form, imagen_url: e.target.value })}
          className="border p-2 w-full mb-2"
        />
        {msg && <p className="text-red-500 mb-2">{msg}</p>}
        <button
          onClick={submit}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          {loading ? 'Enviando...' : 'Enviar'}
        </button>
      </div>

      {/* Feed */}
      <h2 className="text-xl font-semibold mb-2">Lo más reciente (aprobado)</h2>
      <div className="space-y-4">
        {feed.map((item) => (
          <div key={item.id} className="border p-4 rounded shadow">
            <h3 className="font-bold">{item.title}</h3>
            <p>{item.content}</p>
            <p className="text-sm text-gray-500">{item.barrio}</p>
            {/* Botón 👍 Me gusta */}
            <button
              onClick={() => handleLike(item.id)}
              className="bg-blue-500 text-white px-2 py-1 rounded mt-2"
            >
              👍 Me gusta ({item.score ?? 0})
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
