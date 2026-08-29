/**
 * Parent (pipesketchpro-site) ↔ iframe (field-pipe-iso) session bridge.
 * Tokens are user JWTs used with the anon client + RLS. Never send service-role keys.
 */

export const PSP_MSG = {
  READY: "PSP_READY",
  SESSION: "PSP_SESSION",
  SESSION_CLEARED: "PSP_SESSION_CLEARED",
};

const PARENT_SOURCES = new Set(["pipesketchpro-site", "tradedeskpro-dashboard"]);

function parseAllowedOrigins() {
  const raw = process.env.NEXT_PUBLIC_ALLOWED_PARENT_ORIGINS || "";
  const defaults = [
    "https://pipesketchpro.com",
    "https://www.pipesketchpro.com",
    "https://www.tradedeskpro.com",
    "https://tradedeskpro.com",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];
  const fromEnv = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return new Set([...defaults, ...fromEnv]);
}

export function isAllowedParentOrigin(origin) {
  if (!origin) return false;
  return parseAllowedOrigins().has(origin);
}

export function isEmbedded() {
  if (typeof window === "undefined") return false;
  try {
    return window.parent && window.parent !== window;
  } catch {
    return true;
  }
}

export function postToParent(type, payload = {}) {
  if (typeof window === "undefined" || !isEmbedded()) return;
  window.parent.postMessage({ source: "pipesketchpro-tool", type, ...payload }, "*");
}

/**
 * Subscribe to parent session messages. Returns cleanup.
 * onSession(session | null, meta)
 */
export function subscribeParentAuth({ onSession }) {
  if (typeof window === "undefined") return () => {};

  const handler = (event) => {
    if (!isAllowedParentOrigin(event.origin)) return;
    const data = event.data;
    if (!data || !PARENT_SOURCES.has(data.source)) return;

    if (data.type === PSP_MSG.SESSION) {
      onSession(data.session || null, {
        plan: data.plan || "pro",
        features: data.features || null,
        userEmail: data.userEmail || "",
      });
      return;
    }

    if (data.type === PSP_MSG.SESSION_CLEARED) {
      onSession(null, { plan: "pro", features: null, userEmail: "" });
    }
  };

  window.addEventListener("message", handler);
  postToParent(PSP_MSG.READY);
  return () => window.removeEventListener("message", handler);
}
