import "./globals.css";
import Image from "next/image";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata = {
  title: "Costachisme — Rumores, risas y voz ciudadana",
  description:
    "Chismógrafo urbano con propósito: entretenimiento y buzón ciudadano.",
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
              width={36}
              height={36}
              className="rounded"
              priority
            />
            <div className="leading-tight">
              <h1 className="text-lg font-extrabold tracking-wide">Costachisme</h1>
              <p className="text-[12px] opacity-90">Rumores, risas y voz ciudadana</p>
            </div>
          </div>
        </header>

        {/* CONTENIDO */}
        <main className="mx-auto max-w-5xl p-4">{children}</main>

        {/* FOOTER */}
        <footer className="mt-10 border-t">
          <div className="mx-auto max-w-5xl p-4 text-xs text-gray-500">
            Costachisme © 2025 · Plataforma de entretenimiento y participación ciudadana.
            Las publicaciones son anónimas y moderadas antes de publicarse. No se permite
            difamación ni datos personales.
          </div>
        </footer>
      </body>
    </html>
  );
}
