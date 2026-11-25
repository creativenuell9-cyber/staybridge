import "server-only";

import { z } from "zod";
import type { AdminRole } from "@/lib/auth/admin-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const applicationSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  version: z.number(),
  submitted_at: z.string().nullable(),
  organization: z.object({
    legal_name: z.string(),
    business_email: z.string(),
    business_phone: z.string(),
  }),
  property: z.object({
    id: z.string().uuid(),
    name: z.string(),
    category: z.string(),
    description: z.string(),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    property_photos: z.array(
      z.object({
        id: z.string().uuid(),
        storage_path: z.string(),
        alt_text: z.string(),
      }),
    ),
    property_documents: z.array(
      z.object({
        id: z.string().uuid(),
        storage_path: z.string(),
        document_type: z.string(),
      }),
    ),
    rooms: z.array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        price_per_night: z.coerce.number(),
      }),
    ),
  }),
});

type ParsedApplication = z.infer<typeof applicationSchema>;

export type AdminApplication = Omit<ParsedApplication, "property"> & {
  property: Omit<ParsedApplication["property"], "property_photos" | "property_documents"> & {
    property_photos: {
      id: string;
      alt_text: string;
      url: string | null;
    }[];
    property_documents: {
      id: string;
      document_type: string;
      url: string | null;
    }[];
  };
};

async function createSignedUrlMap(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  bucket: string,
  paths: string[],
) {
  if (!paths.length) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, 300);
  if (error) {
    throw new Error(`Could not create secure links for ${bucket}: ${error.message}`);
  }

  const signedUrls = new Map<string, string>();
  (data ?? []).forEach((item) => {
    if (item.path && item.signedUrl) {
      signedUrls.set(item.path, item.signedUrl);
    }
  });
  return signedUrls;
}

export async function getAdminDashboardData(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  role: AdminRole,
) {
  const [
    { data: applicationRows, error: applicationsError },
    { count: pendingCount, error: pendingError },
    { count: activeCount, error: activeError },
    { data: launchAuthorized, error: launchError },
    { data: securityChecks, error: checksError },
    { data: founderRows, error: foundersError },
    { data: approvalRows, error: approvalsError },
  ] = await Promise.all([
    supabase
      .from("applications")
      .select(
        "id,status,version,submitted_at,organization:organizations(legal_name,business_email,business_phone),property:properties!inner(id,name,category,description,address,city,state,property_photos(id,storage_path,alt_text),property_documents(id,storage_path,document_type),rooms(id,name,price_per_night))",
      )
      .in("status", ["submitted", "pending_review", "information_requested"])
      .order("submitted_at", { ascending: true })
      .limit(100),
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .in("status", ["submitted", "pending_review", "information_requested"]),
    supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("publication_status", "active"),
    supabase.rpc("public_registration_is_authorized"),
    supabase.from("launch_security_checks").select("check_key,description,required,passed,evidence"),
    supabase.from("founder_authorizations").select("profile_id"),
    supabase
      .from("launch_approvals")
      .select("founder_profile_id,approved,created_at")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
  ]);

  const errors = [
    applicationsError,
    pendingError,
    activeError,
    launchError,
    checksError,
    foundersError,
    approvalsError,
  ].filter(Boolean);

  if (errors.length) {
    throw new Error(
      `Could not load the administrator dashboard: ${errors
        .map((error) => error?.message)
        .join("; ")}`,
    );
  }

  const applications = z.array(applicationSchema).parse(applicationRows ?? []);
  const photoPaths = applications.flatMap((application) =>
    application.property.property_photos.map((photo) => photo.storage_path),
  );
  const documentPaths = applications.flatMap((application) =>
    application.property.property_documents.map((document) => document.storage_path),
  );
  const [photoUrls, documentUrls] = await Promise.all([
    createSignedUrlMap(supabase, "property-photos", photoPaths),
    createSignedUrlMap(supabase, "business-documents", documentPaths),
  ]);

  const latestFounderApprovals = new Map<string, boolean>();
  (approvalRows ?? []).forEach((approval) => {
    if (!latestFounderApprovals.has(approval.founder_profile_id)) {
      latestFounderApprovals.set(approval.founder_profile_id, approval.approved);
    }
  });

  const checks = (securityChecks ?? []).map((check) => ({
    key: check.check_key,
    description: check.description,
    required: check.required,
    passed: check.passed,
    evidence: check.evidence,
  }));
  const authorizedFounders = founderRows ?? [];
  const allFoundersApproved =
    authorizedFounders.length === 2 &&
    authorizedFounders.every((founder) => latestFounderApprovals.get(founder.profile_id) === true);
  const approvedFounderCount = authorizedFounders.filter(
    (founder) => latestFounderApprovals.get(founder.profile_id) === true,
  ).length;

  return {
    applications: applications.map((application) => ({
      ...application,
      property: {
        ...application.property,
        property_photos: application.property.property_photos.map((photo) => ({
          id: photo.id,
          alt_text: photo.alt_text,
          url: photoUrls.get(photo.storage_path) ?? null,
        })),
        property_documents: application.property.property_documents.map((document) => ({
          id: document.id,
          document_type: document.document_type,
          url: documentUrls.get(document.storage_path) ?? null,
        })),
      },
    })),
    pendingCount: pendingCount ?? 0,
    activeCount: activeCount ?? 0,
    launchAuthorized: launchAuthorized === true,
    registrationEnabled:
      process.env.PUBLIC_REGISTRATION_ENABLED === "true" && launchAuthorized === true,
    securityChecks: checks,
    allFoundersApproved,
    founderCount: authorizedFounders.length,
    approvedFounderCount,
    isAuthorizedFounder: authorizedFounders.some((founder) => founder.profile_id === userId),
    isSuperAdministrator: role === "super_administrator",
    currentFounderApproval: latestFounderApprovals.get(userId) ?? null,
    requiredCheckCount: checks.filter((check) => check.required).length,
    passedCheckCount: checks.filter((check) => check.required && check.passed).length,
  };
}
