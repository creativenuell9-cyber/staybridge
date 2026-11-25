"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AdminMfaChallenge() {
  const router = useRouter();
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [factorId, setFactorId] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function prepareFactor() {
      try {
        const { data: factorData, error: factorError } = await supabase.auth.mfa.listFactors();
        if (factorError) {
          throw factorError;
        }

        const verifiedFactor = factorData.totp.find((factor) => factor.status === "verified");
        let nextFactorId = verifiedFactor?.id;

        if (!nextFactorId) {
          const { data, error: enrollError } = await supabase.auth.mfa.enroll({
            factorType: "totp",
            friendlyName: "StayBridge administrator",
          });
          if (enrollError) {
            throw enrollError;
          }
          nextFactorId = data.id;
          if (active) {
            setQrCode(data.totp.qr_code);
            setSecret(data.totp.secret);
          }
        }

        const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: nextFactorId,
        });
        if (challengeError) {
          throw challengeError;
        }

        if (active) {
          setFactorId(nextFactorId);
          setChallengeId(challenge.id);
        }
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Could not start MFA verification.");
        }
      } finally {
        if (active) {
          setBusy(false);
        }
      }
    }

    void prepareFactor();
    return () => {
      active = false;
    };
  }, [supabase]);

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: code.trim(),
    });

    if (verifyError) {
      setError("That code could not be verified. Check your authenticator and try again.");
      setBusy(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-6">
          <div className="feature-panel p-4 p-lg-5">
            <p className="eyebrow">Administrator security</p>
            <h1 className="h2 fw-bold">Verify your identity</h1>
            {qrCode && (
              <div className="my-4">
                <p>Scan this QR code with an authenticator app, or enter the setup key manually.</p>
                {qrCode.startsWith("data:image/svg+xml") && (
                  // The Supabase Auth service returns the QR code as an SVG data URL.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrCode} alt="Authenticator setup QR code" className="mfa-qr-code" />
                )}
                <p className="small text-break mb-0">
                  Setup key: <code>{secret}</code>
                </p>
              </div>
            )}
            {busy && <p className="text-body-secondary">Preparing secure verification…</p>}
            {!busy && factorId && challengeId && (
              <form className="row g-3" onSubmit={(event) => void verifyCode(event)}>
                <div className="col-12">
                  <label className="form-label" htmlFor="admin-mfa-code">
                    Six-digit authenticator code
                  </label>
                  <input
                    autoComplete="one-time-code"
                    className="form-control"
                    id="admin-mfa-code"
                    inputMode="numeric"
                    maxLength={6}
                    onChange={(event) => setCode(event.target.value)}
                    pattern="[0-9]{6}"
                    required
                    value={code}
                  />
                </div>
                <div className="col-12 d-grid">
                  <button className="btn btn-primary rounded-pill" disabled={busy} type="submit">
                    Verify and continue
                  </button>
                </div>
              </form>
            )}
            {!busy && !factorId && (
              <p className="text-body-secondary">
                MFA could not be prepared for this administrator account. Contact a system
                administrator.
              </p>
            )}
            {error && <p className="text-danger" role="alert">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
