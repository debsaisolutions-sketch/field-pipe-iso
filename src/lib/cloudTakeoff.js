import { getSupabaseBrowserClient } from "./supabaseClient";
import { cloneDefaultTakeoffTable, normalizeStoredTakeoffTable } from "./takeoff";

export async function loadCloudTakeoffStandards(userId) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !userId) return { ok: false, error: "not_ready", table: null };

  const { data, error } = await supabase
    .from("psp_takeoff_standards")
    .select("*")
    .eq("user_id", userId)
    .is("account_id", null)
    .maybeSingle();

  if (error) return { ok: false, error: error.message, table: null };
  if (!data) return { ok: true, table: null, row: null };
  return {
    ok: true,
    table: normalizeStoredTakeoffTable(data.standards),
    row: data,
  };
}

export async function saveCloudTakeoffStandards(userId, table, existingId) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !userId) return { ok: false, error: "not_ready" };

  const standards = normalizeStoredTakeoffTable(table);
  const payload = {
    user_id: userId,
    account_id: null,
    name: "My Standards",
    standards,
    is_account_default: true,
  };

  if (existingId) {
    const { data, error } = await supabase
      .from("psp_takeoff_standards")
      .update({ standards, name: "My Standards" })
      .eq("id", existingId)
      .eq("user_id", userId)
      .select("*")
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    return { ok: true, row: data };
  }

  const { data, error } = await supabase
    .from("psp_takeoff_standards")
    .insert(payload)
    .select("*")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      const existing = await loadCloudTakeoffStandards(userId);
      if (existing.row?.id) {
        return saveCloudTakeoffStandards(userId, table, existing.row.id);
      }
    }
    return { ok: false, error: error.message };
  }
  return { ok: true, row: data };
}

export async function resetCloudTakeoffToDefaults(userId, existingId) {
  const defaults = cloneDefaultTakeoffTable();
  return saveCloudTakeoffStandards(userId, defaults, existingId);
}
