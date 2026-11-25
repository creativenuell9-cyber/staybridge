"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SignupForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(formData: FormData) {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName: formData.get("fullName"),
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "Could not create the account.");
        return;
      }

      setMessage(result.message);
      if (result.authenticated) {
        router.replace("/partner/dashboard");
        router.refresh();
      }
    } catch {
      setError("Could not reach the account service. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      action={(formData) => {
        void submit(formData);
      }}
      className="row g-3"
    >
      <div className="col-12">
        <label className="form-label" htmlFor="signup-name">Full name</label>
        <input
          autoComplete="name"
          className="form-control"
          id="signup-name"
          maxLength={120}
          name="fullName"
          required
        />
      </div>
      <div className="col-12">
        <label className="form-label" htmlFor="signup-email">Email address</label>
        <input
          autoComplete="email"
          className="form-control"
          id="signup-email"
          maxLength={254}
          name="email"
          required
          type="email"
        />
      </div>
      <div className="col-12">
        <label className="form-label" htmlFor="signup-password">Password</label>
        <input
          autoComplete="new-password"
          className="form-control"
          id="signup-password"
          minLength={12}
          name="password"
          required
          type="password"
        />
        <small className="text-body-secondary">Use at least 12 characters.</small>
      </div>
      {error && <p className="col-12 text-danger mb-0" role="alert">{error}</p>}
      {message && <p className="col-12 text-success mb-0" role="status">{message}</p>}
      <div className="col-12 d-grid">
        <button className="btn btn-primary rounded-pill" disabled={busy} type="submit">
          {busy ? "Creating account…" : "Create account"}
        </button>
      </div>
    </form>
  );
}
