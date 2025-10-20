// app/components/Footer.tsx
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t mt-12 text-sm text-gray-600">
      <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Costachisme</p>

        <nav className="flex flex-wrap gap-4">
          <Link href="/acerca" className="hover:underline">Acerca</Link>
          <Link href="/contacto" className="hover:underline">Contacto</Link>
          <Link href="/(legal)/terminos" className="hover:underline">Términos</Link>
          <a href="https://costachisme.com" className="hover:underline">Inicio</a>
        </nav>
      </div>
    </footer>
  );
}