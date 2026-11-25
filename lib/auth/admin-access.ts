import "server-only";

import { isAuthSessionMissingError, type User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ADMIN_ROLES = ["administrator", "super_administrator"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export type AdminAccess =
  | { status: "signed_out" }
  | { status: "forbidden" }
  | {
      status: "mfa_required";
      user: User;
      fullName: string | null;
      role: AdminRole;
    }
  | {
      status: "authorized";
      user: User;
      fullName: string | null;
      role: AdminRole;
      supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
    };

export async function getAdminAccess(): Promise<AdminAccess> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    if (isAuthSessionMissingError(userError)) {
      return { status: "signed_out" };
    }

    throw new Error(`Could not verify the current user: ${userError.message}`);
  }

  if (!user) {
    return { status: "signed_out" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Could not load the current profile: ${profileError.message}`);
  }

  if (!profile || !ADMIN_ROLES.includes(profile.role)) {
    return { status: "forbidden" };
  }

  const { data: assurance, error: assuranceError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (assuranceError) {
    throw new Error(`Could not verify administrator MFA: ${assuranceError.message}`);
  }

  if (assurance.currentLevel !== "aal2") {
    return {
      status: "mfa_required",
      user,
      fullName: profile.full_name,
      role: profile.role,
    };
  }

  return {
    status: "authorized",
    user,
    fullName: profile.full_name,
    role: profile.role,
    supabase,
  };
}
