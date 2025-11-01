"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // email login UI bits (optional)
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // initial session
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // subscribe to changes
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: typeof window !== "undefined" ? window.location.href : undefined },
      });
      if (error) throw error;
      setSent(true);
    } catch (ex: any) {
      setErr(ex?.message ?? String(ex));
    }
  };

  const signInWith = async (provider: "github" | "google") => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: typeof window !== "undefined" ? window.location.href : undefined },
    });
  };

  if (loading) {
    return <div className="p-4 text-sm text-gray-600">Checking authentication…</div>;
  }

  if (user) {
    return <>{children}</>;
  }

  // Simple sign-in gate
  return (
    <div className="mx-auto mt-10 max-w-md rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800">Sign in</h2>
      <p className="mt-1 text-sm text-gray-600">Use email magic link or OAuth.</p>

      <form onSubmit={signInWithEmail} className="mt-4 space-y-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm"
          placeholder="you@example.com"
        />
        <button
          type="submit"
          className="w-full rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          disabled={sent}
        >
          {sent ? "Check your inbox…" : "Send magic link"}
        </button>
      </form>

      {err && <div className="mt-2 text-sm text-red-600">{err}</div>}

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => signInWith("google")}
          className="flex-1 rounded border px-3 py-2 text-sm hover:bg-gray-50"
        >
          Continue with Google
        </button>
        <button
          onClick={() => signInWith("github")}
          className="flex-1 rounded border px-3 py-2 text-sm hover:bg-gray-50"
        >
          Continue with GitHub
        </button>
      </div>
    </div>
  );
}
