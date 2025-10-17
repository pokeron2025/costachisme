"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

/* ===========================
   Supabase (cliente del lado cliente)
   =========================== */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/* ===========================
   Validación con Zod (mensajes claros)
   =========================== */
const schema = z.object({
  category: z.enum(["RUMOR", "REPORTE"]),
  title: z
    .string()
    .min(5, { message: "El título debe tener al menos 5 caracteres." })
    .max(80, { message: "El título no puede superar 80 caracteres." }),
  content: z
    .string()
    .min(12, { message: "El texto debe tener al menos 12 caracteres." })
    .max(400, { message: "El texto no puede superar 400 caracteres." }),
  barrio: z.string().max(60).optional(),
  imagen_url: z
    .string()
    .url({ message: "La URL debe ser válida." })
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

/* ===========================
   Toast minimal (sin librerías)
   =========================== */
type ToastKind = "ok" | "error";
function Toast({
  open,
  kind,
  message,
  onClose,
}: {
  open: boolean;
  kind: ToastKind;
  message: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [open, onClose]);
  if (!open || !message) return null;

  return (
    <div
      className={`fixed right-4 top-4 z-50 min-w-[260px] max-w-sm rounded-xl border px-4 py-3 shadow-lg text-sm ${
        kind === "ok"
          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
          : "bg-red-50 border-red-200 text-red-700"
      }`}
      role="status"
    >
      {message}
      <button
        onClick={onClose}
        className="float-right ml-3 text-xs opacity-70 hover:opacity-100"
        aria-label="Cerrar"
      >
        ✕
      </button>
    </div>
  );
}

export default function Page() {
  /* ===========================
     Estado general
     =========================== */
  const [tab, setTab] = useState<"RUMOR" | "REPORTE">("RUMOR");
  const [form, setForm] = useState({
    title: "",
    content: "",
    barrio: "",
    imagen_url: "",
  });
  const [errs, setErrs] = useState<{
    title?: string[];
    content?: string[];
    imagen_url?: string[];
  }>({});
  const [loading, setLoading] = useState(false);

  /* Toast */
  const [toastOpen, setToastOpen] = useState(false);
  const [toastKind, setToastKind] = useState<ToastKind>("ok");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  function showToast(kind: ToastKind, msg: string) {
    setToastKind(kind);
    setToastMsg(msg);
    setToastOpen(true);
  }

  /* ===========================
     Device ID (para evitar multivoto)
     =========================== */
  const deviceId = useMemo(() => {
    if (typeof window === "undefined") return "server";
    let id = localStorage.getItem("device_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("device_id", id);
    }
    return id;
  }, []);

  /* ===========================
     Cargar feed (aprobados)
     =========================== */
  const [feed, setFeed] = useState<any[]>([]);
  async function load() {
    try {
      const r = await fetch("/api/list");
      const j = await r.json();
      if (j.ok) setFeed(j.data);
    } catch {
      // no-op
    }
  }
  useEffect(() => {
    load();
  }, []);

  /* ===========================
     Enviar publicación
     =========================== */
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrs({});
    setLoading(true);

    const payload = { category: tab, ...form };
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      const { fieldErrors } = parsed.error.flatten();
      setErrs(fieldErrors);
      setLoading(false);
      showToast("error", "Corrige los campos marcados.");
      return;
    }

    try {
      const r = await fetch("/api/submit", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      const j = await r.json();
      if (!j.ok) {
        showToast("error", j.error || "No se pudo enviar. Inténtalo más tarde.");
      } else {
        showToast("ok", "¡Enviado! Queda en revisión.");
        setForm({ title: "", content: "", barrio: "", imagen_url: "" });
      }
    } catch {
      showToast("error", "Error de conexión. Revisa tu red e inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  /* ===========================
     Votar (incrementar score con control de duplicados)
     Supabase RPC: increment_score(submission_id uuid, voter text)
     =========================== */
  async function upvote(id: string) {
    try {
      const { error } = await supabase.rpc("increment_score", {
        submission_id: id,
        voter: deviceId || "anon",
      });
      if (error) {
        showToast("error", "Ya registraste tu voto o no se pudo votar.");
        return;
      }
      showToast("ok", "¡Gracias! Se registró tu voto.");
      await load();
    } catch {
      showToast("error", "Error de conexión al votar.");
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      {/* TOAST */}
      <Toast
        open={toastOpen}
        kind={toastKind}
        message={toastMsg}
        onClose={() => setToastOpen(false)}
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setTab("RUMOR")}
          className={`px-4 py-2 rounded-xl border transition ${
            tab === "RUMOR" ? "bg-pink-600 text-white border-pink-600" : "bg-white"
          }`}
        >
          Rumor 😏
        </button>
        <button
          type="button"
          onClick={() => setTab("REPORTE")}
          className={`px-4 py-2 rounded-xl border transition ${
            tab === "REPORTE" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white"
          }`}
        >
          Buzón 📨
        </button>
      </div>

      <section className="grid md:grid-cols-2 gap-6">
        {/* FORM */}
        <form onSubmit={submit} className="border rounded-2xl p-4 shadow-sm bg-white">
          <h2 className="font-bold mb-3">Enviar {tab === "RUMOR" ? "Rumor" : "Reporte"}</h2>

          {/* Título */}
          <label className="block text-sm mb-1">Título</label>
          <input
            value={form.title}
            onChange={(e) => {
              setForm({ ...form, title: e.target.value });
              if (errs.title) setErrs((prev) => ({ ...prev, title: undefined }));
            }}
            placeholder="Ej. Se dice que..."
            className={`w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2f7f72]/40 ${
              errs.title ? "border-red-300" : ""
            }`}
          />
          {errs.title && (
            <p className="mt-1 text-xs text-red-600">{errs.title.join(" ")}</p>
          )}

          {/* Texto */}
          <label className="block text-sm mt-3 mb-1">Texto</label>
          <textarea
            value={form.content}
            onChange={(e) => {
              setForm({ ...form, content: e.target.value });
              if (errs.content) setErrs((prev) => ({ ...prev, content: undefined }));
            }}
            placeholder="Sin nombres ni datos personales. Enfócate en situaciones."
            className={`w-full rounded-xl border px-3 py-2 h-32 focus:outline-none focus:ring-2 focus:ring-[#2f7f72]/40 ${
              errs.content ? "border-red-300" : ""
            }`}
          />
          {errs.content && (
            <p className="mt-1 text-xs text-red-600">{errs.content.join(" ")}</p>
          )}

          {/* Fila: Barrio + URL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-sm mb-1">Barrio/Colonia (opcional)</label>
              <input
                value={form.barrio}
                onChange={(e) => setForm({ ...form, barrio: e.target.value })}
                className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2f7f72]/40"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">URL de imagen (opcional)</label>
              <input
                value={form.imagen_url}
                onChange={(e) => {
                  setForm({ ...form, imagen_url: e.target.value });
                  if (errs.imagen_url)
                    setErrs((prev) => ({ ...prev, imagen_url: undefined }));
                }}
                placeholder="https://..."
                className={`w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2f7f72]/40 ${
                  errs.imagen_url ? "border-red-300" : ""
                }`}
              />
              {errs.imagen_url && (
                <p className="mt-1 text-xs text-red-600">
                  {errs.imagen_url.join(" ")}
                </p>
              )}
            </div>
          </div>

          {/* Reglas */}
          <p className="text-xs text-gray-500 mt-3">
            Reglas: sin nombres, teléfonos, matrículas, amenazas ni insultos. Todo pasa por revisión.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="mt-3 px-4 py-2 rounded-xl bg-[#2f7f72] text-white hover:opacity-90 transition disabled:opacity-60"
          >
            {loading ? "Enviando..." : "Enviar"}
          </button>
        </form>

        {/* FEED */}
        <div>
          <h2 className="font-bold mb-2">Lo más reciente (aprobado)</h2>
          {!feed.length && (
            <div className="text-sm text-gray-500">
              Aún no hay publicaciones aprobadas.
            </div>
          )}
          <ul className="space-y-3">
            {feed.map((item: any) => (
              <li key={item.id} className="border rounded-xl p-3 bg-white shadow-sm">
                <div className="text-xs text-gray-500">
                  {new Date(item.created_at).toLocaleString()}
                </div>
                <div className="mt-1 mb-1">
                  <span
                    className={`px-2 py-0.5 text-[10px] rounded-full ${
                      item.category === "RUMOR"
                        ? "bg-pink-100 text-pink-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {item.category}
                  </span>
                </div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm whitespace-pre-wrap">{item.content}</p>
                {item.barrio && <div className="text-xs mt-1">🏷️ {item.barrio}</div>}
                {item.imagen_url && (
                  <img src={item.imagen_url} alt="adjunto" className="mt-2 rounded" />
                )}

                {/* Botón de voto */}
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => upvote(item.id)}
                    className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-sm hover:opacity-90 transition"
                  >
                    Me pasó también
                  </button>
                  <span className="text-sm text-gray-600">
                    • {item.score ?? 0} personas
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
