// app/contacto/page.tsx
export default function ContactoPage() {
  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-extrabold tracking-tight mb-3">Contacto</h1>

      <p className="text-muted-foreground mb-2">
        Si deseas ponerte en contacto con el equipo de <strong>Costachisme</strong>, escríbenos:
      </p>

      <p className="mb-6">
        📧{" "}
        <a href="mailto:contacto@costachisme.com" className="text-blue-600 underline">
          contacto@costachisme.com
        </a>
      </p>

      <div className="rounded-lg border p-4 bg-card">
        <p className="text-sm text-muted-foreground">
          También puedes sugerir mejoras o reportar fallos desde el buzón.
        </p>
      </div>
    </div>
  );
}
