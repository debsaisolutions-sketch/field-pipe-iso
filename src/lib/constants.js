/** Shared catalogs — keep Blue Book / original app values stable. */

export const PIPE_SIZES = [
  '1/2"',
  '3/4"',
  '1"',
  '1-1/4"',
  '1-1/2"',
  '2"',
  '3"',
  '4"',
  '6"',
];

export const FITTING_TYPES = [
  "90 elbow",
  "45 elbow",
  "tee",
  "reducer",
  "coupling",
  "flange",
  "valve",
];

export const EMPTY_FITTING_COUNTS = Object.fromEntries(
  FITTING_TYPES.map((fitting) => [fitting, 0])
);

export const DIRECTION_OPTIONS = [
  { value: "east", label: "East" },
  { value: "west", label: "West" },
  { value: "north", label: "North" },
  { value: "south", label: "South" },
  { value: "up", label: "Up" },
  { value: "down", label: "Down" },
];

export const DIRECTION_VECTOR = {
  east: [1, 0, 0],
  west: [-1, 0, 0],
  north: [0, 1, 0],
  south: [0, -1, 0],
  up: [0, 0, 1],
  down: [0, 0, -1],
};

export const FITTING_COLUMN_LABELS = {
  "90 elbow": "90°",
  "45 elbow": "45°",
  tee: "Tee",
  reducer: "Red.",
  coupling: "Cplg",
  flange: "Flg",
  valve: "Valve",
};

export const SAVED_JOBS_STORAGE_KEY = "field-pipe-iso.saved-jobs.v1";
export const TAKEOFF_SETTINGS_STORAGE_KEY = "field-pipe-iso.takeoff-settings.v1";
export const LOCAL_JOBS_V2_KEY = "field-pipe-iso.saved-jobs.v2";
export const JOBS_CLOUD_MIGRATED_KEY = "field-pipe-iso.jobs-cloud-migrated.v1";
export const TAKEOFF_CLOUD_MIGRATED_KEY = "field-pipe-iso.takeoff-cloud-migrated.v1";
export const DRAFT_JOB_KEY = "field-pipe-iso.draft-job.v1";
