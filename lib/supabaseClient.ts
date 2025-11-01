// lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

export type DBTask = {
  task_id: number;
  name: string;
  impact: number;
  duration: number;
  project?: string | null;
  updated_at?: string;
};
export type DBSession = {
  task_id: number;
  name: string;
  project?: string | null;
  duration: number;
  feedback?: "yes" | "no" | null;
  created_at?: string;
};

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);

export async function ensureUserRow() {
  const { data: session } = await supabase.auth.getSession();
  const user = session?.session?.user;
  if (!user) return null;
  await supabase.from("users").upsert({ id: user.id, email: user.email || null }).select().single();
  return user;
}

