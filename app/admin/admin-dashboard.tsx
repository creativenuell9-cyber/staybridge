"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApplicationReview } from "@/app/admin/application-review";
import type { AdminApplication } from "@/lib/admin/dashboard";

interface AdminDashboardProps {
  applications: AdminApplication[];
  pendingCount: number;
  activeCount: number;
  registrationEnabled: boolean;
  securityChecks: {
    key: string;
    description: string;
    required: boolean;
    passed: boolean;
    evidence: string | null;
  }[];
  isSuperAdministrator: boolean;
  passedCheckCount: number;
  requiredCheckCount: number;
  founderCount: number;
  approvedFounderCount: number;
  isAuthorizedFounder: boolean;
  currentFounderApproval: boolean | null;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not submitted";
  }
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminDashboard({
  applications,
  pendingCount,
  activeCount,
  registrationEnabled,
  securityChecks,
  isSuperAdministrator,
  passedCheckCount,
  requiredCheckCount,
  founderCount,
  approvedFounderCount,
  isAuthorizedFounder,
  currentFounderApproval,
}: AdminDashboardProps) {
  const router = useRouter();
  const [approvalError, setApprovalError] = useState("");
  const [approvalBusy, setApprovalBusy] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [checkEvidence, setCheckEvidence] = useState<Record<string, string>>({});
  const [savingCheck, setSavingCheck] = useState("");
  const [checkError, setCheckError] = useState("");

  async function updateSecurityCheck(check: AdminDashboardProps["securityChecks"][number]) {
    const passed = !check.passed;
    const evidence = checkEvidence[check.key] ?? check.evidence ?? "";
    if (passed && evidence.trim().length < 10) {
      setCheckError("Add at least 10 characters of evidence before passing a check.");
      return;
    }
    if (!window.confirm(
      `${passed ? "Mark as passed" : "Mark as not passed"}: "${check.description}"?`,
    )) {
      return;
    }

    setSavingCheck(check.key);
    setCheckError("");
    try {
      const response = await fetch("/api/admin/launch-checks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ checkKey: check.key, passed, evidence }),
      });
      const result = await response.json();
      if (!response.ok) {
        setCheckError(result.error ?? "Could not update the security check.");
        return;
      }
      router.refresh();
    } catch {
      setCheckError("Could not reach the administrator service. Try again.");
    } finally {
      setSavingCheck("");
    }
  }

  async function recordFounderApproval() {
    const approved = currentFounderApproval !== true;
    const decision = approved ? "approve" : "withdraw approval for";
    if (!window.confirm(`Are you sure you want to ${decision} public registration?`)) {
      return;
    }

    setApprovalBusy(true);
    setApprovalError("");
    try {
      const response = await fetch("/api/admin/launch-approval", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ approved, notes: approvalNotes }),
      });
      const result = await response.json();
      if (!response.ok) {
        setApprovalError(result.error ?? "Could not save your launch approval.");
        return;
      }
      router.refresh();
    } catch {
      setApprovalError("Could not reach the administrator service. Try again.");
    } finally {
      setApprovalBusy(false);
    }
  }

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <div>
          <p className="eyebrow mb-2">Secure administration</p>
          <h1 className="display-5 fw-bold mb-0">Review dashboard</h1>
        </div>
        <span className={`status-pill ${registrationEnabled ? "status-pill-active" : ""}`}>
          Public registration {registrationEnabled ? "enabled" : "locked"}
        </span>
      </div>

      <div className="row g-3 mb-5">
        <div className="col-md-4">
          <div className="stat-card">
            <strong>{pendingCount}</strong>
            <span>Applications awaiting review</span>
          </div>
        </div>
        <div className="col-md-4">
          <div className="stat-card">
            <strong>{activeCount}</strong>
            <span>Published properties</span>
          </div>
        </div>
        <div className="col-md-4">
          <div className="stat-card">
            <strong>{applications.length}</strong>
            <span>Reviewable applications loaded</span>
          </div>
        </div>
      </div>

      <section className="info-card p-4 p-lg-5 mb-5" aria-labelledby="launch-gate-title">
        <div className="d-flex justify-content-between flex-wrap gap-3">
          <div>
            <p className="eyebrow">Public launch gate</p>
            <h2 className="h3" id="launch-gate-title">Registration readiness</h2>
          </div>
          <strong>{passedCheckCount} / {requiredCheckCount} security checks passed</strong>
        </div>
        <p className="text-body-secondary">
          Founder approvals: {approvedFounderCount} / {founderCount}. Public registration also
          requires the server launch flag and all database authorization checks.
        </p>
        <ul className="list-group list-group-flush">
          {securityChecks.map((check) => (
            <li className="list-group-item px-0" key={check.key}>
              <div className="d-flex justify-content-between gap-3">
                <span>{check.description}</span>
                <span className={check.passed ? "text-success" : "text-danger"}>
                  {check.required ? (check.passed ? "Passed" : "Required") : "Optional"}
                </span>
              </div>
              {isSuperAdministrator && (
                <div className="row g-2 mt-1">
                  <div className="col-md-9">
                    <label className="visually-hidden" htmlFor={`evidence-${check.key}`}>
                      Evidence for {check.description}
                    </label>
                    <input
                      className="form-control form-control-sm"
                      id={`evidence-${check.key}`}
                      maxLength={4000}
                      onChange={(event) =>
                        setCheckEvidence((previous) => ({
                          ...previous,
                          [check.key]: event.target.value,
                        }))
                      }
                      placeholder="Evidence reference or summary (minimum 10 characters to pass)"
                      value={checkEvidence[check.key] ?? check.evidence ?? ""}
                    />
                  </div>
                  <div className="col-md-3 d-grid">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      disabled={savingCheck === check.key}
                      onClick={() => void updateSecurityCheck(check)}
                      type="button"
                    >
                      {savingCheck === check.key
                        ? "Saving…"
                        : check.passed
                          ? "Revoke pass"
                          : "Mark passed"}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
        {checkError && <p className="text-danger mt-3 mb-0" role="alert">{checkError}</p>}
        {isAuthorizedFounder && (
          <div className="mt-4">
            <label className="form-label" htmlFor="launch-approval-notes">
              Founder approval notes (optional)
            </label>
            <textarea
              className="form-control mb-3"
              id="launch-approval-notes"
              maxLength={2000}
              onChange={(event) => setApprovalNotes(event.target.value)}
              rows={2}
              value={approvalNotes}
            />
            <button
              className="btn btn-outline-primary rounded-pill"
              disabled={approvalBusy}
              onClick={() => void recordFounderApproval()}
              type="button"
            >
              {approvalBusy
                ? "Saving…"
                : currentFounderApproval === true
                  ? "Withdraw my founder approval"
                  : "Record my founder approval"}
            </button>
            {approvalError && <p className="text-danger mt-3 mb-0" role="alert">{approvalError}</p>}
          </div>
        )}
      </section>

      <section aria-labelledby="applications-title">
        <div className="d-flex justify-content-between align-items-end mb-4">
          <div>
            <p className="eyebrow mb-2">Application queue</p>
            <h2 className="h3 mb-0" id="applications-title">Partner submissions</h2>
          </div>
          <span className="text-body-secondary">Showing up to 100</span>
        </div>

        {applications.length === 0 ? (
          <div className="info-card p-4">
            <p className="mb-0 text-body-secondary">There are no applications awaiting review.</p>
          </div>
        ) : (
          <div className="d-grid gap-4">
            {applications.map((application) => (
              <article className="info-card p-4 p-lg-5" key={application.id}>
                <div className="d-flex justify-content-between flex-wrap gap-3 mb-4">
                  <div>
                    <span className="status-pill">{application.status.replaceAll("_", " ")}</span>
                    <h3 className="h3 mt-3 mb-1">{application.property.name}</h3>
                    <p className="text-body-secondary mb-0">
                      {application.property.city}, {application.property.state} · Submitted{" "}
                      {formatDate(application.submitted_at)}
                    </p>
                  </div>
                  <span className="small text-body-secondary">
                    Version {application.version} · {application.id}
                  </span>
                </div>

                <div className="row g-4">
                  <div className="col-lg-7">
                    <h4 className="h6">Business</h4>
                    <p className="mb-1">{application.organization.legal_name}</p>
                    <p className="mb-1">{application.organization.business_email}</p>
                    <p className="mb-4">{application.organization.business_phone}</p>
                    <h4 className="h6">Property details</h4>
                    <p>{application.property.description}</p>
                    <p className="small text-body-secondary">
                      {application.property.address}, {application.property.city},{" "}
                      {application.property.state}
                    </p>
                    <p className="small text-body-secondary">
                      {application.property.rooms.length} room categories ·{" "}
                      {application.property.property_photos.length} photos ·{" "}
                      {application.property.property_documents.length} verification documents
                    </p>
                    {application.property.rooms.length > 0 && (
                      <ul className="list-unstyled small">
                        {application.property.rooms.map((room) => (
                          <li key={room.id}>
                            {room.name} —{" "}
                            {new Intl.NumberFormat("en-NG", {
                              style: "currency",
                              currency: "NGN",
                              maximumFractionDigits: 0,
                            }).format(room.price_per_night)} / night
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="col-lg-5">
                    <h4 className="h6">Property photos</h4>
                    <div className="row g-2 mb-4">
                      {application.property.property_photos.map((photo) => (
                        <div className="col-6" key={photo.id}>
                          {photo.url ? (
                            <a href={photo.url} rel="noreferrer" target="_blank">
                              {/* Signed Storage URLs are per-request and their host is project-specific. */}
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                alt={photo.alt_text || application.property.name}
                                className="admin-media-preview rounded-3"
                                src={photo.url}
                              />
                            </a>
                          ) : (
                            <span className="small text-danger">Photo preview unavailable.</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <h4 className="h6">Verification documents</h4>
                    <ul className="list-unstyled">
                      {application.property.property_documents.map((document) => (
                        <li key={document.id} className="mb-2">
                          {document.url ? (
                            <a href={document.url} rel="noreferrer" target="_blank">
                              {document.document_type.replaceAll("_", " ")}
                            </a>
                          ) : (
                            <span className="text-danger">
                              Secure document preview unavailable.
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <ApplicationReview application={application} />
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
