"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { register, withBase, getMe } from "@lib/api";
import { useUserStore, useAuthStore } from "@stores";
import { toast } from "@lib/ui";
import { useRequest } from "../../hooks/useRequest";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const { loading, data, error, run } = useRequest(
    async (payload: { name: string; email: string; password: string }) =>
      register(payload),
    {
      onSuccess: (user) => {
        const setUser = useUserStore.getState().setUser;
        const setAuthenticated = useAuthStore.getState().setAuthenticated;
        setUser(user);
        setAuthenticated(true);
        if (typeof window !== "undefined") {
          toast("Account created successfully", "success");
        }
        void getMe().catch(() => {});
        setTimeout(() => {
          router.push(withBase("/"));
          router.refresh();
        }, 400);
      },
    },
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);
    if (!name.trim()) {
      setValidationError("Full name is required");
      return;
    }
    if (password !== confirm) {
      setValidationError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setValidationError("Password must be at least 8 characters");
      return;
    }
    try {
      await run({ name, email, password });
    } catch (err) {
      // errors handled by hook callbacks and `error` value
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Create an account</h1>
        <p className="mt-1 text-sm text-slate-600">
          Start tracking your time clearly
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Full name
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

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
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Confirm password
            </label>
            <input
              type="password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="Repeat password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>

          {(() => {
            const errMsg = validationError
              ? validationError
              : error
                ? error instanceof Error
                  ? error.message
                  : String(error)
                : null;
            return errMsg ? (
              <p className="text-xs text-rose-600" role="alert">
                {errMsg}
              </p>
            ) : null;
          })()}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-600">
          Already have an account?
          <Link
            href={withBase("/auth/login")}
            className="ml-1 font-semibold text-emerald-600 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
