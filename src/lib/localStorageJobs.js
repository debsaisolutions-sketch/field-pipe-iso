import {
  DRAFT_JOB_KEY,
  JOBS_CLOUD_MIGRATED_KEY,
  LOCAL_JOBS_V2_KEY,
  SAVED_JOBS_STORAGE_KEY,
  TAKEOFF_CLOUD_MIGRATED_KEY,
  TAKEOFF_SETTINGS_STORAGE_KEY,
} from "./constants";
import { unwrapStandardsBlob, wrapStandardsBlob } from "./standardsBundle";

function safeParse(raw, fallback) {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function readLocalTakeoffBundle() {
  if (typeof window === "undefined") return unwrapStandardsBlob(null);
  const parsed = safeParse(window.localStorage.getItem(TAKEOFF_SETTINGS_STORAGE_KEY), null);
  return unwrapStandardsBlob(parsed);
}

export function writeLocalTakeoffBundle(tables, defaultTakeoffType, chartSelection) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      TAKEOFF_SETTINGS_STORAGE_KEY,
      JSON.stringify(wrapStandardsBlob(tables, defaultTakeoffType, chartSelection))
    );
  } catch {
    // quota / private mode
  }
}

export function readLocalTakeoffTable() {
  return readLocalTakeoffBundle().tables.pipe;
}

export function writeLocalTakeoffTable(table) {
  const bundle = readLocalTakeoffBundle();
  writeLocalTakeoffBundle({ ...bundle.tables, pipe: table || bundle.tables.pipe }, bundle.defaultTakeoffType);
}

/** Legacy v1 metadata-only jobs. */
export function readLegacyLocalJobs() {
  if (typeof window === "undefined") return [];
  const parsed = safeParse(window.localStorage.getItem(SAVED_JOBS_STORAGE_KEY), []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => ({
      id: String(item.id || ""),
      name: String(item.name || ""),
      customerLocation: String(item.customerLocation || ""),
      notes: String(item.notes || ""),
    }))
    .filter((item) => item.id);
}

export function readLocalJobsV2() {
  if (typeof window === "undefined") return [];
  const parsed = safeParse(window.localStorage.getItem(LOCAL_JOBS_V2_KEY), []);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item) => item && item.id);
}

export function writeLocalJobsV2(jobs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_JOBS_V2_KEY, JSON.stringify(jobs));
  } catch {
    // ignore
  }
}

export function upsertLocalJobV2(job) {
  const existing = readLocalJobsV2();
  const next = [job, ...existing.filter((j) => j.id !== job.id)];
  writeLocalJobsV2(next);
  return next;
}

export function deleteLocalJobV2(id) {
  const next = readLocalJobsV2().filter((j) => j.id !== id);
  writeLocalJobsV2(next);
  return next;
}

export function writeDraftJob(snapshot) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_JOB_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore
  }
}

export function readDraftJob() {
  if (typeof window === "undefined") return null;
  return safeParse(window.localStorage.getItem(DRAFT_JOB_KEY), null);
}

export function wasJobsMigratedForUser(userId) {
  if (typeof window === "undefined" || !userId) return false;
  const map = safeParse(window.localStorage.getItem(JOBS_CLOUD_MIGRATED_KEY), {});
  return Boolean(map[userId]);
}

export function markJobsMigratedForUser(userId) {
  if (typeof window === "undefined" || !userId) return;
  const map = safeParse(window.localStorage.getItem(JOBS_CLOUD_MIGRATED_KEY), {});
  map[userId] = new Date().toISOString();
  window.localStorage.setItem(JOBS_CLOUD_MIGRATED_KEY, JSON.stringify(map));
}

export function wasTakeoffMigratedForUser(userId) {
  if (typeof window === "undefined" || !userId) return false;
  const map = safeParse(window.localStorage.getItem(TAKEOFF_CLOUD_MIGRATED_KEY), {});
  return Boolean(map[userId]);
}

export function markTakeoffMigratedForUser(userId) {
  if (typeof window === "undefined" || !userId) return;
  const map = safeParse(window.localStorage.getItem(TAKEOFF_CLOUD_MIGRATED_KEY), {});
  map[userId] = new Date().toISOString();
  window.localStorage.setItem(TAKEOFF_CLOUD_MIGRATED_KEY, JSON.stringify(map));
}

/**
 * Build importable full jobs from legacy metadata + any v2 drafts.
 */
export function collectLocalJobsForMigration() {
  const v2 = readLocalJobsV2();
  const byId = new Map(v2.map((j) => [String(j.id), j]));

  for (const legacy of readLegacyLocalJobs()) {
    if (byId.has(legacy.id)) continue;
    byId.set(legacy.id, {
      id: legacy.id,
      job_name: legacy.name || "",
      customer_name: legacy.customerLocation || "",
      job_location: "",
      job_date: null,
      notes: legacy.notes || "",
      pipe_size: '2"',
      segments: [],
      fittings: {},
      calculator_state: {},
      drawing_settings: {},
      takeoff_snapshot: null,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      _localOnly: true,
    });
  }

  return Array.from(byId.values());
}
