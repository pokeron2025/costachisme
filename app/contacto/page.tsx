"use client";

import { useState } from "react";

export default function ContactoPage() {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [info, setInfo] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // ⚠️ Cambia este correo por el tuyo
    const destino = "hola@costachisme.com";

    const subject = `Contacto desde Costachisme — ${nombre || "Sin nombre"}`;
    const body =
      `Nombre: ${nombre}\n` +
      `Correo: ${correo}\n\n` +
      `Mensaje:\n${mensaje}\n`;

    const url = `mailto:${destino}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    // Intenta abrir el cliente de correo
    window.location.href = url;
    setInfo(
      "Si no se abrió tu app de correo, copia y pega este email: " + destino
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight mb-2">Contacto</h1>
      <p className="text-gray-600 mb-8">
        ¿Tienes dudas, sugerencias o quieres colaborar? Escríbenos.
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border shadow-sm p-6 space-y-4"
      >
        <div>
          <label className="block text-sm font-medium mb-1">Nombre</label>
          <input
            className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Correo</label>
          <input
            type="email"
            className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="tunombre@correo.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Mensaje</label>
          <textarea
            className="w-full min-h-[140px] rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Cuéntanos en qué podemos ayudarte…"
            required
          />
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-2 bg-emerald-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-emerald-700 transition"
        >
          Enviar
          <span aria-hidden>✉️</span>
        </button>

        {info && (
          <p className="text-sm text-gray-500 pt-2 border-t">{info}</p>
        )}
      </form>
    </div>
  );
}
