import { getSupabaseBrowserClient } from "./supabaseClient";
import { wrapStandardsBlob, unwrapStandardsBlob } from "./standardsBundle";

export async function loadCloudTakeoffStandards(userId) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !userId) return { ok: false, error: "not_ready", table: null, bundle: null };

  const { data, error } = await supabase
    .from("psp_takeoff_standards")
    .select("*")
    .eq("user_id", userId)
    .is("account_id", null)
    .maybeSingle();

  if (error) return { ok: false, error: error.message, table: null, bundle: null };
  if (!data) return { ok: true, table: null, bundle: null, row: null };
  const bundle = unwrapStandardsBlob(data.standards);
  return {
    ok: true,
    table: bundle.tables.pipe,
    bundle,
    row: data,
  };
}

export async function saveCloudTakeoffStandards(
  userId,
  tablesOrPipe,
  existingId,
  defaultTakeoffType,
  chartSelection
) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !userId) return { ok: false, error: "not_ready" };

  const tables =
    tablesOrPipe && tablesOrPipe.pipe
      ? tablesOrPipe
      : { ...unwrapStandardsBlob(null).tables, pipe: tablesOrPipe };
  const standards = wrapStandardsBlob(tables, defaultTakeoffType, chartSelection);
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
        return saveCloudTakeoffStandards(userId, tables, existing.row.id, defaultTakeoffType);
      }
    }
    return { ok: false, error: error.message };
  }
  return { ok: true, row: data };
}

export async function resetCloudTakeoffToDefaults(userId, existingId, tables, defaultTakeoffType) {
  const next = tables || unwrapStandardsBlob(null).tables;
  return saveCloudTakeoffStandards(userId, next, existingId, defaultTakeoffType);
}

