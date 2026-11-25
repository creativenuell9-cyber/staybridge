import "server-only";

import type { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export async function isPublicRegistrationAuthorized(supabase: SupabaseClient) {
  if (process.env.PUBLIC_REGISTRATION_ENABLED !== "true") {
    return false;
  }

  const { data, error } = await supabase.rpc("public_registration_is_authorized");

  if (error) {
    throw new Error(`Could not verify launch authorization: ${error.message}`);
  }

  return data === true;
}
