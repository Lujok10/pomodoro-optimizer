// lib/supabase/client.ts
"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/** Useful flag for guarding code paths when env isn’t set */
export const HAS_SUPABASE_ENV = !!url && !!anon;

/** Singleton browser client */
export const supabase: SupabaseClient = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// lib/supabase/client.ts
export * from "./supabaseClient";


/** Back-compat helper if other files call getSupabase() */
export const getSupabase = () => supabase;
