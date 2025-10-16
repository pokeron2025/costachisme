export const metadata = {
  title: "Se Dice en Salina",
  description: "Rumores, risas y voz ciudadana"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
