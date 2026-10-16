/**
 * Re-mounts on every navigation between app pages, so each page gets a gentle
 * fade + 8px rise (CSS `.page-enter`, 260ms). Pure CSS: it runs before hydration,
 * works without JS, and is switched off for prefers-reduced-motion.
 * Search-param changes (e.g. /today?f=call) do not re-mount it, so filters animate in place.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
