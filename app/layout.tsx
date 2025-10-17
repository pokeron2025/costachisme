import "./globals.css";

export const metadata = {
  title: "Costachisme — Rumores, risas y voz ciudadana",
  description: "Chismógrafo urbano con propósito: entretenimiento y buzón ciudadano.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-30 border-b bg-primary/95 backdrop-blur supports-[backdrop-filter]:bg-primary/75">
          <div className="mx-auto max-w-5xl flex items-center gap-3 p-3 text-white">
            <img src="/logo.svg" alt="Costachisme" className="w-10 h-10" />
            <div>
              <h1 className="text-lg font-extrabold tracking-wide">Costachisme</h1>
              <p className="text-xs opacity-90">Rumores, risas y voz ciudadana</p>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl p-4">{children}</main>
        <footer className="mt-10 border-t">
          <div className="mx-auto max-w-5xl p-4 text-xs text-muted-foreground">
            Costachisme © 2025 · Plataforma de entretenimiento y participación ciudadana. Las publicaciones son anónimas y moderadas antes de publicarse. No se permite difamación ni datos personales.
          </div>
        </footer>
      </body>
    </html>
  );
}
