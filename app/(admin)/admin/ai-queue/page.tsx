'use client';
import { useEffect, useState } from 'react';

type Item = {
  id: string;
  image_url: string;
  prompt: string;
};

export default function AIQueuePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [token, setToken] = useState('');

  async function load() {
    const res = await fetch('/api/ai-queue-list');
    const data = await res.json();
    setItems(data.items || []);
  }

  async function act(path: string, id: string) {
    await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'authorization': `Bearer ${token}` },
      body: JSON.stringify({ id })
    });
    await load();
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Cola de imágenes IA</h1>
      <input
        placeholder="ADMIN_QUEUE_TOKEN"
        className="border p-2 rounded w-full max-w-md"
        value={token}
        onChange={(e) => setToken(e.target.value)}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map(it => (
          <div key={it.id} className="border rounded-lg p-3 space-y-2">
            {it.image_url && (
              <img src={it.image_url} alt="preview" className="w-full rounded" />
            )}
            <div className="text-sm text-gray-600">{it.prompt}</div>
            <div className="flex gap-2">
              <button onClick={() => act('/api/ai-image/approve', it.id)} className="px-3 py-1 rounded bg-green-600 text-white">Aprobar</button>
              <button onClick={() => act('/api/ai-image/reject', it.id)} className="px-3 py-1 rounded bg-red-600 text-white">Rechazar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
