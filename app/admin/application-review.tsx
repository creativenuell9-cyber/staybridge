"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminApplication } from "@/lib/admin/dashboard";

const reviewActions = [
  { value: "approved", label: "Approve" },
  { value: "information_requested", label: "Request information" },
  { value: "rejected", label: "Reject" },
  { value: "suspended", label: "Suspend" },
] as const;

export function ApplicationReview({ application }: { application: AdminApplication }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitDecision(action: (typeof reviewActions)[number]["value"]) {
    const label = reviewActions.find((item) => item.value === action)?.label ?? action;
    if (!window.confirm(`${label} "${application.property.name}"?`)) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/admin/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          applicationId: application.id,
          action,
          notes,
          expectedVersion: application.version,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "Could not update the application.");
        return;
      }

      router.refresh();
    } catch {
      setError("Could not reach the administrator service. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="application-review mt-4 border-top pt-4">
      <label className="form-label" htmlFor={`notes-${application.id}`}>
        Decision notes (optional)
      </label>
      <textarea
        id={`notes-${application.id}`}
        className="form-control mb-3"
        rows={2}
        maxLength={2000}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />
      {error && <p className="text-danger" role="alert">{error}</p>}
      <div className="d-flex flex-wrap gap-2">
        {reviewActions.map((action) => (
          <button
            className={action.value === "approved" ? "btn btn-primary" : "btn btn-outline-primary"}
            disabled={busy}
            key={action.value}
            onClick={() => void submitDecision(action.value)}
            type="button"
          >
            {busy ? "Saving…" : action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
