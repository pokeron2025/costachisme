export const metadata = {
  title: "Aviso de Privacidad — Costachisme",
};

export default function AvisoPrivacidadPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 prose prose-emerald">
      <h1>Aviso de Privacidad</h1>
      <p>
        Este sitio es un proyecto ciudadano. La información publicada por las
        personas usuarias puede ser anónima y es moderada antes de mostrarse.
      </p>
      <h2>Datos que podríamos procesar</h2>
      <ul>
        <li>Títulos y textos de rumores o reportes</li>
        <li>Barrios/colonias de referencia (si se proporcionan)</li>
        <li>Votos y métricas de uso agregadas</li>
      </ul>
      <p>
        No solicitamos datos personales sensibles. Si detectas contenido con
        datos personales, avísanos en la página de{" "}
        <a href="/contacto">Contacto</a> para retirarlo.
      </p>
      <p className="text-sm text-gray-500">
        Este documento es informativo y puede actualizarse.
      </p>
    </div>
  );
}
