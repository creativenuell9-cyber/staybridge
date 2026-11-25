"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export function createSupabaseBrowserClient() {
  const config = getSupabasePublicConfig();
  if (!config) {
    throw new Error("Supabase is not configured. Add the public project URL and key to .env.local.");
  }

  return createBrowserClient(config.url, config.key);
}
