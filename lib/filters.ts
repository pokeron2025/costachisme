// lib/filters.ts
export function sanitizeInput(raw: unknown): string {
  const s = typeof raw === "string" ? raw : "";
  // 1) normaliza espacios
  let out = s.replace(/\s+/g, " ").trim();
  // 2) elimina cualquier tag HTML
  out = out.replace(/<[^>]*>/g, "");
  // 3) evita caracteres de control
  out = out.replace(/[\u0000-\u001F\u007F]/g, "");
  // 4) recorta a un máximo razonable (por si alguien manda un muro)
  if (out.length > 1000) out = out.slice(0, 1000);
  return out;
}
