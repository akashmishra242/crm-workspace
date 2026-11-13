/** Indeterminate bar for background refreshes, where existing content stays on screen. */
export function ProgressBar() {
  return (
    <div aria-hidden className="absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden bg-primary-100">
      <div className="h-full w-2/5 animate-progress bg-primary-600" />
    </div>
  )
}
