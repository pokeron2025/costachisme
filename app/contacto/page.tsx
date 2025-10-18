export const metadata = {
  title: "Contacto — Costachisme",
  description: "Formas de contacto con Costachisme",
};

export default function ContactoPage() {
  return (
    <section className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Contacto</h1>
      <p className="text-gray-700">
        ¿Tienes dudas, sugerencias o quieres colaborar?
      </p>

      <div className="rounded-lg border p-4 space-y-2">
        <p>
          ✉️ <a className="underline" href="mailto:hola@costachisme.com">hola@costachisme.com</a>
        </p>
        <p>
          🐦 X/Twitter:{" "}
          <a className="underline" href="https://x.com" target="_blank"> @costachisme</a>
        </p>
        <p>
          📸 Instagram:{" "}
          <a className="underline" href="https://instagram.com" target="_blank">@costachisme</a>
        </p>
      </div>

      <p className="text-sm text-gray-500">
        No compartas datos personales sensibles. Toda comunicación es moderada.
      </p>
    </section>
  );
}
