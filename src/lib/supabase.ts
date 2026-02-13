import { createClient } from "@supabase/supabase-js";

// 這些金鑰可以在 Supabase 的 Project Settings > API 找到
const supabaseUrl = "https://ecncnhcoxytzbgarurvn.supabase.co";
const supabaseAnonKey =
	"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjbmNuaGNveHl0emJnYXJ1cnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5OTI5NDMsImV4cCI6MjA4NjU2ODk0M30.9cpOBZGANNCaAAEV2wiUIceKB66ixYjsrypOROlTtWI";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
