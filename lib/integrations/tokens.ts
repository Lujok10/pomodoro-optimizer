"use server";

import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import type { Provider, TokenRecord } from "./types";

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { global: { headers: { "x-application-name": "optimapp" } }});
}

export async function saveToken(userId: string, provider: Provider, token: TokenRecord) {
  try {
    const supabase = sb();
    await supabase.from("oauth_tokens").upsert({
      user_id: userId,
      provider,
      access_token: token.access_token,
      refresh_token: token.refresh_token ?? null,
      scope: token.scope ?? null,
      expires_at: token.expires_at ? new Date(token.expires_at).toISOString() : null
    });
  } catch {
    // dev fallback (INSECURE; for local only)
    const k = `dev_tokens_${provider}_${userId}`;
    (global as any)[k] = token;
  }
}

export async function loadToken(userId: string, provider: Provider): Promise<TokenRecord | null> {
  try {
    const supabase = sb();
    const { data } = await supabase.from("oauth_tokens").select("*").eq("user_id", userId).eq("provider", provider).maybeSingle();
    if (!data) return null;
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || undefined,
      scope: data.scope || undefined,
      expires_at: data.expires_at || undefined
    };
  } catch {
    const k = `dev_tokens_${provider}_${userId}`;
    return (global as any)[k] ?? null;
  }
}
