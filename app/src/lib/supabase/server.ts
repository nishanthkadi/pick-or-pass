import { createClient } from "@supabase/supabase-js";

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super("Supabase is not configured.");
    this.name = "SupabaseNotConfiguredError";
  }
}

export function getSupabaseAdminClient() {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new SupabaseNotConfiguredError();
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getSavedListingPhotoBucket() {
  return process.env.SUPABASE_SAVED_LISTINGS_BUCKET?.trim() || "saved-listing-photos";
}
