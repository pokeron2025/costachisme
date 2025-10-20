import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import React from "react";
import NavLink from "./components/NavLink";

/** ===== Metadata (SEO / OpenGraph / Twitter) ===== */
export const metadata: Metadata = {
  title: "Costachisme – Rumores locales de Salina Cruz",
  description: "Comparte y descubre chismes y reportes por barrio, de forma anónima.",
  metadataBase: new URL("https://costachisme.com"),
  openGraph: {
    title: "Costachisme",
    description: "Rumores y reportes por barrio, anónimos.",
    url: "https://costachisme.com",
    siteName: "Costachisme",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Costachisme" }],
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Costachisme",
    description: "Rumores y reportes por barrio, anónimos.",
    images: ["/og.png"],
  },
  icons: { icon: "/favicon.ico" },
};

/** ===== Script inline: oculta/muestra + shrink del header al hacer scroll ===== */
function HeaderScrollScript() {
  const code = `
    (function(){
      var header, lastY = 0;
      function onScroll(){
        var y = window.scrollY || 0;
        if (!header) return;

        // Sombra + "shrink"
        if (y > 8) header.classList.add('is-scrolled');
        else header.classList.remove('is-scrolled');

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

/** ===== Root layout ===== */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-white text-[#111827]">
        {/* Script que controla el header en scroll */}
        <HeaderScrollScript />

        {/* HEADER fijo (sin logo) */}
        <header
          id="site-header"
          className="
            fixed top-0 inset-x-0 z-50
            bg-[#2f7f72]/95 text-white
            backdrop-blur supports-[backdrop-filter]:bg-[#2f7f72]/80
            transition-transform duration-300
          "
        >
          <div className="inner mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
            <Link href="/" className="no-underline">
              <div className="leading-tight">
                <p className="brand-title font-medium tracking-wide">Salina Cruz</p>
                <p className="brand-sub opacity-80 text-sm">Rumores, risas y voz ciudadana</p>
              </div>
            </Link>

            <nav className="ml-auto flex gap-3 text-sm font-medium">
              <NavLink href="/">Inicio</NavLink>
              <NavLink href="/acerca">Acerca de</NavLink>
              <NavLink href="/contacto">Contacto</NavLink>
            </nav>
          </div>
        </header>

        {/* CONTENIDO (dejamos espacio superior para el header) */}
        <main className="mx-auto max-w-6xl px-4 pt-20">{children}</main>

        {/* FOOTER simple */}
        <footer className="mt-10 border-t">
          <div className="mx-auto max-w-6xl text-center text-sm text-gray-600 p-6">
            Costachisme © {new Date().getFullYear()} · Hecho con <span className="mx-1">❤️</span> en Salina Cruz
          </div>
        </footer>
      </body>
    </html>
  );
}