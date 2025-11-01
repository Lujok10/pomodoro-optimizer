// lib/supabase/useUser.ts
"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export type UserState = {
  user: any | null;
  loading: boolean;
  error?: string | null;
};

export function useSupabaseUser(): UserState {
  const [state, setState] = useState<UserState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      setState({
        user: data?.session?.user ?? null,
        loading: false,
        error: error?.message ?? null,
      });
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!mounted) return;
      setState({
        user: session?.user ?? null,
        loading: false,
        error: null,
      });
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
