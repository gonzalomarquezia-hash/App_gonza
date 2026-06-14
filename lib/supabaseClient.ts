import { createClient } from '@supabase/supabase-js';

// Fallbacks para que el build no se caiga si faltan las variables.
// En runtime (con las variables reales) funciona; sin ellas, las
// consultas fallan y la UI muestra el aviso de "conectá la base".
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(url, anonKey);
