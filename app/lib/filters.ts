// app/lib/filters.ts

export function sanitizeInput(text: string, blocklist: string[] = []) {
  for (const bad of blocklist) {
    if (text.toLowerCase().includes(bad.toLowerCase().trim())) {
      return { ok: false, msg: `El texto contiene una palabra bloqueada: ${bad}` };
    }
  }

  // Validación extra: que no esté vacío ni demasiado largo
  if (!text || text.trim().length < 3) {
    return { ok: false, msg: "El texto es demasiado corto." };
  }
  if (text.length > 500) {
    return { ok: false, msg: "El texto es demasiado largo." };
  }

  return { ok: true, msg: "" };
}
