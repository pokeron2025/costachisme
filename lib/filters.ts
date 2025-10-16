// Filtros básicos: bloquear PII y palabras
const NAME_REGEX = /\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s){1,3}[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\b/g; // nombres con mayúscula
const PHONE_REGEX = /(\+?\d{1,3}[\s-]?)?(\d{2,4}[\s-]?){2,4}\d{2,4}/g;

export function sanitizeInput(text: string, blocklist: string[] = []): { ok: boolean; msg?: string } {
  if (!text) return { ok: false, msg: 'Vacío' };
  if (NAME_REGEX.test(text)) return { ok: false, msg: 'No se permiten nombres o datos personales.' };
  if (PHONE_REGEX.test(text)) return { ok: false, msg: 'No publiques teléfonos o matrículas.' };
  const lowered = text.toLowerCase();
  for (const bad of blocklist.map(b => b.trim()).filter(Boolean)) {
    if (bad && lowered.includes(bad.toLowerCase())) return { ok: false, msg: 'Lenguaje no permitido.' };
  }
  return { ok: true };
}
