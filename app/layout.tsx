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

/* ===== Script 1: Tema noche/día por hora (18:00–05:59) ===== */
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

/* ===== Script 2: Ocultar/mostrar header al hacer scroll + contraste auto =====
   - Oculta al bajar, muestra al subir
   - Añade .is-scrolled si scrollY > 8 (para sombra/fondo sólido)
   - Detecta el color de fondo efectivo y decide texto claro/oscuro
*/
function HeaderScrollScript() {
  const code = `
    (function(){
      var header = null;
      var lastY = window.scrollY || 0;

      function rgbToY(r,g,b){ // luminancia relativa aproximada
        r/=255; g/=255; b/=255;
        return 0.2126*r + 0.7152*g + 0.0722*b;
      }

      function parseRGB(str){
        // "rgb(255, 255, 255)" o "rgba(255,255,255,0.85)"
        var m = str.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d\\.]+))?\\)/i);
        if(!m) return {r:255,g:255,b:255,a:1};
        return {r:+m[1], g:+m[2], b:+m[3], a: m[4]===undefined?1:parseFloat(m[4])};
      }

      function applyContrast(){
        try {
          var cs = getComputedStyle(header);
          var bgc = cs.backgroundColor; // ya incluye las variables/alpha resueltas
          var {r,g,b,a} = parseRGB(bgc);
          // si alpha muy baja, intenta tomar color del body como fallback
          if(a < 0.15){
            var bs = getComputedStyle(document.body);
            var bb = parseRGB(bs.backgroundColor);
            r = Math.round(r*(1-a) + bb.r*a);
            g = Math.round(g*(1-a) + bb.g*a);
            b = Math.round(b*(1-a) + bb.b*a);
          }
          var y = rgbToY(r,g,b);
          // y<0.5 => fondo oscuro => texto claro; y>=0.5 => fondo claro => texto oscuro
          header.classList.remove('header-darktext','header-lighttext');
          if(y < 0.5) header.classList.add('header-lighttext');
          else header.classList.add('header-darktext');
        } catch(e){}
      }

      function onScroll(){
        var y = window.scrollY || 0;
        if(y > 8) header.classList.add('is-scrolled'); else header.classList.remove('is-scrolled');
        // ocultar al bajar, mostrar al subir
        if(y > lastY && y > 60) {
          header.classList.add('header-hidden');
        } else {
          header.classList.remove('header-hidden');
        }
        lastY = y;
      }

      function init(){
        header = document.getElementById('site-header');
        if(!header) return;
        applyContrast();
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        // Re-calcular contraste en resize/tema
        var ro = new ResizeObserver(applyContrast);
        ro.observe(header);
        // observador para cambios de clase en <html> (por TimeThemeScript)
        var mo = new MutationObserver(applyContrast);
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
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

        {/* HEADER: usa id para que el script lo controle */}
        <header
          id="site-header"
          className="
            site-header
            fixed top-0 inset-x-0 z-50
            bg-[color:var(--header-bg)]/95
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

        {/* Contenido (padding-top para no quedar bajo el header) */}
        <main className="mx-auto max-w-6xl p-4 pt-16">{children}</main>

        <footer className="mt-10 border-t border-[var(--border)]">
          <div className="mx-auto max-w-6xl text-center text-sm text-[color:var(--muted-fg)] p-6">
            Costachisme © {new Date().getFullYear()} · Hecho con <span className="mx-1">❤️</span> en Salina Cruz
          </div>
        </footer>
      </body>
    </html>
  );
}
