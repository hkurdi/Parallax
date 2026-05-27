interface MetricBadgeProps {
  label: string
  value: string
  accent?: 'neutral' | 'amber' | 'green' | 'red'
  align?: 'left' | 'right'
}

const ACCENT: Record<NonNullable<MetricBadgeProps['accent']>, string> = {
  neutral: 'text-[var(--color-bone-200)]',
  amber: 'text-[var(--color-amber)]',
  green: 'text-[var(--color-signal-green)]',
  red: 'text-[var(--color-signal-red)]',
}

export function MetricBadge({
  label,
  value,
  accent = 'neutral',
  align = 'left',
}: MetricBadgeProps) {
  return (
    <div
      className={`flex flex-col gap-0.5 ${
        align === 'right' ? 'items-end text-right' : 'items-start'
      }`}
    >
      <span className="text-eyebrow">{label}</span>
      <span className={`text-mono text-[13px] tabular-nums ${ACCENT[accent]}`}>
        {value}
      </span>
    </div>
  )
}
