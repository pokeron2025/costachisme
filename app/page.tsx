'use client';

import { useState } from 'react';

export default function Home() {
  // Estado local para pruebas (sin base de datos todavía)
  const [form, setForm] = useState({ title: '', content: '', barrio: '', imagen_url: '' });
  const [feed, setFeed] = useState<any[]>([
    { id: 1, title: 'Ejemplo de rumor', content: 'Este es un rumor de prueba', barrio: 'Centro', votos: 5 },
    { id: 2, title: 'Otro rumor', content: 'Otro texto de ejemplo', barrio: 'Colonia Norte', votos: 2 },
  ]);
  const [msg, setMsg] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.title.length < 5 || form.content.length < 12) {
      setMsg('⚠️ Revisa los campos: el título mínimo 5 caracteres y el texto mínimo 12.');
      return;
    }

    // Simulación: agregar rumor al feed
    const nuevo = {
      id: Date.now(),
      title: form.title,
      content: form.content,
      barrio: form.barrio,
      votos: 0,
    };
    setFeed([nuevo, ...feed]);
    setForm({ title: '', content: '', barrio: '', imagen_url: '' });
    setMsg('✅ Rumor enviado (modo demo, no guardado en BD).');
  };

  const handleVote = (id: number) => {
    setFeed(feed.map(item => item.id === id ? { ...item, votos: item.votos + 1 } : item));
  };

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="text-3xl font-bold text-center mb-6 text-[#2f7f6d]">Lo más reciente (aprobado)</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Formulario */}
        <form onSubmit={handleSubmit} className="bg-white shadow p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Enviar Rumor</h2>

          <input
            name="title"
            placeholder="Ej. Se dice que..."
            value={form.title}
            onChange={handleChange}
            className="w-full border p-2 rounded mb-2"
          />
          <p className="text-xs text-gray-500 mb-2">Mínimo 5 y máximo 80 caracteres.</p>

          <textarea
            name="content"
            placeholder="Sin nombres ni datos personales. Enfócate en situaciones."
            value={form.content}
            onChange={handleChange}
            className="w-full border p-2 rounded mb-2"
          />
          <p className="text-xs text-gray-500 mb-2">Mínimo 12 y máximo 400 caracteres.</p>

          <input
            name="barrio"
            placeholder="Barrio/Colonia (opcional)"
            value={form.barrio}
            onChange={handleChange}
            className="w-full border p-2 rounded mb-2"
          />

          <input
            name="imagen_url"
            placeholder="URL de imagen (opcional)"
            value={form.imagen_url}
            onChange={handleChange}
            className="w-full border p-2 rounded mb-4"
          />

          {msg && <p className="text-sm text-red-500 mb-2">{msg}</p>}
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">
            Enviar
          </button>
        </form>

        {/* Feed de rumores */}
        <div className="space-y-4">
          {feed.map(item => (
            <div key={item.id} className="bg-white shadow p-4 rounded-lg">
              <h3 className="font-bold">{item.title}</h3>
              <p className="text-sm text-gray-600 mb-2">{item.content}</p>
              {item.barrio && (
                <p className="text-xs text-gray-500">📍 {item.barrio}</p>
              )}
              <div className="flex items-center mt-2 space-x-2">
                <span>👍 {item.votos} votos</span>
                <button
                  type="button"
                  onClick={() => handleVote(item.id)}
                  className="text-xs bg-yellow-200 px-2 py-1 rounded"
                >
                  ¡Me gusta!
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
