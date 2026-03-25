"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { Workspace } from "@/lib/workspaces";
import type { User } from "@supabase/supabase-js";

export function LoginScreen({
  onLogin,
  workspace,
}: {
  onLogin: (user: User) => void;
  workspace: Workspace;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const client = getSupabaseClient(workspace.supabaseUrl, workspace.anonKey);
    const { data, error: authError } = await client.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else if (data.user) {
      onLogin(data.user);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-zinc-950">
      <form onSubmit={handleSubmit} className="w-80 p-6 bg-zinc-900 rounded-lg border border-zinc-800">
        <h1 className="text-xl font-bold text-zinc-100 mb-1">pgpage</h1>
        <p className="text-xs text-zinc-500 mb-6">{workspace.name}</p>
        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
        <input
          type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-zinc-800 text-zinc-200 text-sm rounded px-3 py-2 border border-zinc-700 outline-none mb-3 placeholder-zinc-500"
          autoFocus
        />
        <input
          type="password" placeholder="Password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-zinc-800 text-zinc-200 text-sm rounded px-3 py-2 border border-zinc-700 outline-none mb-4 placeholder-zinc-500"
        />
        <button
          type="submit" disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm rounded px-3 py-2 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
