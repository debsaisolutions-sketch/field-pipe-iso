"use client";

import styles from "@/app/page.module.css";

function formatUpdated(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

export default function JobDashboard({
  jobs,
  cloudEnabled,
  saveStatus,
  busyId,
  onOpen,
  onDuplicate,
  onExport,
  onDelete,
  onNewJob,
  onClose,
}) {
  return (
    <div className={styles.dashboardOverlay} role="dialog" aria-modal="true" aria-label="My Jobs">
      <div className={styles.dashboardSheet}>
        <div className={styles.dashboardHeader}>
          <div>
            <h2>My Jobs</h2>
            <p className={styles.helpText}>
              {cloudEnabled
                ? "Jobs sync to your PipeSketch Pro account. Local backup stays on this device."
                : "Working offline / device-only. Sign in through PipeSketch Pro for cloud sync."}
            </p>
            {saveStatus ? <p className={styles.saveStatusLine}>{saveStatus}</p> : null}
          </div>
          <div className={styles.dashboardHeaderActions}>
            <button type="button" className={styles.primaryBtn} onClick={onNewJob}>
              New Job
            </button>
            <button type="button" className={styles.secondaryActionBtn} onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className={styles.dashboardEmpty}>
            <p>No saved jobs yet.</p>
            <button type="button" className={styles.primaryBtn} onClick={onNewJob}>
              Start a job
            </button>
          </div>
        ) : (
          <ul className={styles.dashboardList}>
            {jobs.map((job) => {
              const subtitle = [job.customer_name, job.job_location]
                .filter(Boolean)
                .join(" · ");
              const busy = busyId === job.id;
              return (
                <li key={job.id} className={styles.dashboardCard}>
                  <div className={styles.dashboardCardBody}>
                    <strong>{job.job_name || "Untitled Job"}</strong>
                    <span>{subtitle || "No customer / location"}</span>
                    <span className={styles.dashboardMeta}>
                      Updated {formatUpdated(job.updated_at)}
                      {job.source === "local" ? " · Device only" : ""}
                    </span>
                  </div>
                  <div className={styles.dashboardActions}>
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      disabled={busy}
                      onClick={() => onOpen(job.id)}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      className={styles.secondaryActionBtn}
                      disabled={busy}
                      onClick={() => onDuplicate(job.id)}
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      className={styles.secondaryActionBtn}
                      disabled={busy}
                      onClick={() => onExport(job.id)}
                    >
                      Export PDF
                    </button>
                    <button
                      type="button"
                      className={styles.dangerBtn}
                      disabled={busy}
                      onClick={() => onDelete(job.id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
