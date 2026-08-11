export const CURRENCY_SYMBOL = "₦";

/** Format a minor-unit amount (kobo) as currency. */
export function formatMoney(minor: number | null | undefined): string {
  const value = (minor ?? 0) / 100;
  return `${CURRENCY_SYMBOL}${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/** Parse a user-entered major-unit amount into minor units. */
export function toMinor(input: string | number): number {
  const n = typeof input === "number" ? input : Number.parseFloat(input || "0");
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function fromMinor(minor: number | null | undefined): number {
  return (minor ?? 0) / 100;
}

/** Human duration from seconds, e.g. 1h 24m 05s */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
  return `${m}m ${String(sec).padStart(2, "0")}s`;
}

export function formatHours(hours: number | null | undefined): string {
  const h = hours ?? 0;
  return `${h.toLocaleString(undefined, { maximumFractionDigits: 2 })}h`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Elapsed billable seconds for an open session.
 *
 * The database is the authority: started_at, paused_seconds and paused_at all
 * come from server-side now(). This helper only renders a live approximation
 * between refetches and is never used to bill.
 */
export function liveElapsedSeconds(
  session: {
    started_at: string;
    paused_seconds: number;
    paused_at: string | null;
    status: string;
    ended_at: string | null;
  },
  serverSkewMs = 0,
): number {
  const nowMs = Date.now() - serverSkewMs;
  const end = session.ended_at ? new Date(session.ended_at).getTime() : nowMs;
  const gross = (end - new Date(session.started_at).getTime()) / 1000;
  let paused = session.paused_seconds;
  if (session.status === "paused" && session.paused_at) {
    paused += (nowMs - new Date(session.paused_at).getTime()) / 1000;
  }
  return Math.max(0, gross - paused);
}
