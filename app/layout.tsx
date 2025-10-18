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

/* ===== Tema noche/día por hora (18:00–05:59) ===== */
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
      setInterval(apply, 5*60*1000);
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

/* ===== Ocultar/mostrar header según scroll (sin cambiar colores) ===== */
function HeaderScrollScript() {
  const code = `
    (function(){
      var header = null;
      var lastY = window.scrollY || 0;

      function onScroll(){
        var y = window.scrollY || 0;
        if(y > 8) header.classList.add('is-scrolled'); else header.classList.remove('is-scrolled');
        if(y > lastY && y > 60) header.classList.add('header-hidden');
        else header.classList.remove('header-hidden');
        lastY = y;
      }

      function init(){
        header = document.getElementById('site-header');
        if(!header) return;
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
      }

      if(document.readyState==='loading'){
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
        <TimeThemeScript />
        <HeaderScrollScript />

        {/* HEADER fijo (usa --header-bg y --header-fg) */}
        <header
          id="site-header"
          className="
            fixed top-0 inset-x-0 z-50
            bg-[color:var(--header-bg)]/95
            text-[color:var(--header-fg)]
            backdrop-blur supports-[backdrop-filter]:bg-[color:var(--header-bg)]/85
            transition-transform duration-300
          "
        >
          <div className="mx-auto max-w-6xl flex items-center gap-3 px-4 h-14">
            <Link href="/" className="flex items-center gap-3 no-underline">
              <Image
                src="/logo.svg"
                alt="Costachisme"
                width={28}
                height={28}
                className="rounded"
                priority
              />
              <div className="leading-tight">
                <p className="text-sm tracking-wide">Salina Cruz</p>
                <p className="text-[12px] opacity-80">Rumores, risas y voz ciudadana</p>
              </div>
            </Link>

            <nav className="ml-auto flex items-center gap-1 sm:gap-3 text-[14px]">
              <Link href="/" className="px-3 py-1 rounded hover:bg-white/10 transition">Inicio</Link>
              <Link href="/contacto" className="px-3 py-1 rounded hover:bg-white/10 transition">Contacto</Link>
              <Link href="/acerca" className="px-3 py-1 rounded hover:bg-white/10 transition">Acerca</Link>
            </nav>
          </div>
        </header>

        {/* Contenido */}
        <main className="mx-auto max-w-6xl p-4 pt-16">{children}</main>

        {/* Footer */}
        <footer className="mt-10 border-t border-[var(--border)]">
          <div className="mx-auto max-w-6xl text-center text-sm text-[color:var(--muted-fg)] p-6">
            Costachisme © {new Date().getFullYear()} · Hecho con <span className="mx-1">❤️</span> en Salina Cruz
          </div>
        </footer>
      </body>
    </html>
  );
}
