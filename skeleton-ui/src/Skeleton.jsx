// Mirrors the structure and spacing of Card.jsx so nothing shifts when
// real content replaces it. Uses a shimmer gradient instead of pulse.
export default function Skeleton() {
  return (
    <div
      aria-hidden="true"
      className="relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      {/* Image */}
      <div className="aspect-video w-full bg-slate-200 dark:bg-slate-700" />

      <div className="flex flex-1 flex-col gap-3 p-5">
        {/* Category pill */}
        <div className="h-5 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />

        {/* Title (two lines) */}
        <div className="space-y-2">
          <div className="h-5 w-11/12 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-5 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* Description (three lines) */}
        <div className="space-y-2">
          <div className="h-3.5 w-full rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-3.5 w-full rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-3.5 w-4/5 rounded bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>

      {/* Shimmer overlay */}
      <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10" />
    </div>
  );
}
