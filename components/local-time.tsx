'use client';
// Renders a timestamp in the viewer's own timezone (server renders UTC, client corrects on hydration)
export default function LocalTime({ t }: { t: string | null | undefined }) {
  if (!t) return <span suppressHydrationWarning>—</span>;
  return <span suppressHydrationWarning>{new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>;
}
