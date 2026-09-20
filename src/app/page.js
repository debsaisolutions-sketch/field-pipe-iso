"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DimensionSummary from "@/components/DimensionSummary";
import JobDashboard from "@/components/JobDashboard";
import PrintDocument from "@/components/PrintDocument";
import TakeoffTypeBar from "@/components/TakeoffTypeBar";
import TradeInputsPanel from "@/components/TradeInputsPanel";
import {
  CONDUIT_TYPES,
  DIRECTION_OPTIONS,
  DIRECTION_VECTOR,
  EMPTY_FITTING_COUNTS,
} from "@/lib/constants";
import { subscribeParentAuth } from "@/lib/authBridge";
import {
  deleteCloudJob,
  duplicateCloudJob,
  getCloudJob,
  importLocalJobsToCloud,
  listCloudJobs,
  saveCloudJob,
} from "@/lib/cloudJobs";
import {
  loadCloudTakeoffStandards,
  saveCloudTakeoffStandards,
} from "@/lib/cloudTakeoff";
import { DEFAULT_PLAN, resolveFeatures } from "@/lib/features";
import {
  CHART_IDS,
  emptyChartSelection,
} from "@/lib/charts/chartTypes";
import {
  conduitLabelFromMaterial,
  normalizeChartSelection,
  resolveActiveTakeoffChart,
} from "@/lib/charts/resolveTakeoffChart";
import {
  buildKnownLengthFromCalculatorRun,
  buildOverallSketchPoints,
  projectPoint,
  toInches,
} from "@/lib/geometry";
import {
  buildJobSnapshot,
  createDefaultCalculatorRuns,
  createDefaultSegment,
  createEmptyJobMeta,
  listItemFromRow,
  snapshotToEditorState,
} from "@/lib/jobSnapshot";
import {
  collectLocalJobsForMigration,
  deleteLocalJobV2,
  markJobsMigratedForUser,
  markTakeoffMigratedForUser,
  readLocalJobsV2,
  readLocalTakeoffBundle,
  upsertLocalJobV2,
  wasJobsMigratedForUser,
  wasTakeoffMigratedForUser,
  writeLocalTakeoffBundle,
} from "@/lib/localStorageJobs";
import {
  applyBridgeSession,
  clearBridgeSession,
  getSupabaseConfig,
} from "@/lib/supabaseClient";
import {
  cloneDefaultTakeoffTable,
  normalizeStoredTakeoffTable,
} from "@/lib/takeoff";
import {
  fittingButtonLabel,
  fittingColumnLabel,
  getPreset,
} from "@/lib/takeoffPresets";
import {
  computeMaterialTotals,
  computeOverallLengthCalc,
  computeSegmentRows,
  filterSegmentRows,
  formatRunDrawingLabel,
} from "@/lib/runTakeoff";
import { buildMaterialList } from "@/lib/materialList";
import {
  createDefaultTakeoffTables,
  readDefaultTakeoffType,
  writeDefaultTakeoffType,
} from "@/lib/standardsBundle";
import {
  buildResetStateForType,
  createDefaultSegmentForPreset,
  hasMeaningfulTakeoffData,
  SWITCH_WARNING,
} from "@/lib/takeoffSwitch";
import { createDefaultTradeInputs } from "@/lib/tradeCalcs";
import { normalizeTakeoffType } from "@/lib/takeoffTypes";
import styles from "./page.module.css";

function newLocalJobId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mergeJobLists(cloudJobs, localJobs) {
  const byId = new Map();
  for (const job of localJobs) {
    byId.set(String(job.id), listItemFromRow({ ...job, _source: "local" }));
  }
  for (const job of cloudJobs) {
    byId.set(String(job.id), job);
  }
  return Array.from(byId.values()).sort((a, b) => {
    const aTime = new Date(a.updated_at || 0).getTime();
    const bTime = new Date(b.updated_at || 0).getTime();
    return bTime - aTime;
  });
}

export default function Home() {
  const [job, setJob] = useState(() => createEmptyJobMeta());
  const [currentJobId, setCurrentJobId] = useState(null);
  const [pipeSize, setPipeSize] = useState('2"');
  const [segments, setSegments] = useState(() => [createDefaultSegment()]);
  const [extraFittings, setExtraFittings] = useState({ ...EMPTY_FITTING_COUNTS });
  const [rotateTurns, setRotateTurns] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [overallLength, setOverallLength] = useState("120");
  const [overallUnit, setOverallUnit] = useState("inches");
  const [overallPipeSize, setOverallPipeSize] = useState('2"');
  const [overallFittings, setOverallFittings] = useState({ ...EMPTY_FITTING_COUNTS });
  const [overallSketchMode, setOverallSketchMode] = useState("none");
  const [overallSketchLength, setOverallSketchLength] = useState(0);
  const [materialSource, setMaterialSource] = useState("manual");
  const [overallMaterialFittings, setOverallMaterialFittings] = useState({
    ...EMPTY_FITTING_COUNTS,
  });
  const [takeoffTables, setTakeoffTables] = useState(() => createDefaultTakeoffTables());
  const [takeoffType, setTakeoffType] = useState("pipe");
  const [categories, setCategories] = useState({});
  const [tradeInputs, setTradeInputs] = useState(() => createDefaultTradeInputs());
  const [conduitType, setConduitType] = useState("EMT");
  const [chartSelection, setChartSelection] = useState(() => emptyChartSelection());
  const [defaultTypeNote, setDefaultTypeNote] = useState("");
  const nextCalculatorRunId = useRef(2);
  const [calculatorRuns, setCalculatorRuns] = useState(() => createDefaultCalculatorRuns());

  const [authUser, setAuthUser] = useState(null);
  const [plan, setPlan] = useState(DEFAULT_PLAN);
  const [features, setFeatures] = useState(() => resolveFeatures(DEFAULT_PLAN));
  const [userEmail, setUserEmail] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [migrationNote, setMigrationNote] = useState("");
  const [showDashboard, setShowDashboard] = useState(false);
  const [jobList, setJobList] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [cloudTakeoffRowId, setCloudTakeoffRowId] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const supabaseConfigured = getSupabaseConfig().configured;
  const cloudEnabled = Boolean(
    features.cloudJobs && authUser?.id && supabaseConfigured
  );

  const preset = getPreset(takeoffType);
  const chartResolved = useMemo(
    () =>
      resolveActiveTakeoffChart({
        takeoffType,
        chartSelection,
        takeoffTables,
      }),
    [takeoffType, chartSelection, takeoffTables]
  );
  const takeoffTable =
    chartResolved.table || takeoffTables[takeoffType] || takeoffTables.pipe || cloneDefaultTakeoffTable();
  const fittingTypes = preset.fittingIds.length ? preset.fittingIds : Object.keys(EMPTY_FITTING_COUNTS);

  useEffect(() => {
    const bundle = readLocalTakeoffBundle();
    const pref = normalizeTakeoffType(readDefaultTakeoffType() || bundle.defaultTakeoffType);
    // Hydrate after mount so SSR/client first paint stay aligned.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is not available during SSR
    setTakeoffTables(bundle.tables);
    if (bundle.chartSelection) {
      setChartSelection(bundle.chartSelection);
    }
    if (pref !== "pipe") {
      const reset = buildResetStateForType(pref, createEmptyJobMeta());
      setTakeoffType(reset.takeoffType);
      setCategories(reset.categories);
      setPipeSize(reset.pipeSize);
      setOverallPipeSize(reset.overallPipeSize);
      setSegments(reset.segments);
      setExtraFittings(reset.extraFittings);
      setOverallFittings(reset.overallFittings);
      setOverallMaterialFittings(reset.overallMaterialFittings);
      setTradeInputs(reset.tradeInputs);
      setConduitType(reset.conduitType);
      setChartSelection(reset.chartSelection || emptyChartSelection());
    }
  }, []);

  useEffect(() => {
    const cleanup = subscribeParentAuth({
      onSession: async (session, meta) => {
        const nextPlan = meta?.plan || DEFAULT_PLAN;
        setPlan(nextPlan);
        setFeatures(meta?.features || resolveFeatures(nextPlan));
        setUserEmail(meta?.userEmail || "");

        if (!session?.access_token) {
          await clearBridgeSession();
          setAuthUser(null);
          setCloudTakeoffRowId(null);
          setAuthReady(true);
          return;
        }

        const applied = await applyBridgeSession(session);
        if (!applied.ok) {
          setAuthUser(null);
          setSaveStatus(`Sign-in bridge failed: ${applied.error}`);
          setAuthReady(true);
          return;
        }

        const user = applied.user || applied.session?.user || null;
        setAuthUser(user);
        setAuthReady(true);
      },
    });
    // Standalone (not embedded): still mark ready so local mode works.
    const t = window.setTimeout(() => setAuthReady(true), 400);
    return () => {
      cleanup();
      window.clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (!authReady) return;

    let cancelled = false;

    async function syncAfterAuth() {
      const localJobs = readLocalJobsV2();
      setJobList(mergeJobLists([], localJobs));

      if (!cloudEnabled || !authUser?.id) return;

      const resolved = resolveFeatures(plan);
      if (resolved.companyStandards) {
        const cloudTakeoff = await loadCloudTakeoffStandards(authUser.id);
        if (cancelled) return;
        if (cloudTakeoff.ok && cloudTakeoff.bundle) {
          setTakeoffTables(cloudTakeoff.bundle.tables);
          if (cloudTakeoff.bundle.chartSelection) {
            setChartSelection(cloudTakeoff.bundle.chartSelection);
          }
          writeLocalTakeoffBundle(
            cloudTakeoff.bundle.tables,
            cloudTakeoff.bundle.defaultTakeoffType || readDefaultTakeoffType(),
            cloudTakeoff.bundle.chartSelection
          );
          setCloudTakeoffRowId(cloudTakeoff.row?.id || null);
          if (cloudTakeoff.bundle.defaultTakeoffType) {
            writeDefaultTakeoffType(cloudTakeoff.bundle.defaultTakeoffType);
          }
        } else if (!wasTakeoffMigratedForUser(authUser.id)) {
          const localBundle = readLocalTakeoffBundle();
          const saved = await saveCloudTakeoffStandards(
            authUser.id,
            localBundle.tables,
            null,
            localBundle.defaultTakeoffType || readDefaultTakeoffType(),
            localBundle.chartSelection
          );
          if (!cancelled && saved.ok) {
            setCloudTakeoffRowId(saved.row?.id || null);
            markTakeoffMigratedForUser(authUser.id);
          }
        }
      }

      if (!wasJobsMigratedForUser(authUser.id)) {
        const toImport = collectLocalJobsForMigration();
        if (toImport.length > 0) {
          const result = await importLocalJobsToCloud(toImport, authUser.id);
          if (!cancelled) {
            if (result.ok) {
              markJobsMigratedForUser(authUser.id);
              setMigrationNote(
                result.imported > 0
                  ? `Migrated ${result.imported} local job(s) to cloud.`
                  : ""
              );
            } else {
              setMigrationNote(`Cloud migration skipped: ${result.error}`);
            }
          }
        } else {
          markJobsMigratedForUser(authUser.id);
        }
      }

      const listed = await listCloudJobs();
      if (cancelled) return;
      if (listed.ok) {
        setJobList(mergeJobLists(listed.jobs, readLocalJobsV2()));
      }
    }

    syncAfterAuth();
    return () => {
      cancelled = true;
    };
  }, [authReady, authUser?.id, cloudEnabled, plan]);

  const segmentRows = useMemo(() => {
    return computeSegmentRows(segments, takeoffTable, pipeSize);
  }, [segments, pipeSize, takeoffTable]);

  const visibleSegmentRows = useMemo(() => {
    return filterSegmentRows(segmentRows, preset, categories);
  }, [segmentRows, preset, categories]);

  const materialTotals = useMemo(() => {
    return computeMaterialTotals({
      materialSource,
      fittingTypes,
      extraFittings,
      overallMaterialFittings,
      segmentRows: visibleSegmentRows,
      takeoffTable,
      size: pipeSize,
    });
  }, [
    extraFittings,
    visibleSegmentRows,
    materialSource,
    overallMaterialFittings,
    takeoffTable,
    pipeSize,
    fittingTypes,
  ]);

  const overallLengthCalc = useMemo(() => {
    return computeOverallLengthCalc({
      overallLength,
      overallUnit,
      overallSize: overallPipeSize,
      overallFittings,
      takeoffTable,
      fittingTypes,
    });
  }, [overallLength, overallUnit, overallPipeSize, overallFittings, takeoffTable, fittingTypes]);

  const materialList = useMemo(() => {
    return buildMaterialList({
      preset,
      categories,
      size: pipeSize,
      conduitType,
      materialTotals,
      tradeInputs,
      extraLines: {
        flexFeet: tradeInputs.hvacFlexFeet,
        equipmentCount: tradeInputs.hvacEquipmentCount,
        conductorFeet: tradeInputs.conductorFeet,
      },
      includeZeroFittings: true,
    });
  }, [preset, categories, pipeSize, conduitType, materialTotals, tradeInputs]);

  const printMaterialList = useMemo(() => {
    return buildMaterialList({
      preset,
      categories,
      size: pipeSize,
      conduitType,
      materialTotals,
      tradeInputs,
      extraLines: {
        flexFeet: tradeInputs.hvacFlexFeet,
        equipmentCount: tradeInputs.hvacEquipmentCount,
        conductorFeet: tradeInputs.conductorFeet,
      },
      includeZeroFittings: false,
    });
  }, [preset, categories, pipeSize, conduitType, materialTotals, tradeInputs]);

  const calculatorRunTotals = useMemo(() => {
    const totalInches = calculatorRuns.reduce(
      (sum, run) => sum + toInches(run.length, run.unit),
      0
    );
    const differenceInches = totalInches - overallLengthCalc.overallInches;

    return {
      totalInches,
      differenceInches,
      matchesOverall: Math.abs(differenceInches) < 0.01,
    };
  }, [calculatorRuns, overallLengthCalc.overallInches]);

  const drawingModel = useMemo(() => {
    let points3d = buildOverallSketchPoints(overallSketchMode, overallSketchLength);

    if (!points3d) {
      let cursor = [0, 0, 0];
      points3d = [cursor];

      for (const row of segmentRows) {
        const scalar = row.known > 0 ? row.known : 0;
        const [vx, vy, vz] = DIRECTION_VECTOR[row.direction] || [1, 0, 0];
        cursor = [cursor[0] + vx * scalar, cursor[1] + vy * scalar, cursor[2] + vz * scalar];
        points3d.push(cursor);
      }
    }

    const points2d = points3d.map((point) => projectPoint(point, rotateTurns, flipped));
    const xs = points2d.map((point) => point[0]);
    const ys = points2d.map((point) => point[1]);
    const minX = Math.min(...xs, 0);
    const minY = Math.min(...ys, 0);
    const maxX = Math.max(...xs, 1);
    const maxY = Math.max(...ys, 1);
    const width = maxX - minX;
    const height = maxY - minY;
    const innerWidth = 640;
    const innerHeight = 360;
    const padding = 32;
    const scale = Math.min(
      (innerWidth - padding * 2) / Math.max(width, 1),
      (innerHeight - padding * 2) / Math.max(height, 1)
    );

    const normalized = points2d.map(([x, y]) => [
      (x - minX) * scale + padding,
      (y - minY) * scale + padding,
    ]);

    return {
      points: normalized,
      width: innerWidth,
      height: innerHeight,
    };
  }, [segmentRows, rotateTurns, flipped, overallSketchMode, overallSketchLength]);

  const printWarnings = useMemo(() => {
    const warnings = [...(materialList.warnings || [])];
    if (preset.layout === "runs" && overallLengthCalc.isNonPositive) {
      warnings.push(
        "Estimated straight cut length from the overall calculator is zero or negative."
      );
    }
    if (preset.layout === "runs") {
      for (const segment of segmentRows) {
        if (segment.known > 0 && segment.cutLength <= 0) {
          warnings.push(
            `${segment.label || "A run"} has takeoff greater than or equal to known length.`
          );
        }
      }
    }
    return warnings;
  }, [overallLengthCalc.isNonPositive, segmentRows, materialList.warnings, preset.layout]);

  function updateJobField(field, value) {
    setJob((prev) => ({ ...prev, [field]: value }));
  }

  function applyEditorState(state) {
    const type = normalizeTakeoffType(state.takeoffType);
    const nextPreset = getPreset(type);
    setCurrentJobId(state.id || null);
    setJob(state.job);
    setTakeoffType(type);
    setCategories(state.categories || { ...nextPreset.defaultCategories });
    setTradeInputs(state.tradeInputs || createDefaultTradeInputs());
    setConduitType(state.conduitType || "EMT");
    setChartSelection(
      state.chartSelection
        ? normalizeChartSelection(state.chartSelection, { conduitType: state.conduitType })
        : emptyChartSelection()
    );
    setPipeSize(state.pipeSize);
    setSegments(state.segments);
    setExtraFittings(state.extraFittings || { ...EMPTY_FITTING_COUNTS });
    setMaterialSource(state.materialSource || "manual");
    setOverallMaterialFittings(state.overallMaterialFittings || { ...EMPTY_FITTING_COUNTS });
    setOverallLength(String(state.overallLength ?? "120"));
    setOverallUnit(state.overallUnit || "inches");
    setOverallPipeSize(state.overallPipeSize || state.pipeSize || '2"');
    setOverallFittings(state.overallFittings || { ...EMPTY_FITTING_COUNTS });
    setCalculatorRuns(state.calculatorRuns || createDefaultCalculatorRuns());
    setOverallSketchMode(state.overallSketchMode || "none");
    setOverallSketchLength(Number(state.overallSketchLength) || 0);
    setRotateTurns(Number(state.rotateTurns) || 0);
    setFlipped(Boolean(state.flipped));
    if (state.takeoffSnapshot && type === "pipe") {
      setTakeoffTables((prev) => ({
        ...prev,
        pipe: normalizeStoredTakeoffTable(state.takeoffSnapshot),
      }));
    } else if (state.takeoffSnapshot && nextPreset.showTakeoffChart) {
      setTakeoffTables((prev) => ({
        ...prev,
        [type]: state.takeoffSnapshot,
      }));
    }
    const maxRunNum = (state.calculatorRuns || []).reduce((max, run) => {
      const match = String(run.id || "").match(/run-(\d+)/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 1);
    nextCalculatorRunId.current = maxRunNum + 1;
  }

  function applyTypeReset(nextType, { skipConfirm = false } = {}) {
    if (
      !skipConfirm &&
      hasMeaningfulTakeoffData(
        {
          segments,
          extraFittings,
          overallFittings,
          calculatorRuns,
          tradeInputs,
        },
        preset
      )
    ) {
      if (!window.confirm(SWITCH_WARNING)) return false;
    }
    const reset = buildResetStateForType(nextType, job);
    setTakeoffType(reset.takeoffType);
    setCategories(reset.categories);
    setPipeSize(reset.pipeSize);
    setOverallPipeSize(reset.overallPipeSize);
    setSegments(reset.segments);
    setExtraFittings(reset.extraFittings);
    setOverallFittings(reset.overallFittings);
    setOverallMaterialFittings(reset.overallMaterialFittings);
    setMaterialSource(reset.materialSource);
    setCalculatorRuns(reset.calculatorRuns);
    setOverallLength(reset.overallLength);
    setOverallUnit(reset.overallUnit);
    setOverallSketchMode(reset.overallSketchMode);
    setOverallSketchLength(reset.overallSketchLength);
    setRotateTurns(reset.rotateTurns);
    setFlipped(reset.flipped);
    setTradeInputs(reset.tradeInputs);
    setConduitType(reset.conduitType);
    setChartSelection(reset.chartSelection || emptyChartSelection());
    nextCalculatorRunId.current = 2;
    return true;
  }

  function resetEditorToBlank() {
    const pref = readDefaultTakeoffType() || "pipe";
    const reset = buildResetStateForType(pref, createEmptyJobMeta());
    applyEditorState({
      ...reset,
      id: null,
      takeoffSnapshot: null,
    });
    nextCalculatorRunId.current = 2;
    setSaveStatus("");
  }

  function currentSnapshot(overrideId) {
    return buildJobSnapshot({
      id: overrideId ?? currentJobId,
      job,
      pipeSize,
      segments,
      extraFittings,
      rotateTurns,
      flipped,
      overallLength,
      overallUnit,
      overallPipeSize,
      overallFittings,
      overallSketchMode,
      overallSketchLength,
      materialSource,
      overallMaterialFittings,
      calculatorRuns,
      takeoffTable,
      takeoffType,
      categories,
      tradeInputs,
      conduitType,
      chartSelection,
    });
  }

  async function refreshJobList() {
    const localJobs = readLocalJobsV2();
    if (cloudEnabled) {
      const listed = await listCloudJobs();
      if (listed.ok) {
        setJobList(mergeJobLists(listed.jobs, localJobs));
        return;
      }
    }
    setJobList(mergeJobLists([], localJobs));
  }

  async function saveCurrentJob() {
    const hasContent =
      job.name.trim() ||
      job.customer.trim() ||
      job.location.trim() ||
      job.notes.trim() ||
      segments.length > 0;

    if (!hasContent) {
      setSaveStatus("Nothing to save yet — add a job name or runs.");
      return;
    }

    setSaveStatus("Saving…");
    const idForSave = currentJobId || newLocalJobId();
    const snapshot = currentSnapshot(idForSave);
    snapshot.id = idForSave;

    const localRow = {
      ...snapshot,
      id: idForSave,
      _localOnly: !cloudEnabled,
    };
    upsertLocalJobV2(localRow);
    setCurrentJobId(idForSave);

    if (cloudEnabled) {
      const result = await saveCloudJob(snapshot, authUser.id, currentJobId);
      if (result.ok && result.job) {
        const cloudId = result.job.id;
        setCurrentJobId(cloudId);
        upsertLocalJobV2({
          ...snapshot,
          id: cloudId,
          updated_at: result.job.updated_at || snapshot.updated_at,
          created_at: result.job.created_at || snapshot.created_at,
        });
        if (idForSave !== cloudId && String(idForSave).startsWith("local-")) {
          deleteLocalJobV2(idForSave);
        }
        setSaveStatus("Saved to cloud + local backup");
      } else {
        setSaveStatus(`Saved locally (cloud error: ${result.error || "unknown"})`);
      }
    } else {
      setSaveStatus(
        supabaseConfigured && features.cloudJobs
          ? "Saved on this device (sign in for cloud sync)"
          : "Saved on this device"
      );
    }

    await refreshJobList();
  }

  function clearJobInfo() {
    setJob(createEmptyJobMeta());
    setCurrentJobId(null);
    setSaveStatus("");
  }

  async function persistTakeoffTables(nextTables, nextChartSelection = chartSelection) {
    const pref = readDefaultTakeoffType() || takeoffType;
    writeLocalTakeoffBundle(nextTables, pref, nextChartSelection);
    if (cloudEnabled && features.companyStandards && authUser?.id) {
      const saved = await saveCloudTakeoffStandards(
        authUser.id,
        nextTables,
        cloudTakeoffRowId,
        pref,
        nextChartSelection
      );
      if (saved.ok && saved.row?.id) {
        setCloudTakeoffRowId(saved.row.id);
      }
    }
  }

  function updateTakeoffCell(size, fitting, rawValue) {
    const num = rawValue === "" ? 0 : Number(rawValue);
    if (!Number.isFinite(num) || num < 0) return;

    const needsCustom =
      (takeoffType === "electrical" &&
        chartSelection.electrical?.chartId !== CHART_IDS.companyCustom) ||
      (takeoffType === "plumbing" &&
        chartSelection.plumbing?.chartId !== CHART_IDS.companyCustom);

    const nextSelection = needsCustom
      ? normalizeChartSelection({
          ...chartSelection,
          [takeoffType]: { ...chartSelection[takeoffType], chartId: CHART_IDS.companyCustom },
        })
      : chartSelection;

    if (needsCustom) {
      setChartSelection(nextSelection);
    }

    setTakeoffTables((prev) => {
      const displayed = takeoffTable;
      const nextTables = {
        ...prev,
        [takeoffType]: {
          ...displayed,
          [size]: { ...displayed[size], [fitting]: num },
        },
      };
      persistTakeoffTables(nextTables, nextSelection);
      return nextTables;
    });
  }

  async function resetTakeoffsToDefaults() {
    const defaults = createDefaultTakeoffTables();
    const nextTables = {
      ...takeoffTables,
      [takeoffType]: defaults[takeoffType] || defaults.pipe,
    };
    setTakeoffTables(nextTables);
    await persistTakeoffTables(nextTables);
  }

  function addPipeRun() {
    setSegments((prev) => [
      ...prev,
      createDefaultSegmentForPreset(preset, Date.now(), prev.length),
    ]);
  }

  function removePipeRun(id) {
    setSegments((prev) => prev.filter((segment) => segment.id !== id));
  }

  function updateSegment(id, field, value) {
    setSegments((prev) =>
      prev.map((segment) =>
        segment.id === id ? { ...segment, [field]: value } : segment
      )
    );
  }

  function addCalculatorRun() {
    const runId = `run-${nextCalculatorRunId.current}`;
    nextCalculatorRunId.current += 1;

    setCalculatorRuns((prev) => [
      ...prev,
      {
        id: runId,
        label: `Run ${prev.length + 1}`,
        length: "",
        unit: "inches",
        direction: "east",
      },
    ]);
  }

  function removeCalculatorRun(id) {
    setCalculatorRuns((prev) => prev.filter((run) => run.id !== id));
  }

  function updateCalculatorRun(id, field, value) {
    setCalculatorRuns((prev) =>
      prev.map((run) => (run.id === id ? { ...run, [field]: value } : run))
    );
  }

  function addFittingQuick(type) {
    setMaterialSource("manual");
    setExtraFittings((prev) => ({ ...prev, [type]: (prev[type] || 0) + 1 }));
  }

  function updateOverallFittingCount(fitting, value) {
    if (value === "") {
      setOverallFittings((prev) => ({ ...prev, [fitting]: "" }));
      return;
    }

    if (!/^\d+$/.test(value)) {
      return;
    }

    setOverallFittings((prev) => ({
      ...prev,
      [fitting]: value,
    }));
  }

  function exportPdf() {
    window.print();
  }

  function handleTakeoffTypeChange(nextType) {
    if (nextType === takeoffType) return;
    applyTypeReset(nextType);
  }

  function handleChartSelectionChange(trade, patch) {
    const next = normalizeChartSelection(
      {
        ...chartSelection,
        [trade]: { ...chartSelection[trade], ...patch },
      },
      { conduitType }
    );
    if (trade === "electrical") {
      setConduitType(conduitLabelFromMaterial(next.electrical.materialSystem));
    }
    const explicitCustomChart = patch.chartId === CHART_IDS.companyCustom;
    const switchingToCustom =
      explicitCustomChart &&
      ((trade === "electrical" &&
        chartSelection.electrical?.chartId !== CHART_IDS.companyCustom) ||
        (trade === "plumbing" &&
          chartSelection.plumbing?.chartId !== CHART_IDS.companyCustom));
    setChartSelection(next);
    if (switchingToCustom && trade === takeoffType) {
      const copied = { ...takeoffTables, [trade]: takeoffTable };
      setTakeoffTables(copied);
      persistTakeoffTables(copied, next);
    } else {
      persistTakeoffTables(takeoffTables, next);
    }
  }

  function handleToggleCategory(categoryId) {
    setCategories((prev) => ({
      ...prev,
      [categoryId]: prev[categoryId] === false,
    }));
  }

  async function handleSaveDefaultType() {
    writeDefaultTakeoffType(takeoffType);
    writeLocalTakeoffBundle(takeoffTables, takeoffType, chartSelection);
    if (cloudEnabled && features.companyStandards && authUser?.id) {
      await saveCloudTakeoffStandards(
        authUser.id,
        takeoffTables,
        cloudTakeoffRowId,
        takeoffType,
        chartSelection
      );
    }
    setDefaultTypeNote(`Default saved: ${preset.displayName} (this device${cloudEnabled ? " + account standards" : ""})`);
  }

  function buildDrawingFromOverallLength() {
    const straightCutLength = Math.max(overallLengthCalc.straightCutLength, 0);
    const straightCutLengthString = straightCutLength.toFixed(2);
    const ninetyCount = Number(overallFittings[preset.ninetyFittingId || "90 elbow"]) || 0;

    setPipeSize(overallPipeSize);
    const runsWithLength = calculatorRuns.filter((run) => Number(run.length) > 0);

    if (runsWithLength.length > 0) {
      setSegments(
        runsWithLength.map((run, index) => ({
          ...createDefaultSegmentForPreset(preset, Date.now() + index, index),
          label: run.label || `Run ${index + 1}`,
          knownLength: buildKnownLengthFromCalculatorRun(run.length, run.unit),
          direction: run.direction || "east",
          startFitting: "none",
          endFitting: "none",
        }))
      );
    } else {
      setSegments((prev) => {
        if (prev.length === 0) {
          return [
            {
              id: Date.now(),
              label: "Run 1",
              knownLength: straightCutLengthString,
              direction: "east",
              startFitting: "none",
              endFitting: "none",
            },
          ];
        }

        return prev.map((segment, index) =>
          index === 0
            ? {
                ...segment,
                knownLength: straightCutLengthString,
                startFitting: "none",
                endFitting: "none",
              }
            : segment
        );
      });
    }

    const exactOverallFittings = Object.fromEntries(
      fittingTypes.map((fitting) => [fitting, Number(overallFittings[fitting]) || 0])
    );
    setOverallMaterialFittings(exactOverallFittings);
    setMaterialSource("overall");

    if (ninetyCount === 1) {
      setOverallSketchMode("l-shape");
      setOverallSketchLength(straightCutLength);
      return;
    }

    if (ninetyCount >= 2) {
      setOverallSketchMode("u-z-shape");
      setOverallSketchLength(straightCutLength);
      return;
    }

    setOverallSketchMode("none");
    setOverallSketchLength(0);
  }

  async function loadJobById(id) {
    if (String(id).startsWith("local-") || !cloudEnabled) {
      const local = readLocalJobsV2().find((item) => String(item.id) === String(id));
      if (!local) return null;
      return local;
    }
    const loaded = await getCloudJob(id);
    if (loaded.ok && loaded.job) return loaded.job;
    const local = readLocalJobsV2().find((item) => String(item.id) === String(id));
    return local || null;
  }

  async function handleOpenJob(id) {
    setBusyId(id);
    try {
      const row = await loadJobById(id);
      if (!row) {
        setSaveStatus("Could not open that job.");
        return;
      }
      applyEditorState(snapshotToEditorState(row));
      setShowDashboard(false);
      setSaveStatus("Job loaded");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDuplicateJob(id) {
    setBusyId(id);
    try {
      if (cloudEnabled && !String(id).startsWith("local-")) {
        const result = await duplicateCloudJob(id, authUser.id);
        if (result.ok && result.job) {
          upsertLocalJobV2(result.job);
          await refreshJobList();
          setSaveStatus("Job duplicated");
          return;
        }
      }

      const row = await loadJobById(id);
      if (!row) {
        setSaveStatus("Could not duplicate that job.");
        return;
      }
      const state = snapshotToEditorState(row);
      const copyId = newLocalJobId();
      const snapshot = buildJobSnapshot({
        ...state,
        id: copyId,
        job: {
          ...state.job,
          name: `${state.job.name || "Untitled Job"} (copy)`,
        },
        takeoffTable: state.takeoffSnapshot || takeoffTable,
      });
      snapshot.id = copyId;
      snapshot.job_name = `${row.job_name || row.name || "Untitled Job"} (copy)`;

      if (cloudEnabled) {
        const saved = await saveCloudJob(snapshot, authUser.id, null);
        if (saved.ok && saved.job) {
          upsertLocalJobV2(saved.job);
        } else {
          upsertLocalJobV2(snapshot);
        }
      } else {
        upsertLocalJobV2(snapshot);
      }
      await refreshJobList();
      setSaveStatus("Job duplicated");
    } finally {
      setBusyId(null);
    }
  }

  async function handleExportJob(id) {
    setBusyId(id);
    try {
      const row = await loadJobById(id);
      if (!row) {
        setSaveStatus("Could not export that job.");
        return;
      }
      applyEditorState(snapshotToEditorState(row));
      setShowDashboard(false);
      window.setTimeout(() => window.print(), 150);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteJob(id) {
    if (!window.confirm("Delete this job? This cannot be undone.")) return;
    setBusyId(id);
    try {
      deleteLocalJobV2(id);
      if (cloudEnabled && !String(id).startsWith("local-")) {
        await deleteCloudJob(id, authUser.id);
      }
      if (String(currentJobId) === String(id)) {
        setCurrentJobId(null);
      }
      await refreshJobList();
      setSaveStatus("Job deleted");
    } finally {
      setBusyId(null);
    }
  }

  function handleNewJob() {
    resetEditorToBlank();
    setShowDashboard(false);
  }

  const statusLabel = cloudEnabled
    ? `Signed in${userEmail ? ` · ${userEmail}` : ""} · ${plan}`
    : supabaseConfigured
      ? "Local mode · sign in via PipeSketch Pro for cloud"
      : "Local mode · Supabase not configured";

  return (
    <div className={styles.page}>
      <div className={styles.screenOnly}>
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <div>
              <h1>PipeSketchPro</h1>
              <p>
                {preset.headerTagline ||
                  "Simple field takeoff for pipe runs, fittings, and print-ready isometric output."}
              </p>
            </div>
            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.secondaryActionBtn}
                onClick={() => {
                  refreshJobList();
                  setShowDashboard(true);
                }}
              >
                My Jobs
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={saveCurrentJob}
              >
                Save Job
              </button>
              <button type="button" className={styles.primaryBtn} onClick={exportPdf}>
                Export PDF
              </button>
            </div>
          </div>
          <div className={styles.statusBar}>
            <span className={cloudEnabled ? styles.statusOk : styles.statusWarn}>
              {statusLabel}
            </span>
            {saveStatus ? <span className={styles.saveStatusLine}>{saveStatus}</span> : null}
          </div>
          {migrationNote ? <p className={styles.migrationNote}>{migrationNote}</p> : null}
        </header>

        <main className={styles.mainGrid}>
          <div className={styles.leftColumn}>
            <section className={`${styles.panel} ${styles.jobPanel}`}>
              <h2>Job Info</h2>
              <p className={styles.localOnlyNote}>
                {cloudEnabled
                  ? "Full job state saves to cloud with a local backup on this device."
                  : "Full job state is stored on this device. Cloud sync when signed in."}
              </p>
              <div className={styles.formGrid}>
                <label>
                  Job Name
                  <input
                    value={job.name}
                    onChange={(event) => updateJobField("name", event.target.value)}
                    placeholder="Example: Boiler Room Retrofit"
                  />
                </label>
                <label>
                  Customer
                  <input
                    value={job.customer}
                    onChange={(event) => updateJobField("customer", event.target.value)}
                    placeholder="Customer name"
                  />
                </label>
                <label>
                  Location
                  <input
                    value={job.location}
                    onChange={(event) => updateJobField("location", event.target.value)}
                    placeholder="Site / building"
                  />
                </label>
                <label>
                  Date
                  <input
                    type="date"
                    value={job.date}
                    onChange={(event) => updateJobField("date", event.target.value)}
                  />
                </label>
                <label className={styles.fullWidth}>
                  Notes
                  <textarea
                    value={job.notes}
                    onChange={(event) => updateJobField("notes", event.target.value)}
                    placeholder="Scope notes, crew notes, install assumptions..."
                  />
                </label>
                <div className={`${styles.fullWidth} ${styles.jobActionsRow}`}>
                  <button
                    className={styles.secondaryActionBtn}
                    type="button"
                    onClick={saveCurrentJob}
                  >
                    Save Current Job
                  </button>
                  <button
                    className={styles.secondaryActionBtn}
                    type="button"
                    onClick={clearJobInfo}
                  >
                    Clear Job Info
                  </button>
                  <button
                    className={styles.secondaryActionBtn}
                    type="button"
                    onClick={handleNewJob}
                  >
                    New Job
                  </button>
                </div>
              </div>
            </section>

            <TakeoffTypeBar
              takeoffType={takeoffType}
              preset={preset}
              categories={categories}
              chartSelection={chartSelection}
              chartStatus={
                takeoffType === "electrical" || takeoffType === "plumbing" || takeoffType === "hvac"
                  ? chartResolved.status
                  : null
              }
              onTypeChange={handleTakeoffTypeChange}
              onChartSelectionChange={handleChartSelectionChange}
              onToggleCategory={handleToggleCategory}
              onSaveDefault={handleSaveDefaultType}
              defaultSaved={defaultTypeNote}
            />

            <section className={`${styles.panel} ${styles.takeoffSettingsPanel}`}>
              <h2>Takeoff Settings</h2>
              <p className={styles.helpText}>
                {preset.terminology.takeoffChartHelp}
              </p>
              <p className={styles.localOnlyNote}>
                {cloudEnabled && features.companyStandards
                  ? "Standards sync to your account and stay cached on this device."
                  : "Takeoff values are stored on this device."}
              </p>
              {preset.showTakeoffChart ? (
                <>
                  {preset.chartNote ? <p className={styles.helperNote}>{preset.chartNote}</p> : null}
                  {preset.verification?.usesUnverifiedNumericDefaults ? (
                    <p className={styles.unverifiedDefaultNote} role="note">
                      {preset.verification.unverifiedLabel ||
                        "Unverified default — confirm against your manufacturer/company chart."}
                    </p>
                  ) : null}
                  {takeoffType === "electrical" &&
                  chartSelection.electrical?.chartId !== CHART_IDS.companyCustom ? (
                    <button
                      type="button"
                      className={styles.secondaryActionBtn}
                      onClick={() =>
                        handleChartSelectionChange("electrical", {
                          chartId: CHART_IDS.companyCustom,
                        })
                      }
                    >
                      Use Company Custom Chart
                    </button>
                  ) : null}
                  {takeoffType === "plumbing" &&
                  chartSelection.plumbing?.chartId !== CHART_IDS.companyCustom ? (
                    <button
                      type="button"
                      className={styles.secondaryActionBtn}
                      onClick={() =>
                        handleChartSelectionChange("plumbing", {
                          chartId: CHART_IDS.companyCustom,
                        })
                      }
                    >
                      Use Company Custom Chart
                    </button>
                  ) : null}
                  <div className={styles.takeoffTableWrap}>
                    <table className={styles.takeoffTable}>
                      <thead>
                        <tr>
                          <th scope="col">Size</th>
                          {fittingTypes.map((fitting) => (
                            <th key={fitting} scope="col" title={fitting}>
                              {fittingColumnLabel(preset, fitting)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preset.sizes.map((size) => (
                          <tr key={size}>
                            <th scope="row">{size}</th>
                            {fittingTypes.map((fitting) => {
                              const meta = chartResolved.cellMeta?.[size]?.[fitting];
                              const locked = meta?.editable === false;
                              return (
                                <td key={fitting}>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    readOnly={locked}
                                    className={locked ? styles.takeoffCellVerified : undefined}
                                    title={meta?.notes || undefined}
                                    aria-label={`${size} ${fitting} takeoff inches`}
                                    value={takeoffTable[size]?.[fitting] ?? 0}
                                    onChange={(event) =>
                                      updateTakeoffCell(size, fitting, event.target.value)
                                    }
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    className={styles.secondaryActionBtn}
                    type="button"
                    onClick={resetTakeoffsToDefaults}
                  >
                    Reset to Defaults
                  </button>
                </>
              ) : (
                <p className={styles.helperNote}>
                  This takeoff type uses the assumption fields in the inputs panel instead of a
                  fitting takeoff chart.
                </p>
              )}
            </section>

            {preset.showFittingButtons ? (
            <section className={`${styles.panel} ${styles.fittingsPanel}`}>
              <h2>{preset.terminology.fittingsTitle}</h2>
              <p className={styles.helpText}>
                {preset.terminology.fittingsHelp}
              </p>
              <div className={styles.fitButtons}>
                {fittingTypes.map((fitting) => (
                  <button key={fitting} onClick={() => addFittingQuick(fitting)} type="button">
                    {fittingButtonLabel(preset, fitting)}
                  </button>
                ))}
              </div>
            </section>
            ) : null}

            {preset.showRuns ? (
            <section className={`${styles.panel} ${styles.pipeRunsPanel}`}>
              <h2>{preset.terminology.runsTitle}</h2>
              <p className={styles.helpText}>
                {preset.terminology.runsHelp}
              </p>
              <label className={styles.inlineLabel}>
                {preset.terminology.sizeLabel}
                <select value={pipeSize} onChange={(event) => setPipeSize(event.target.value)}>
                  {preset.sizes.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              {takeoffType === "hvac" ? (
                <div className={styles.runFields}>
                  <label>
                    Flex duct (ft)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={tradeInputs.hvacFlexFeet}
                      onChange={(event) =>
                        setTradeInputs((prev) => ({ ...prev, hvacFlexFeet: event.target.value }))
                      }
                    />
                  </label>
                  {categories.equipment ? (
                    <label>
                      Equipment count
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={tradeInputs.hvacEquipmentCount}
                        onChange={(event) =>
                          setTradeInputs((prev) => ({
                            ...prev,
                            hvacEquipmentCount: event.target.value,
                          }))
                        }
                      />
                    </label>
                  ) : null}
                </div>
              ) : null}
              {takeoffType === "electrical" && categories.conductors !== false ? (
                <label className={styles.inlineLabel}>
                  Wire / conductors (ft)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={tradeInputs.conductorFeet}
                    onChange={(event) =>
                      setTradeInputs((prev) => ({ ...prev, conductorFeet: event.target.value }))
                    }
                  />
                </label>
              ) : null}
              <p className={styles.helperNote}>
                {preset.terminology.runsTip}
              </p>

              <div className={styles.runList}>
                {segmentRows.map((segment, index) => (
                  <article className={styles.runCard} key={segment.id}>
                    <div className={styles.runHeader}>
                      <strong>Run {index + 1}</strong>
                      <button onClick={() => removePipeRun(segment.id)} type="button">
                        Remove
                      </button>
                    </div>
                    <div className={styles.runFields}>
                      <label>
                        Label
                        <input
                          value={segment.label}
                          onChange={(event) =>
                            updateSegment(segment.id, "label", event.target.value)
                          }
                        />
                      </label>
                      <label>
                        {preset.terminology.knownLengthLabel}
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={segment.knownLength}
                          onChange={(event) =>
                            updateSegment(segment.id, "knownLength", event.target.value)
                          }
                        />
                      </label>
                      <label>
                        Direction
                        <select
                          value={segment.direction}
                          onChange={(event) =>
                            updateSegment(segment.id, "direction", event.target.value)
                          }
                        >
                          {DIRECTION_OPTIONS.map((direction) => (
                            <option key={direction.value} value={direction.value}>
                              {direction.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {preset.terminology.startFittingLabel}
                        <select
                          value={segment.startFitting}
                          onChange={(event) =>
                            updateSegment(segment.id, "startFitting", event.target.value)
                          }
                        >
                          <option value="none">None</option>
                          {fittingTypes.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {preset.terminology.endFittingLabel}
                        <select
                          value={segment.endFitting}
                          onChange={(event) =>
                            updateSegment(segment.id, "endFitting", event.target.value)
                          }
                        >
                          <option value="none">None</option>
                          {fittingTypes.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </label>
                      {takeoffType === "hvac" ? (
                        <>
                          <label>
                            Shape
                            <select
                              value={segment.ductShape || "rect"}
                              onChange={(event) =>
                                updateSegment(segment.id, "ductShape", event.target.value)
                              }
                            >
                              <option value="rect">Rectangular</option>
                              <option value="round">Round</option>
                            </select>
                          </label>
                          {(segment.ductShape || "rect") === "round" ? (
                            <label>
                              Diameter
                              <input
                                value={segment.ductDiameter || ""}
                                onChange={(event) =>
                                  updateSegment(segment.id, "ductDiameter", event.target.value)
                                }
                              />
                            </label>
                          ) : (
                            <>
                              <label>
                                Width
                                <input
                                  value={segment.ductWidth || ""}
                                  onChange={(event) =>
                                    updateSegment(segment.id, "ductWidth", event.target.value)
                                  }
                                />
                              </label>
                              <label>
                                Height
                                <input
                                  value={segment.ductHeight || ""}
                                  onChange={(event) =>
                                    updateSegment(segment.id, "ductHeight", event.target.value)
                                  }
                                />
                              </label>
                            </>
                          )}
                        </>
                      ) : null}
                      {takeoffType === "electrical" ? (
                        <label>
                          Conduit Type
                          <select
                            value={segment.conduitType || conduitType}
                            onChange={(event) =>
                              updateSegment(segment.id, "conduitType", event.target.value)
                            }
                          >
                            {CONDUIT_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                      {takeoffType === "plumbing" ? (
                        <label>
                          System
                          <select
                            value={segment.system || "water"}
                            onChange={(event) =>
                              updateSegment(segment.id, "system", event.target.value)
                            }
                          >
                            <option value="water">Water / Supply</option>
                            <option value="dwv">Drain / Waste / Vent</option>
                          </select>
                        </label>
                      ) : null}
                    </div>
                    <div className={styles.calcRow}>
                      <span>Takeoff: {segment.totalTakeoff.toFixed(2)} in</span>
                      <span>Estimated Cut: {segment.cutLength.toFixed(2)} in</span>
                    </div>
                  </article>
                ))}
              </div>
              <p className={styles.helperNote}>
                The drawing updates automatically as you add or edit runs.
              </p>
              <button className={styles.primaryBtn} onClick={addPipeRun} type="button">
                {preset.terminology.addRunLabel}
              </button>
            </section>
            ) : (
              <TradeInputsPanel
                takeoffType={takeoffType}
                inputs={tradeInputs}
                onChange={setTradeInputs}
              />
            )}
          </div>

          <div className={styles.rightColumn}>
            {preset.showOverallCalculator ? (
            <section className={`${styles.panel} ${styles.overallPanel}`}>
              <h2>Overall Length Calculator</h2>
              <p className={styles.helpText}>
                {preset.terminology.overallHelp}
              </p>

              <div className={styles.runFields}>
                <label>
                  Overall Length
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={overallLength}
                    onChange={(event) => setOverallLength(event.target.value)}
                  />
                </label>
                <label>
                  Unit
                  <select
                    value={overallUnit}
                    onChange={(event) => setOverallUnit(event.target.value)}
                  >
                    <option value="inches">Inches</option>
                    <option value="feet">Feet</option>
                  </select>
                </label>
                <label>
                  {preset.terminology.overallSizeLabel}
                  <select
                    value={overallPipeSize}
                    onChange={(event) => setOverallPipeSize(event.target.value)}
                  >
                    {preset.sizes.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className={styles.runList}>
                <article className={styles.runCard}>
                  <div className={styles.runHeader}>
                    <strong>Run Breakdown</strong>
                  </div>
                  <div className={styles.runList}>
                    {calculatorRuns.map((run, index) => (
                      <div key={run.id} className={styles.calcRunRow}>
                        <div className={styles.runFields}>
                          <label>
                            Label
                            <input
                              value={run.label}
                              onChange={(event) =>
                                updateCalculatorRun(run.id, "label", event.target.value)
                              }
                              placeholder={`Run ${index + 1}`}
                            />
                          </label>
                          <label>
                            Length
                            <input
                              type="text"
                              inputMode="decimal"
                              value={run.length}
                              onChange={(event) =>
                                updateCalculatorRun(run.id, "length", event.target.value)
                              }
                            />
                          </label>
                          <label>
                            Unit
                            <select
                              value={run.unit}
                              onChange={(event) =>
                                updateCalculatorRun(run.id, "unit", event.target.value)
                              }
                            >
                              <option value="inches">Inches</option>
                              <option value="feet">Feet</option>
                            </select>
                          </label>
                          <label>
                            Direction
                            <select
                              value={run.direction}
                              onChange={(event) =>
                                updateCalculatorRun(run.id, "direction", event.target.value)
                              }
                            >
                              {DIRECTION_OPTIONS.map((direction) => (
                                <option key={direction.value} value={direction.value}>
                                  {direction.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCalculatorRun(run.id)}
                          disabled={calculatorRuns.length === 1}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className={styles.materialSummary}>
                    <p>Run Total: {calculatorRunTotals.totalInches.toFixed(2)} in</p>
                    {calculatorRunTotals.matchesOverall ? (
                      <p>Run total matches overall length.</p>
                    ) : (
                      <p>
                        Difference from overall length:{" "}
                        {Math.abs(calculatorRunTotals.differenceInches).toFixed(2)} in{" "}
                        {calculatorRunTotals.differenceInches > 0 ? "(over)" : "(under)"}
                      </p>
                    )}
                  </div>
                  <button type="button" onClick={addCalculatorRun}>
                    Add Calculator Run
                  </button>
                </article>
              </div>

              <div className={styles.runList}>
                <article className={styles.runCard}>
                  <strong>{preset.terminology.fittingCountsTitle}</strong>
                  <div className={styles.runFields}>
                    {fittingTypes.map((fitting) => (
                      <label key={fitting}>
                        {fitting}
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={overallFittings[fitting] ?? 0}
                          onChange={(event) =>
                            updateOverallFittingCount(fitting, event.target.value)
                          }
                        />
                      </label>
                    ))}
                  </div>
                </article>
              </div>

              <div className={styles.materialSummary}>
                <p>Overall Length: {overallLengthCalc.overallInches.toFixed(2)} in</p>
                <p>Total Fitting Takeoff: {overallLengthCalc.totalTakeoff.toFixed(2)} in</p>
                <p>
                  {preset.terminology.straightCutLabel}:{" "}
                  {Math.max(overallLengthCalc.straightCutLength, 0).toFixed(2)} in
                </p>
                {overallLengthCalc.isNonPositive && (
                  <p className={styles.warningText}>
                    Warning: Estimated cut length is zero or negative. Check overall length, size,
                    and fitting counts.
                  </p>
                )}
              </div>
              <button
                className={styles.primaryBtn}
                type="button"
                onClick={buildDrawingFromOverallLength}
              >
                {preset.terminology.buildDrawingLabel}
              </button>
            </section>
            ) : null}

            <section className={`${styles.panel} ${styles.drawingPanel}`}>
              <div className={styles.drawingTop}>
                <div>
                  <h2>{preset.terminology.drawingTitle}</h2>
                  <p className={styles.helpText}>
                    {preset.terminology.drawingHelp}
                  </p>
                </div>
                {preset.drawingMode === "iso-runs" ? (
                <div className={styles.drawButtons}>
                  <button type="button" onClick={() => setRotateTurns((prev) => prev - 1)}>
                    Rotate Left
                  </button>
                  <button type="button" onClick={() => setRotateTurns((prev) => prev + 1)}>
                    Rotate Right
                  </button>
                  <button type="button" onClick={() => setFlipped((prev) => !prev)}>
                    Flip View
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRotateTurns(0);
                      setFlipped(false);
                    }}
                  >
                    Reset View
                  </button>
                  <button type="button" className={styles.primaryBtn} onClick={exportPdf}>
                    Export PDF
                  </button>
                </div>
                ) : (
                <div className={styles.drawButtons}>
                  <button type="button" className={styles.primaryBtn} onClick={exportPdf}>
                    Export PDF
                  </button>
                </div>
                )}
              </div>

              {preset.drawingMode === "iso-runs" ? (
              <div className={styles.svgWrap}>
                <svg
                  viewBox={`0 0 ${drawingModel.width} ${drawingModel.height}`}
                  role="img"
                  aria-label={preset.terminology.drawingAria}
                >
                  <rect x="0" y="0" width={drawingModel.width} height={drawingModel.height} />
                  {drawingModel.points.slice(0, -1).map((point, index) => {
                    const next = drawingModel.points[index + 1];
                    const midX = (point[0] + next[0]) / 2;
                    const midY = (point[1] + next[1]) / 2;
                    const dx = next[0] - point[0];
                    const dy = next[1] - point[1];
                    const magnitude = Math.hypot(dx, dy) || 1;
                    const offset = 14;
                    const labelX = midX + (-dy / magnitude) * offset;
                    const labelY = midY + (dx / magnitude) * offset;
                    const rawAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
                    const readableAngle =
                      rawAngle > 90 || rawAngle < -90 ? rawAngle + 180 : rawAngle;
                    const segment = segmentRows[index];
                    const label = formatRunDrawingLabel(segment, index, preset, pipeSize, {
                      conduitType,
                    });
                    return (
                      <g key={`seg-${index}`}>
                        <line x1={point[0]} y1={point[1]} x2={next[0]} y2={next[1]} />
                        <text
                          x={labelX}
                          y={labelY}
                          transform={`rotate(${readableAngle} ${labelX} ${labelY})`}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          {label}
                        </text>
                      </g>
                    );
                  })}
                  {drawingModel.points.map((point, index) => (
                    <circle key={`pt-${index}`} cx={point[0]} cy={point[1]} r="3.5" />
                  ))}
                </svg>
              </div>
              ) : (
                <DimensionSummary
                  summary={(materialList.summary || []).map((row) =>
                    row.label ? `${row.label}: ${row.value}` : row.value
                  )}
                  assumptions={materialList.assumptions || []}
                  preview={materialList.preview}
                />
              )}
            </section>

            <section className={`${styles.panel} ${styles.materialPanel}`}>
              <h2>Material List</h2>
              <div className={styles.materialSummary}>
                {(materialList.summary || []).map((row) => (
                  <p key={`${row.label}-${row.value}`}>
                    {row.label ? `${row.label}: ${row.value}` : row.value}
                  </p>
                ))}
              </div>
              {materialList.assumptions?.length ? (
                <ul className={styles.assumptionList}>
                  {materialList.assumptions.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
              <table className={styles.bomTable}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {(materialList.rows || []).map((row) => (
                    <tr key={row.item}>
                      <td>{row.item}</td>
                      <td>{row.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </main>
      </div>

      <PrintDocument
        job={job}
        takeoffType={takeoffType}
        pipeSize={pipeSize}
        conduitType={conduitType}
        segmentRows={visibleSegmentRows}
        materialList={printMaterialList}
        drawingModel={drawingModel}
        warnings={printWarnings}
      />

      {showDashboard ? (
        <JobDashboard
          jobs={jobList}
          cloudEnabled={cloudEnabled}
          saveStatus={saveStatus}
          busyId={busyId}
          onOpen={handleOpenJob}
          onDuplicate={handleDuplicateJob}
          onExport={handleExportJob}
          onDelete={handleDeleteJob}
          onNewJob={handleNewJob}
          onClose={() => setShowDashboard(false)}
        />
      ) : null}
    </div>
  );
}
