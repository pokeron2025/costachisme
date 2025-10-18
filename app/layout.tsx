import "./globals.css";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import React from "react";

export const metadata: Metadata = {
  title: "Costachisme — Rumores, risas y voz ciudadana",
  description:
    "Chismógrafo urbano con propósito: entretenimiento y buzón ciudadano.",
  icons: {
    // Usa tu favicon cuadrado (el “CCH” o el abstracto)
    icon: "/logo-icon.svg",
    shortcut: "/logo-icon.svg",
    apple: "/logo-icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-white text-[#111827]">
        {/* HEADER */}
        <header className="sticky top-0 z-40 bg-[#2f7f72]/95 backdrop-blur supports-[backdrop-filter]:bg-[#2f7f72]/80 text-white shadow">
          <div className="mx-auto max-w-5xl flex items-center gap-3 p-3">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/logo.svg"
                alt="Costachisme"
                width={36}
                height={36}
                className="rounded"
                priority
              />
              <div className="leading-tight">
                <p className="text-sm tracking-wide">Salinacruz</p>
                <p className="text-[12px] opacity-80">
                  Rumores, risas y voz ciudadana
                </p>
              </div>
            </Link>

            {/* Navegación (enlaces placeholder hasta crear las páginas) */}
            <nav className="ml-auto flex items-center gap-3 text-[14px]">
  <Link href="/" className="px-3 py-1 rounded hover:bg-white/10 transition">Inicio</Link>
  <Link href="/contacto" className="px-3 py-1 rounded hover:bg-white/10 transition">Contacto</Link>
  <Link href="/acerca" className="px-3 py-1 rounded hover:bg-white/10 transition">Acerca</Link>
</nav>
              
          </div>
        </header>

        {/* CONTENIDO */}
        <main className="mx-auto max-w-5xl p-4">{children}</main>

        {/* FOOTER */}
        <footer className="mt-10 border-t">
          <div className="mx-auto max-w-5xl text-center text-sm text-gray-600 p-6">
            Costachisme © 2025 · Hecho con <span className="mx-1">❤️</span> en
            Salina Cruz
          </div>
        </footer>
      </body>
    </html>
  );
}
