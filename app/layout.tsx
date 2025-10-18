// app/layout.tsx
import "./globals.css";
import { Poppins } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import React from "react";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata = {
  title: "Costachisme — Rumores, risas y voz ciudadana",
  description:
    "Chismógrafo urbano con propósito: entretenimiento y buzón ciudadano.",
  icons: {
    icon: "/logo-icon.svg", // tu favicon
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${poppins.className} min-h-screen bg-white text-[#111827]`}>
        {/* HEADER */}
        <header className="sticky top-0 z-30 border-b bg-[#2f7f72]/95 backdrop-blur supports-[backdrop-filter]:bg-[#2f7f72]/80">
          <div className="mx-auto max-w-5xl flex items-center gap-3 p-3 text-white">
            <Image
              src="/logo.svg"
              alt="Costachisme"
              width={40}
              height={40}
              className="rounded"
              priority
            />
            <div className="leading-tight">
              <h1 className="text-lg font-extrabold tracking-wide">Costachisme</h1>
              <p className="text-[12px] opacity-90">Rumores, risas y voz ciudadana</p>
            </div>

            {/* Espaciador */}
            <div className="flex-1" />

            {/* Nav superior opcional */}
            <nav className="hidden sm:flex items-center gap-4 text-sm">
              <Link className="hover:underline" href="/">Inicio</Link>
              <Link className="hover:underline" href="/contacto">Contacto</Link>
            </nav>
          </div>
        </header>

        {/* CONTENIDO */}
        <main className="mx-auto max-w-5xl p-4">{children}</main>

        {/* FOOTER con enlaces */}
        <footer className="mt-8 border-t">
          <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-gray-600 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <p>Costachisme © 2025 · Hecho con ❤ en Salina Cruz</p>
            <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link className="hover:underline" href="/contacto">
                Contacto
              </Link>
              <Link className="hover:underline" href="/aviso-privacidad">
                Aviso de Privacidad
              </Link>
              <Link className="hover:underline" href="/terminos">
                Términos y Condiciones
              </Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
