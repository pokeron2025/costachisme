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
  imagen_url: z.string().url().optional().or(z.literal('').transform(() => undefined)),
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
    const payload = { category: tab, ...form };
    const parsed = schema.safeParse(payload);
    if (!parsed.success) { setMsg('Revisa los campos (mínimos y máximos).'); return; }
    setLoading(true);
    const r = await fetch('/api/submit', { method: 'POST', body: JSON.stringify(parsed.data) });
    const j = await r.json();
    setLoading(false);
    if (j.ok) { setMsg('¡Enviado! Queda en revisión.'); setForm({ title: '', content: '', barrio: '', imagen_url: '' }); }
    else setMsg(j.error || 'Error');
  }

  return (
  <div>
    <h1 className="text-3xl font-bold text-red-500 mb-4">
      🚀 Hola desde Tailwind!
    </h1>

    <div className="mb-4 flex gap-2">
        <button onClick={() => setTab('RUMOR')} className={`px-3 py-2 rounded-full border ${tab==='RUMOR'?'bg-primary text-white':'bg-white'}`}>Rumor 😏</button>
        <button onClick={() => setTab('REPORTE')} className={`px-3 py-2 rounded-full border ${tab==='REPORTE'?'bg-primary text-white':'bg-white'}`}>Buzón 📨</button>
      </div>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="border rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold mb-2">Enviar {tab==='RUMOR'?'Rumor':'Reporte'}</h2>
          <label className="block text-sm mb-1">Título</label>
          <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="w-full border rounded-lg p-2 mb-2" placeholder="Ej. Se dice que..."/>

          <label className="block text-sm mb-1">Texto</label>
          <textarea value={form.content} onChange={e=>setForm({...form,content:e.target.value})} className="w-full border rounded-lg p-2 mb-2 h-32" placeholder="Sin nombres ni datos personales. Enfócate en situaciones."/>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm mb-1">Barrio/Colonia (opcional)</label>
              <input value={form.barrio} onChange={e=>setForm({...form,barrio:e.target.value})} className="w-full border rounded-lg p-2"/>
            </div>
            <div>
              <label className="block text-sm mb-1">URL de imagen (opcional)</label>
              <input value={form.imagen_url} onChange={e=>setForm({...form,imagen_url:e.target.value})} className="w-full border rounded-lg p-2" placeholder="https://..."/>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-2">Reglas: sin nombres, teléfonos, matrículas, amenazas ni insultos. Todo pasa por revisión.</p>
          <button disabled={loading} onClick={submit} className="mt-3 px-4 py-2 rounded-xl bg-primary text-white">{loading?'Enviando...':'Enviar'}</button>
          {msg && <p className="mt-2 text-sm">{msg}</p>}
        </div>

        <div>
          <h2 className="font-bold mb-2">Lo más reciente (aprobado)</h2>
          <ul className="space-y-3">
            {feed.map(item => (
              <li key={item.id} className="border rounded-xl p-3">
                <div className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</div>
                <div className="text-[10px] uppercase tracking-wide">{item.category}</div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm whitespace-pre-wrap">{item.content}</p>
                {item.barrio && <div className="text-xs mt-1">🏷️ {item.barrio}</div>}
                {item.imagen_url && <img src={item.imagen_url} alt="adjunto" className="mt-2 rounded" />}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
