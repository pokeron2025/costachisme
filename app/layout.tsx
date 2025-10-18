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
    icon: "/logo-icon.svg", // cambia a /logo.svg si quieres usar el logo abstracto también como favicon
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${poppins.className} min-h-screen`}>
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
        <main className="container-narrow mx-auto p-4">{children}</main>

        {/* FOOTER */}
        <footer className="container-narrow mx-auto px-4 pb-10 pt-6 text-center text-sm opacity-70">
          Costachisme © {new Date().getFullYear()} · Hecho con ❤ en Salina Cruz
        </footer>
      </body>
    </html>
  );
}
