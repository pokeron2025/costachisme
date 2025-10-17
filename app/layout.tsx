import "./globals.css";
import { Poppins } from "next/font/google";
import Image from "next/image";
import React from "react";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata = {
  title: "Costachisme – Rumores, risas y voz ciudadana",
  description: "Chismógrafo urbano con propósito: entretenimiento y buzón ciudadano.",
  icons: {
    icon: "/logo.svg", // favicon en la pestaña
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
              width={50}   // más grande que antes
              height={50}
              className="rounded"
              priority
            />
            <div className="leading-tight ml-2">
              <h1 className="text-lg font-extrabold tracking-wide">Costachisme</h1>
              <p className="text-[12px] opacity-80">Rumores, risas y voz ciudadana</p>
            </div>
          </div>
        </header>

        {/* CONTENIDO */}
        <main className="mx-auto max-w-5xl p-4">{children}</main>
      </body>
    </html>
  );
}
