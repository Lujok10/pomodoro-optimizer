// lib/supabase/supabaseClient.ts
"use client";

import { createClient } from "@supabase/supabase-js";

// Read from public env vars (required)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  // Helpful runtime log; avoids type crash
  // You must set these in .env.local
  // NEXT_PUBLIC_SUPABASE_URL=...
  // NEXT_PUBLIC_SUPABASE_ANON_KEY=...
  console.warn("[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Optional helper used elsewhere in your app
export async function ensureUserRow() {
  const { data } = await supabase.auth.getUser();
  const user = data?.user ?? null;
  if (!user) return null;

  // If you keep a 'profiles' table, upsert a minimal row.
  // This is best-effort; ignore failure if table doesn’t exist.
  try {
    await supabase
      .from("profiles")
      .upsert({ id: user.id, email: user.email ?? null })
      .select()
      .single();
  } catch {
    // no-op
  }
  return user;
}

// Light types used by cloud sync code
export type DBTask = {
  task_id: number;
  name: string;
  impact: number;
  duration: number;
  project?: string | null;
  updated_at?: string | null;
};

export type DBSession = {
  task_id: number;
  name?: string | null;
  project?: string | null;
  duration?: number | null; // minutes
  feedback?: "yes" | "no" | null;
  created_at?: string | null;
};
