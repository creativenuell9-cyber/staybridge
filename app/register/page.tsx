import Link from "next/link";
import { PageShell } from "@/app/components/page-shell";
import { SignupForm } from "@/app/register/signup-form";
import { hasSupabaseConfiguration } from "@/lib/supabase/server";

export default function RegisterPage() {
  const registrationOpen =
    hasSupabaseConfiguration() && process.env.PUBLIC_REGISTRATION_ENABLED === "true";

  return (
    <PageShell title="Create a StayBridge account">
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-6">
            <div className="feature-panel p-4 p-lg-5">
              <p className="eyebrow">Partner account</p>
              <h1 className="h2 fw-bold mb-3">Create your account</h1>
              {registrationOpen ? (
                <>
                  <p className="text-body-secondary">
                    Once your email is verified, you can submit a property for review. Approval is
                    required before a property can appear in the public directory.
                  </p>
                  <SignupForm />
                </>
              ) : (
                <p className="text-body-secondary">
                  Public registration is currently closed while the database, security checks, and
                  required founder approvals are being configured.
                </p>
              )}
              <p className="small text-body-secondary mt-4 mb-0">
                Already have an account? <Link href="/login">Log in</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
