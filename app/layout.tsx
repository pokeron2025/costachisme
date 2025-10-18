// app/layout.tsx
import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Costachisme",
  description: "Rumores, risas y voz ciudadana",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen flex flex-col bg-white text-gray-900">
        {/* Contenido principal */}
        <main className="flex-grow">{children}</main>

        {/* Footer */}
        <footer className="bg-gray-100 border-t mt-10">
          <div className="max-w-4xl mx-auto py-6 px-4 flex flex-col md:flex-row justify-between items-center text-sm text-gray-600">
            <p className="mb-2 md:mb-0">
              Costachisme © 2025 · Hecho con ❤ en Salina Cruz
            </p>
            <nav className="flex space-x-4">
              <Link href="/contacto" className="hover:text-gray-900">
                Contacto
              </Link>
              <Link href="/aviso-privacidad" className="hover:text-gray-900">
                Aviso de Privacidad
              </Link>
              <Link href="/terminos" className="hover:text-gray-900">
                Términos
              </Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
