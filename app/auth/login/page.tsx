"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login, withBase, getMe, getEpics } from "@lib/api";
import {
  useUserStore,
  useAuthStore,
  useRootEpicStore,
  Epic as StoreEpic,
} from "@stores";
import { useRequest } from "../../hooks/useRequest";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const setUser = useUserStore((s) => s.setUser);
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const { addEpicsFromApi } = useRootEpicStore.getState();

  const {
    loading,
    error,
    run: loginUser,
  } = useRequest(
    async (payload: { email: string; password: string; remember?: boolean }) =>
      login(payload),
    {
      onSuccess: (user) => {
        setUser(user);
        setAuthenticated(true);
        void getMe().catch(() => {});
        void getEpics()
          .then((epics) => {
            addEpicsFromApi(epics);
          })
          // sanity check: log store population immediately

          .catch(() => {});
        router.push(withBase("/"));
        router.refresh();
      },
    },
  );

  const errMsg = (error as any)?.details?.error || "";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await loginUser({ email, password, remember });
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-600">Sign in to continue</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Email
            </label>
            <input
              type="email"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Password
            </label>
            <input
              type="password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="rounded border-slate-300"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Remember me
            </label>
          </div>
          {errMsg && (
            <p className="text-xs text-rose-600" role="alert">
              {errMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-600">
          Dont have an account?
          <Link
            href={withBase("/auth/register")}
            className="ml-1 font-semibold text-emerald-600 hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
