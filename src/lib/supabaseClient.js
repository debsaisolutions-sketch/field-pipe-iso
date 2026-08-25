import { createClient } from "@supabase/supabase-js";

let client = null;

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return { url, anonKey, configured: Boolean(url && anonKey) };
}

/** Browser anon client only — never embed a service-role key. */
export function getSupabaseBrowserClient() {
  const { url, anonKey, configured } = getSupabaseConfig();
  if (!configured) return null;
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

export async function applyBridgeSession(session) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !session?.access_token || !session?.refresh_token) {
    return { ok: false, error: "missing_session" };
  }
  const { data, error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, session: data.session, user: data.user || data.session?.user };
}

export async function clearBridgeSession() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // ignore
  }
}
