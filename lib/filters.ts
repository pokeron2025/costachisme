// lib/filters.ts

export type SanitizeResult = { ok: true; value: string } | { ok: false; msg: string; value: string };

/**
 * Limpia un texto y valida contra una lista negra.
 * - Normaliza espacios
 * - Quita tags HTML
 * - Quita caracteres de control
 * - Recorta a 1000 chars
 * - Si encuentra una palabra prohibida, devuelve ok:false con mensaje
 */
export function sanitizeInput(raw: unknown, blacklist: string[] = []): SanitizeResult {
  // 1) forzamos a string
  let out = typeof raw === 'string' ? raw : '';

  // 2) normaliza espacios y recorta
  out = out.replace(/\s+/g, ' ').trim();

  // 3) elimina cualquier tag HTML
  out = out.replace(/<[^>]*>/g, '');

  // 4) elimina caracteres de control fuera de \n \r \t
  out = out.replace(/[^\u0020-\u007E\u00A0-\uFFFF\n\r\t]/g, '');

  // 5) recorta a un máximo razonable
  if (out.length > 1000) out = out.slice(0, 1000);

  // 6) valida blacklist (si viene vacía, no hace nada)
  const lower = out.toLowerCase();
  for (const word of blacklist) {
    const w = (word || '').trim();
    if (!w) continue;
    if (lower.includes(w.toLowerCase())) {
      return { ok: false, msg: `El texto contiene una palabra no permitida: "${w}"`, value: out };
    }
  }

  return { ok: true, value: out };
}
