"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const anonymousAuthEnabled = process.env.NEXT_PUBLIC_ENABLE_ANONYMOUS_AUTH === "true";

let supabaseClient: ReturnType<typeof createClient> | null = null;

export async function getSupabaseAccessToken() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return resolveAccessToken();
}

async function resolveAccessToken() {
  supabaseClient ??= createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  });

  const currentSession = await supabaseClient.auth.getSession();
  if (currentSession.data.session?.access_token) {
    return currentSession.data.session.access_token;
  }

  if (!anonymousAuthEnabled) {
    return null;
  }

  const anonymousSession = await supabaseClient.auth.signInAnonymously();

  return anonymousSession.data.session?.access_token ?? null;
}
