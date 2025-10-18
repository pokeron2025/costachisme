export default function ContactoPage() {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Contacto</h1>
      <p className="mb-2">
        Si deseas ponerte en contacto con el equipo de <strong>Costachisme</strong>, 
        por favor usa el siguiente correo:
      </p>
      <p className="mb-4">
        📧 <a href="mailto:contacto@costachisme.com" className="text-blue-600 underline">
          contacto@costachisme.com
        </a>
      </p>
      <p>
        También puedes seguirnos en nuestras redes sociales (próximamente).
      </p>
    </div>
  );
}
