import "./globals.css";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import React from "react";

export const metadata: Metadata = {
  title: "Costachisme — Rumores, risas y voz ciudadana",
  description: "Chismógrafo urbano con propósito: entretenimiento y buzón ciudadano.",
  icons: {
    icon: "/logo-icon.svg",
    shortcut: "/logo-icon.svg",
    apple: "/logo-icon.svg",
  },
};

// Pequeño script inline: activa .theme-night de 18:00 a 05:59 y revisa cada 5 min
function TimeThemeScript() {
  const code = `
  (function(){
    function isNight(h){ return h >= 18 || h < 6; }
    function apply(){
      try {
        var h = new Date().getHours();
        var root = document.documentElement;
        if (isNight(h)) root.classList.add('theme-night'); else root.classList.remove('theme-night');
      } catch(e){}
    }
    apply();
    setInterval(apply, 5 * 60 * 1000);
  })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
        {/* Tema por hora (día/noche) */}
        <TimeThemeScript />

        {/* HEADER fijo */}
        <header className="sticky top-0 z-40 bg-[color:var(--header-bg)]/95 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--header-bg)]/85 text-[color:var(--header-fg)] shadow">
          <div className="mx-auto max-w-6xl flex items-center gap-3 p-3">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/logo.svg"        // si prefieres PNG: /logo.png
                alt="Costachisme"
                width={36}
                height={36}
                className="rounded"
                priority
              />
              <div className="leading-tight">
                <p className="text-sm tracking-wide">Salina Cruz</p>
                <p className="text-[12px] opacity-80">Rumores, risas y voz ciudadana</p>
              </div>
            </Link>

            {/* Navegación */}
            <nav className="ml-auto flex items-center gap-1 sm:gap-3 text-[14px]">
              <Link href="/" className="px-3 py-1 rounded hover:bg-white/10 transition">
                Inicio
              </Link>
              <Link href="/contacto" className="px-3 py-1 rounded hover:bg-white/10 transition">
                Contacto
              </Link>
              <Link href="/acerca" className="px-3 py-1 rounded hover:bg-white/10 transition">
                Acerca
              </Link>
            </nav>
          </div>
        </header>

        {/* CONTENIDO (padding-top para no quedar debajo del header) */}
        <main className="mx-auto max-w-6xl p-4 pt-4">{children}</main>

        {/* FOOTER */}
        <footer className="mt-10 border-t border-[var(--border)]">
          <div className="mx-auto max-w-6xl text-center text-sm text-[color:var(--muted-fg)] p-6">
            Costachisme © {new Date().getFullYear()} · Hecho con <span className="mx-1">❤️</span> en Salina Cruz
          </div>
        </footer>
      </body>
    </html>
  );
}
