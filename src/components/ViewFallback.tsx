import { Loader2 } from 'lucide-react'

export function ViewFallback() {
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label="Loading view"
    >
      <Loader2
        size={20}
        strokeWidth={1.5}
        className="animate-spin text-[var(--color-amber)]"
      />
    </div>
  )
}
