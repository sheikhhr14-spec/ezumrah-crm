'use client';
// Renders a timestamp in the viewer's own timezone (server renders UTC, client corrects on hydration)
export default function LocalTime({ t, tz }: { t: string | null | undefined; tz?: string | null }) {
  if (!t) return <span suppressHydrationWarning>—</span>;
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  if (tz) try { opts.timeZone = tz; } catch { /* invalid tz — fall back to local */ }
  return <span suppressHydrationWarning>{new Date(t).toLocaleTimeString([], opts)}</span>;
}
