'use client';
import { useEffect, useState } from 'react';

export default function Admin() {
  const [key, setKey] = useState('');
  const [pending, setPending] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const r = await fetch('/api/list-pending', { headers: { 'x-admin-key': key }});
    const j = await r.json();
    if (j.ok) setPending(j.data); else setError(j.error || 'Error');
  }

  async function act(id: string, action: 'approve'|'reject'|'delete') {
    const reason = action==='reject' ? prompt('Motivo de rechazo? (opcional)') || undefined : undefined;
    const r = await fetch('/api/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
      body: JSON.stringify({ id, action, reason })
    });
    const j = await r.json();
    if (!j.ok) alert(j.error || 'Error');
    await load();
  }

  useEffect(() => { load(); }, []);

  return (
    <main className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Moderación</h1>
      <input value={key} onChange={e=>setKey(e.target.value)} className="border p-2 rounded w-full mb-3" placeholder="Admin key"/>
      <button onClick={load} className="px-4 py-2 bg-black text-white rounded">Actualizar</button>

      {error && <p className="mt-2 text-red-600">{error}</p>}
      <ul className="mt-4 space-y-3">
        {pending.map(item => (
          <li key={item.id} className="border p-3 rounded">
            <div className="text-xs text-gray-500">{new Date(item.created_at).toLocaleString()}</div>
            <div className="text-[10px] uppercase tracking-wide">{item.category}</div>
            <h3 className="font-semibold">{item.title}</h3>
            <p className="text-sm whitespace-pre-wrap">{item.content}</p>
            <div className="flex gap-2 mt-2">
              <button onClick={()=>act(item.id,'approve')} className="px-3 py-1 bg-green-700 text-white rounded">Aprobar</button>
              <button onClick={()=>act(item.id,'reject')} className="px-3 py-1 bg-yellow-600 text-white rounded">Rechazar</button>
              <button onClick={()=>act(item.id,'delete')} className="px-3 py-1 bg-red-700 text-white rounded">Eliminar</button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
