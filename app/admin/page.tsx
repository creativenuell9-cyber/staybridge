import Link from "next/link";
import { PageShell } from "@/app/components/page-shell";
import { AdminDashboard } from "@/app/admin/admin-dashboard";
import { AdminMfaChallenge } from "@/app/admin/mfa-challenge";
import { getAdminDashboardData } from "@/lib/admin/dashboard";
import { getAdminAccess } from "@/lib/auth/admin-access";
import { hasSupabaseConfiguration } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function loadAdminState() {
  if (!hasSupabaseConfiguration()) {
    return { status: "setup" as const };
  }

  try {
    const access = await getAdminAccess();
    if (access.status === "signed_out") {
      return { status: "signed_out" as const };
    }
    if (access.status === "forbidden") {
      return { status: "forbidden" as const };
    }
    if (access.status === "mfa_required") {
      return { status: "mfa_required" as const };
    }

    return {
      status: "ready" as const,
      dashboard: await getAdminDashboardData(access.supabase, access.user.id, access.role),
    };
  } catch (error) {
    console.error("Could not load the administrator dashboard.", error);
    return { status: "error" as const };
  }
}

export default async function AdminPage() {
  const state = await loadAdminState();

  if (state.status === "setup") {
    return (
      <PageShell title="Administrator setup">
        <div className="container py-5">
          <div className="info-card p-4 p-lg-5">
            <p className="eyebrow">Administrator setup</p>
            <h1 className="h2">Supabase is not connected</h1>
            <p className="mb-0 text-body-secondary">
              Configure the public Supabase URL and key in your local environment, then apply the
              database migration before using the administrator dashboard.
            </p>
          </div>
        </div>
      </PageShell>
    );
  }

  if (state.status === "signed_out") {
    return (
      <PageShell title="Administrator sign in">
        <div className="container py-5">
          <div className="info-card p-4">
            <h1 className="h2">Sign in to continue</h1>
            <p className="text-body-secondary">
              Administrator access is limited to provisioned accounts with multi-factor
              authentication.
            </p>
            <Link className="btn btn-primary rounded-pill" href="/login">Go to login</Link>
          </div>
        </div>
      </PageShell>
    );
  }

  if (state.status === "forbidden") {
    return (
      <PageShell title="Administrator access denied">
        <div className="container py-5">
          <div className="info-card p-4">
            <h1 className="h2">Administrator access required</h1>
            <p className="text-body-secondary mb-0">
              This account is not authorized to use the administration area.
            </p>
          </div>
        </div>
      </PageShell>
    );
  }

  if (state.status === "mfa_required") {
    return (
      <PageShell title="Administrator verification">
        <AdminMfaChallenge />
      </PageShell>
    );
  }

  if (state.status === "error") {
    return (
      <PageShell title="Administrator dashboard unavailable">
        <div className="container py-5">
          <div className="alert alert-danger" role="alert">
            The administrator dashboard could not load its protected data. Verify the migration,
            database permissions, and storage policies, then try again.
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Administrator dashboard">
      <AdminDashboard
        activeCount={state.dashboard.activeCount}
        applications={state.dashboard.applications}
        approvedFounderCount={state.dashboard.approvedFounderCount}
        currentFounderApproval={state.dashboard.currentFounderApproval}
        founderCount={state.dashboard.founderCount}
        isAuthorizedFounder={state.dashboard.isAuthorizedFounder}
        isSuperAdministrator={state.dashboard.isSuperAdministrator}
        pendingCount={state.dashboard.pendingCount}
        passedCheckCount={state.dashboard.passedCheckCount}
        registrationEnabled={state.dashboard.registrationEnabled}
        requiredCheckCount={state.dashboard.requiredCheckCount}
        securityChecks={state.dashboard.securityChecks}
      />
    </PageShell>
  );
}
