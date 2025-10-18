export const metadata = {
  title: "Acerca — Costachisme",
  description: "Qué es Costachisme y cómo funciona",
};

export default function AcercaPage() {
  return (
    <section className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Acerca</h1>
      <p className="text-gray-700">
        Costachisme es un chismógrafo urbano con propósito: humor ligero y buzón
        ciudadano anónimo y moderado. Queremos visibilizar situaciones sin
        afectar a personas.
      </p>

      <ul className="list-disc pl-5 space-y-1 text-gray-700">
        <li>Publicaciones anónimas y moderadas antes de mostrarse.</li>
        <li>Prohibidos insultos, difamación y datos personales.</li>
        <li>Los votos ayudan a priorizar lo más relevante.</li>
      </ul>

      <p className="text-sm text-gray-500">
        Proyecto comunitario hecho con ❤️ en Salina Cruz.
      </p>
    </section>
  );
}
