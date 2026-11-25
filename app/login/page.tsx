import { PageShell } from "@/app/components/page-shell";
import { LoginForm } from "@/app/login/login-form";
import { hasSupabaseConfiguration } from "@/lib/supabase/server";

export default function LoginPage() {
  const configured = hasSupabaseConfiguration();

  return (
    <PageShell title="Login to StayBridge">
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-5">
            <div className="feature-panel p-4 p-lg-5">
              <p className="eyebrow">Account access</p>
              <h1 className="h2 fw-bold mb-4">Welcome back</h1>
              {configured ? (
                <LoginForm />
              ) : (
                <p className="text-body-secondary mb-0">
                  Account access will be available after the Supabase project is configured.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
