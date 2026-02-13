import { createClient } from "@supabase/supabase-js";

// 這些金鑰可以在 Supabase 的 Project Settings > API 找到
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
