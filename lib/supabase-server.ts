// lib/supabase-server.ts
import { createClient } from '@supabase/supabase-js';

// Usa las mismas vars que ya tienes en Vercel
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cliente para código del SERVIDOR (API routes, server actions, etc.)
export const supabaseServer = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false },
});
