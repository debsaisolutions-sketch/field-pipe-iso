import { getSupabaseBrowserClient } from "./supabaseClient";
import { rowFromSnapshot, listItemFromRow } from "./jobSnapshot";

export async function listCloudJobs() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, error: "not_configured", jobs: [] };

  const { data, error } = await supabase
    .from("psp_jobs")
    .select(
      "id, job_name, customer_name, job_location, job_date, notes, pipe_size, calculator_state, updated_at, created_at"
    )
    .order("updated_at", { ascending: false });

  if (error) return { ok: false, error: error.message, jobs: [] };
  return {
    ok: true,
    jobs: (data || []).map((row) => listItemFromRow({ ...row, _source: "cloud" })),
  };
}

export async function getCloudJob(id) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, error: "not_configured", job: null };

  const { data, error } = await supabase
    .from("psp_jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return { ok: false, error: error.message, job: null };
  return { ok: true, job: data };
}

export async function saveCloudJob(snapshot, userId, existingId) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, error: "not_configured" };
  if (!userId) return { ok: false, error: "not_authenticated" };

  const payload = rowFromSnapshot(snapshot, userId);

  if (existingId && !String(existingId).startsWith("local-")) {
    const { data, error } = await supabase
      .from("psp_jobs")
      .update(payload)
      .eq("id", existingId)
      .eq("user_id", userId)
      .select("*")
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    return { ok: true, job: data };
  }

  const { data, error } = await supabase
    .from("psp_jobs")
    .insert(payload)
    .select("*")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  return { ok: true, job: data };
}

export async function deleteCloudJob(id, userId) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, error: "not_configured" };
  if (String(id).startsWith("local-")) return { ok: true };

  const { error } = await supabase
    .from("psp_jobs")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function duplicateCloudJob(id, userId) {
  const loaded = await getCloudJob(id);
  if (!loaded.ok || !loaded.job) return loaded;

  const original = loaded.job;
  const payload = {
    ...rowFromSnapshot(original, userId),
    job_name: `${original.job_name || "Untitled Job"} (copy)`,
  };

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("psp_jobs")
    .insert(payload)
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  return { ok: true, job: data };
}

export async function importLocalJobsToCloud(localJobs, userId) {
  if (!localJobs.length) return { ok: true, imported: 0 };
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, error: "not_configured", imported: 0 };

  const rows = localJobs.map((job) => {
    const snapshot = {
      job_name: job.job_name || job.name || "",
      customer_name: job.customer_name || job.customerLocation || "",
      job_location: job.job_location || "",
      job_date: job.job_date || null,
      notes: job.notes || "",
      pipe_size: job.pipe_size || '2"',
      segments: job.segments || [],
      fittings: job.fittings || {},
      calculator_state: job.calculator_state || {},
      drawing_settings: job.drawing_settings || {},
      takeoff_snapshot: job.takeoff_snapshot || null,
    };
    return rowFromSnapshot(snapshot, userId);
  });

  const { data, error } = await supabase.from("psp_jobs").insert(rows).select("id");
  if (error) return { ok: false, error: error.message, imported: 0 };
  return { ok: true, imported: data?.length || 0 };
}
