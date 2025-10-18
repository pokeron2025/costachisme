// app/layout.tsx
import "./globals.css";
import { Poppins } from "next/font/google";
import Image from "next/image";
import React from "react";
import ThemeToggle from "./components/ThemeToggle";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata = {
  title: "Costachisme — Rumores, risas y voz ciudadana",
  description:
    "Chismógrafo urbano con propósito: entretenimiento y buzón ciudadano.",
  icons: {
    icon: "/logo-icon.svg", // o "/logo.svg" si quieres usar el abstracto
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${poppins.className} min-h-screen flex flex-col`}>
        {/* HEADER */}
        <header className="sticky top-0 z-30 border-b border-black/5 dark:border-white/10 bg-brand-500/95 text-white backdrop-blur supports-[backdrop-filter]:bg-brand-500/80">
          <div className="container-narrow flex items-center justify-between gap-3 p-3">
            {/* IZQUIERDA: logo + textos */}
            <div className="flex items-center gap-3">
              <Image
                src="/logo.svg"
                alt="Logo"
                width={40}
                height={40}
                className="rounded-xl shadow soft"
                priority
              />
              <div className="leading-tight">
                <div className="text-lg font-semibold tracking-wide">
                  Salinacruz
                </div>
                <p className="text-[12px] opacity-90">
                  Rumores, risas y voz ciudadana
                </p>
              </div>
            </div>

            {/* DERECHA: botón modo claro/oscuro */}
            <ThemeToggle />
          </div>
        </header>

        {/* CONTENIDO */}
        <main className="container-narrow mx-auto p-4 flex-1">{children}</main>

        {/* FOOTER */}
        <footer className="border-t border-black/5 dark:border-white/10 mt-8">
          <div className="container-narrow mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm opacity-80">
            {/* Izquierda */}
            <p className="text-center md:text-left">
              © {new Date().getFullYear()} Costachisme · Hecho con ❤ en
              Salina Cruz
            </p>

            {/* Derecha: enlaces */}
            <nav className="flex gap-4 text-xs md:text-sm">
              <a
                href="#"
                className="hover:underline hover:text-brand-400 transition"
              >
                Contacto
              </a>
              <a
                href="#"
                className="hover:underline hover:text-brand-400 transition"
              >
                Aviso de Privacidad
              </a>
              <a
                href="#"
                className="hover:underline hover:text-brand-400 transition"
              >
                Términos y Condiciones
              </a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
