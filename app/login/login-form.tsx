"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(formData: FormData) {
    setBusy(true);
    setError("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: String(formData.get("email") ?? "").trim(),
        password: String(formData.get("password") ?? ""),
      });

      if (signInError) {
        setError("Email or password is incorrect.");
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        setError("Could not verify the account. Please sign in again.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || !profile) {
        setError("Could not load the account profile. Contact StayBridge support.");
        return;
      }

      router.replace(
        profile.role === "administrator" || profile.role === "super_administrator"
          ? "/admin"
          : "/partner/dashboard",
      );
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="row g-3"
      action={(formData) => {
        void submit(formData);
      }}
    >
      <div className="col-12">
        <label className="form-label" htmlFor="login-email">Email address</label>
        <input
          autoComplete="email"
          className="form-control"
          id="login-email"
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
      </div>
      <div className="col-12">
        <label className="form-label" htmlFor="login-password">Password</label>
        <input
          autoComplete="current-password"
          className="form-control"
          id="login-password"
          name="password"
          placeholder="Enter your password"
          required
          type="password"
        />
      </div>
      {error && <p className="col-12 text-danger mb-0" role="alert">{error}</p>}
      <div className="col-12 d-grid">
        <button className="btn btn-primary rounded-pill btn-lg" disabled={busy} type="submit">
          {busy ? "Signing in…" : "Log in"}
        </button>
      </div>
      <div className="col-12 mt-4 text-center text-body-secondary small">
        <Link href="/register">Create an account</Link>
      </div>
    </form>
  );
}
