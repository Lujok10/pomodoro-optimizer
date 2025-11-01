// lib/supabase/AuthGate.tsx
"use client";

import React, { useState } from "react";
import { useSupabaseUser } from "./useUser";
import { supabase } from "./supabaseClient";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSupabaseUser();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="p-4 text-sm text-gray-500">
        Checking session…
      </div>
    );
  }

  if (user) {
    return <>{children}</>;
  }

  const sendMagicLink = async () => {
    try {
      setErr(null);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: typeof window !== "undefined" ? window.location.href : undefined },
      });
      if (error) throw error;
      setSent(true);
    } catch (e: any) {
      setErr(e?.message ?? "Sign-in failed");
    }
  };

  const oauth = async (provider: "github" | "google") => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: typeof window !== "undefined" ? window.location.href : undefined },
      });
      if (error) throw error;
    } catch (e: any) {
      setErr(e?.message ?? "OAuth failed");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 rounded-lg border bg-white p-4 shadow">
      <h2 className="text-lg font-semibold mb-2">Sign in</h2>

      {sent ? (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">
          Check your email for a magic link.
        </div>
      ) : (
        <>
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            className="w-full border rounded px-2 py-1 mb-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <button
            onClick={sendMagicLink}
            className="w-full bg-indigo-600 text-white rounded px-3 py-2 text-sm"
          >
            Send magic link
          </button>

          <div className="my-3 text-center text-xs text-gray-500">or</div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => oauth("google")}
              className="border rounded px-3 py-2 text-sm"
            >
              Continue with Google
            </button>
            <button
              onClick={() => oauth("github")}
              className="border rounded px-3 py-2 text-sm"
            >
              Continue with GitHub
            </button>
          </div>
        </>
      )}

      {err && (
        <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
          {err}
        </div>
      )}
    </div>
  );
}
