export const metadata = {
  title: "Términos y Condiciones — Costachisme",
};

export default function TerminosPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 prose prose-emerald">
      <h1>Términos y Condiciones</h1>
      <p>
        Al utilizar Costachisme aceptas publicar de forma responsable. No se
        permite difamación, amenazas, datos personales ni incitación al odio.
      </p>
      <h2>Moderación</h2>
      <p>
        Las publicaciones son revisadas antes de mostrarse. Podemos editar o
        rechazar contenidos que violen estas reglas.
      </p>
      <h2>Responsabilidad</h2>
      <p>
        El contenido publicado es responsabilidad de quien lo envía. Este
        proyecto no garantiza la veracidad de los rumores o reportes.
      </p>
      <p className="text-sm text-gray-500">
        Documento preliminar; puede actualizarse con el tiempo.
      </p>
    </div>
  );
}
