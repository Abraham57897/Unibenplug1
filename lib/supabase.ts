import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && key);

// Placeholder values keep imports from throwing when keys are missing; the layout shows a setup screen instead.
export const supabase = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder-anon-key');
