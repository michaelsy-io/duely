/**
 * Instant placeholder while an app page renders on the server. Next prefetches this
 * boundary for every nav link, so tapping a tab switches immediately instead of
 * waiting for the full server response.
 */
export default function AppLoading() {
  return (
    <div className="flex flex-col gap-6 sm:gap-8" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-48 rounded-[20px] sm:h-56" />
      <div className="grid grid-cols-3 gap-3">
        <div className="skeleton h-20 rounded-[20px]" />
        <div className="skeleton h-20 rounded-[20px]" />
        <div className="skeleton h-20 rounded-[20px]" />
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skeleton h-16 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
