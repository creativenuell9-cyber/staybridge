import Link from "next/link";
import { z } from "zod";
import { PageShell } from "@/app/components/page-shell";
import { ApplicationWorkspace } from "@/app/partner/dashboard/application-workspace";
import { isPublicRegistrationAuthorized } from "@/lib/registration";
import {
  createSupabaseServerClient,
  hasSupabaseConfiguration,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const partnerApplicationSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  submitted_at: z.string().nullable(),
  property: z.object({
    id: z.string().uuid(),
    name: z.string(),
    city: z.string(),
    state: z.string(),
    property_photos: z.array(z.object({ id: z.string().uuid() })),
    property_documents: z.array(z.object({ id: z.string().uuid() })),
  }),
});

type PartnerApplication = {
  id: string;
  status: string;
  submitted_at: string | null;
  property: {
    id: string;
    name: string;
    city: string;
    state: string;
    photoCount: number;
    documentCount: number;
  };
};

async function loadPartnerState() {
  if (!hasSupabaseConfiguration()) {
    return { status: "setup" as const };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw new Error(`Could not verify the partner session: ${userError.message}`);
    }
    if (!user) {
      return { status: "signed_out" as const };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(`Could not load the partner profile: ${profileError.message}`);
    }
    if (profile?.role === "administrator" || profile?.role === "super_administrator") {
      return { status: "administrator" as const };
    }
    if (!profile || !["customer", "hospitality_partner"].includes(profile.role)) {
      return { status: "forbidden" as const };
    }

    const [
      { data: applicationRows, error: applicationsError },
      authorized,
    ] = await Promise.all([
      supabase
        .from("applications")
        .select(
          "id,status,submitted_at,property:properties!inner(id,name,city,state,property_photos(id),property_documents(id))",
        )
        .eq("submitted_by", user.id)
        .order("submitted_at", { ascending: false }),
      isPublicRegistrationAuthorized(supabase),
    ]);

    if (applicationsError) {
      throw new Error(`Could not load partner applications: ${applicationsError.message}`);
    }

    const applications = z.array(partnerApplicationSchema).parse(applicationRows ?? []);
    const existingApplications: PartnerApplication[] = applications.map((application) => ({
      id: application.id,
      status: application.status,
      submitted_at: application.submitted_at,
      property: {
        id: application.property.id,
        name: application.property.name,
        city: application.property.city,
        state: application.property.state,
        photoCount: application.property.property_photos.length,
        documentCount: application.property.property_documents.length,
      },
    }));

    return {
      status: "ready" as const,
      existingApplications,
      registrationOpen: authorized && process.env.PUBLIC_REGISTRATION_ENABLED === "true",
    };
  } catch (error) {
    console.error("Could not load the partner dashboard.", error);
    return { status: "error" as const };
  }
}

export default async function PartnerDashboardPage() {
  const state = await loadPartnerState();

  if (state.status === "setup") {
    return (
      <PageShell title="Partner dashboard setup">
        <div className="container py-5">
          <div className="alert alert-warning" role="alert">
            Partner services are not configured. Connect Supabase and apply the database migration.
          </div>
        </div>
      </PageShell>
    );
  }

  if (state.status === "signed_out") {
    return (
      <PageShell title="Partner sign in">
        <div className="container py-5">
          <div className="info-card p-4">
            <h1 className="h2">Sign in to manage your property</h1>
            <Link className="btn btn-primary rounded-pill" href="/login">Go to login</Link>
          </div>
        </div>
      </PageShell>
    );
  }

  if (state.status === "administrator") {
    return (
      <PageShell title="Administrator dashboard">
        <div className="container py-5">
          <p className="text-body-secondary">
            This account is provisioned for administration, not partner services.
          </p>
          <Link className="btn btn-primary rounded-pill" href="/admin">
            Open administrator dashboard
          </Link>
        </div>
      </PageShell>
    );
  }

  if (state.status === "forbidden") {
    return (
      <PageShell title="Partner access denied">
        <div className="container py-5">
          <div className="alert alert-danger" role="alert">
            This account is not authorized to use partner services.
          </div>
        </div>
      </PageShell>
    );
  }

  if (state.status === "error") {
    return (
      <PageShell title="Partner dashboard unavailable">
        <div className="container py-5">
          <div className="alert alert-danger" role="alert">
            Partner services could not load protected account data. Verify the migration and
            database permissions, then try again.
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Partner dashboard">
      <div className="container py-5">
        <p className="eyebrow">Hospitality partner workspace</p>
        <h1 className="display-5 fw-bold mb-4">Manage your property applications</h1>
        <ApplicationWorkspace
          existingApplications={state.existingApplications}
          registrationOpen={state.registrationOpen}
        />
      </div>
    </PageShell>
  );
}
