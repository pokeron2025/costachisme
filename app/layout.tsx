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
    icon: "/logo-icon.svg",
    shortcut: "/logo-icon.svg",
    apple: "/logo-icon.svg",
  },
};

/** Script inline: oculta/mostrar + shrink del header en scroll */
function HeaderScrollScript() {
  const code = `
    (function(){
      var header, lastY = 0;
      function onScroll(){
        var y = window.scrollY || 0;
        if (!header) return;
        // Sombra + "shrink"
        if (y > 8) header.classList.add('is-scrolled'); else header.classList.remove('is-scrolled');
        // Ocultar al bajar, mostrar al subir
        if (y > lastY && y > 80) header.classList.add('header-hidden');
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
      <body className="min-h-screen bg-white text-[#111827]">
        {/* Script que controla el header en scroll */}
        <HeaderScrollScript />

        {/* HEADER fijo */}
        <header
          id="site-header"
          className="
            fixed top-0 inset-x-0 z-50
            bg-[#2f7f72]/95 text-white
            backdrop-blur supports-[backdrop-filter]:bg-[#2f7f72]/80
            transition-transform duration-300
          "
        >
          <div className="inner mx-auto max-w-6xl px-4 flex items-center gap-3">
            <Link href="/" className="brand flex items-center gap-3 no-underline">
              
              <div className="leading-tight">
                <p className="brand-title font-medium tracking-wide">Salina Cruz</p>
                <p className="brand-sub opacity-80">Rumores, risas y voz ciudadana</p>
              </div>
            </Link>

            <nav className="ml-auto flex items-center gap-1 sm:gap-3 text-[14px]">
              <Link href="/" className="px-3 py-1 rounded hover:bg-white/10 transition">Inicio</Link>
              <Link href="/contacto" className="px-3 py-1 rounded hover:bg-white/10 transition">Contacto</Link>
              <Link href="/acerca" className="px-3 py-1 rounded hover:bg-white/10 transition">Acerca</Link>
            </nav>
          </div>
        </header>

        {/* CONTENIDO (dejamos espacio para el header) */}
        <main className="mx-auto max-w-6xl p-4 pt-20">{children}</main>

        {/* FOOTER */}
        <footer className="mt-10 border-t">
          <div className="mx-auto max-w-6xl text-center text-sm text-gray-600 p-6">
            Costachisme © {new Date().getFullYear()} · Hecho con <span className="mx-1">❤️</span> en Salina Cruz
          </div>
        </footer>
      </body>
    </html>
  );
}
