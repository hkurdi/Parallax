import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts'
import { format } from 'date-fns'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { fetchLogs, hasApiKey } from '@/lib/keywordsai'
import { useParallaxStore } from '@/store/useParallaxStore'
import { MODEL_BY_ID, MODELS } from '@/lib/models'
import type { LogEntry } from '@/types'

const RANGE_OPTIONS = [
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
] as const

export function Observatory() {
  const { runs } = useParallaxStore()
  const [days, setDays] = useState<7 | 30>(7)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [refreshTick, setRefreshTick] = useState(0)
  const pageSize = 12

  const localLogs = useMemo<LogEntry[]>(() => {
    const cutoff = Date.now() - days * 86400_000
    return runs
      .filter((r) => r.createdAt >= cutoff)
      .flatMap((r) =>
        Object.values(r.results)
          .filter((res) => res.status === 'done' || res.status === 'error')
          .map((res): LogEntry => ({
            id: `${r.id}_${res.modelId}`,
            timestamp: res.finishedAt ?? r.createdAt,
            model: res.modelId,
            promptPreview: r.settings.userPrompt.slice(0, 140),
            promptTokens: res.promptTokens,
            completionTokens: res.completionTokens,
            costUsd: res.costUsd,
            latencyMs: res.latencyMs,
            status: res.status === 'error' ? 'error' : 'success',
          })),
      )
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [runs, days])

  const merged = useMemo(() => {
    const seen = new Set(localLogs.map((l) => l.id))
    return [...localLogs, ...logs.filter((l) => !seen.has(l.id))].sort(
      (a, b) => b.timestamp - a.timestamp,
    )
  }, [localLogs, logs])

  useEffect(() => {
    if (!hasApiKey()) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchLogs({ days, limit: 200 })
      .then((items) => {
        if (cancelled) return
        setLogs(items)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [days, refreshTick])

  useEffect(() => {
    setPage(0)
  }, [days])

  const costSeries = useMemo(() => {
    const buckets = new Map<string, Record<string, number>>()
    for (const l of merged) {
      const day = format(l.timestamp, 'MM/dd')
      const bucket = buckets.get(day) ?? {}
      bucket[l.model] = (bucket[l.model] ?? 0) + l.costUsd
      buckets.set(day, bucket)
    }
    return Array.from(buckets.entries())
      .map(([day, models]) => ({ day, ...models }))
      .reverse()
  }, [merged])

  const usageByModel = useMemo(() => {
    const counts = new Map<string, { requests: number; tokens: number }>()
    for (const l of merged) {
      const cur = counts.get(l.model) ?? { requests: 0, tokens: 0 }
      cur.requests += 1
      cur.tokens += l.promptTokens + l.completionTokens
      counts.set(l.model, cur)
    }
    return Array.from(counts.entries()).map(([model, v]) => ({
      model,
      ...v,
      accent: MODEL_BY_ID[model]?.accent ?? '#f59e0b',
      label: MODEL_BY_ID[model]?.label ?? model,
    }))
  }, [merged])

  const latencyByModel = useMemo(() => {
    const groups = new Map<string, number[]>()
    for (const l of merged) {
      const arr = groups.get(l.model) ?? []
      arr.push(l.latencyMs)
      groups.set(l.model, arr)
    }
    return Array.from(groups.entries()).map(([model, arr]) => {
      const sorted = [...arr].sort((a, b) => a - b)
      const p = (q: number) =>
        sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]
      return {
        model: MODEL_BY_ID[model]?.label ?? model,
        p50: p(0.5),
        p95: p(0.95),
        p99: p(0.99),
      }
    })
  }, [merged])

  const totals = useMemo(() => {
    const totalSpend = merged.reduce((a, l) => a + l.costUsd, 0)
    const totalRequests = merged.length
    const avgLatency =
      totalRequests === 0
        ? 0
        : Math.round(
            merged.reduce((a, l) => a + l.latencyMs, 0) / totalRequests,
          )
    const most = [...usageByModel].sort((a, b) => b.requests - a.requests)[0]
    return { totalSpend, totalRequests, avgLatency, mostUsed: most?.label ?? '—' }
  }, [merged, usageByModel])

  const pageCount = Math.max(1, Math.ceil(merged.length / pageSize))
  const pageItems = merged.slice(page * pageSize, (page + 1) * pageSize)

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--color-hairline)] px-5 sm:px-8 py-4 sm:py-5">
        <div>
          <p className="text-eyebrow">Observatory</p>
          <h1 className="text-display text-2xl sm:text-3xl text-[var(--color-bone-100)] mt-1">
            Cost · Latency · Usage
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-[var(--color-hairline-strong)]">
            {RANGE_OPTIONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setDays(r.value)}
                className={`text-mono text-[11px] uppercase tracking-widest px-3 py-1.5 transition-colors ${
                  days === r.value
                    ? 'bg-[var(--color-amber)] text-[var(--color-ink-0)]'
                    : 'text-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setRefreshTick((t) => t + 1)}
            disabled={loading}
            aria-label="Refresh Observatory data"
            aria-busy={loading}
            className="flex items-center gap-1.5 border border-[var(--color-hairline-strong)] px-3 py-1.5 text-mono text-[11px] uppercase tracking-widest text-[var(--color-bone-300)] hover:text-[var(--color-bone-100)] disabled:opacity-50"
          >
            <RefreshCw
              size={11}
              aria-hidden="true"
              className={loading ? 'animate-spin' : ''}
            />
            refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="border-b border-[var(--color-signal-red)]/30 bg-[var(--color-signal-red)]/5 px-5 sm:px-8 py-3 flex items-start gap-2 text-[var(--color-signal-red)] text-mono text-[11px] leading-relaxed">
          <AlertTriangle size={12} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>
            API logs unavailable: {error.slice(0, 200)} · Showing local session data only.
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-[var(--color-hairline)]">
        <Stat label="Total Spend" value={`$${totals.totalSpend.toFixed(4)}`} accent />
        <Stat label="Total Requests" value={totals.totalRequests.toString()} />
        <Stat label="Avg Latency" value={`${totals.avgLatency} ms`} />
        <Stat label="Most-Used Model" value={totals.mostUsed} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 sm:gap-6 px-5 sm:px-8 py-5 sm:py-6 border-b border-[var(--color-hairline)]">
        <Panel title="Cost over time" code="A1" className="xl:col-span-2">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={costSeries} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fill: '#8a8a85', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#8a8a85', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${Number(v).toFixed(3)}`}
                />
                <Tooltip
                  contentStyle={{
                    background: '#101012',
                    border: '1px solid rgba(255,255,255,0.14)',
                    fontFamily: 'JetBrains Mono',
                    fontSize: 11,
                    color: '#fafaf7',
                  }}
                  cursor={{ stroke: 'rgba(245,158,11,0.2)' }}
                />
                {MODELS.map((m) => (
                  <Line
                    key={m.id}
                    type="monotone"
                    dataKey={m.id}
                    stroke={m.accent}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3, fill: m.accent }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Model usage" code="A2">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={usageByModel}
                  dataKey="requests"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  stroke="#0a0a0b"
                  strokeWidth={2}
                >
                  {usageByModel.map((d, i) => (
                    <Cell key={i} fill={d.accent} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#101012',
                    border: '1px solid rgba(255,255,255,0.14)',
                    fontFamily: 'JetBrains Mono',
                    fontSize: 11,
                  }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{
                    fontFamily: 'JetBrains Mono',
                    fontSize: 10,
                    color: '#b8b8b1',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="px-5 sm:px-8 py-5 sm:py-6 border-b border-[var(--color-hairline)]">
        <Panel title="Latency distribution (p50 · p95 · p99)" code="A3">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latencyByModel} margin={{ top: 10, right: 12, bottom: 0, left: -8 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="model"
                  tick={{ fill: '#8a8a85', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#8a8a85', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}ms`}
                />
                <Tooltip
                  contentStyle={{
                    background: '#101012',
                    border: '1px solid rgba(255,255,255,0.14)',
                    fontFamily: 'JetBrains Mono',
                    fontSize: 11,
                  }}
                  cursor={{ fill: 'rgba(245,158,11,0.05)' }}
                />
                <Legend
                  wrapperStyle={{
                    fontFamily: 'JetBrains Mono',
                    fontSize: 10,
                    color: '#b8b8b1',
                  }}
                />
                <Bar dataKey="p50" fill="#f59e0b" />
                <Bar dataKey="p95" fill="#b3740a" />
                <Bar dataKey="p99" fill="#5e5e5b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="px-5 sm:px-8 py-5 sm:py-6">
        <Panel title="Request log" code="A4">
          {merged.length === 0 ? (
            <EmptyState
              title="No requests logged"
              body="Run a prompt in the Lab or connect your Keywords AI key to see live logs."
            />
          ) : (
            <>
              <div className="border-t border-[var(--color-hairline)] overflow-x-auto">
                <table className="w-full min-w-[720px] text-left">
                  <thead>
                    <tr className="text-eyebrow border-b border-[var(--color-hairline)]">
                      <th className="px-4 py-2.5 font-normal">Timestamp</th>
                      <th className="px-4 py-2.5 font-normal">Model</th>
                      <th className="px-4 py-2.5 font-normal">Prompt</th>
                      <th className="px-4 py-2.5 font-normal text-right">Tokens</th>
                      <th className="px-4 py-2.5 font-normal text-right">Cost</th>
                      <th className="px-4 py-2.5 font-normal text-right">Latency</th>
                      <th className="px-4 py-2.5 font-normal">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-mono text-[11px]">
                    {pageItems.map((l) => (
                      <tr
                        key={l.id}
                        className="border-b border-[var(--color-hairline)]/60 hover:bg-[var(--color-ink-200)]/30 transition-colors"
                      >
                        <td className="px-4 py-2 text-[var(--color-bone-400)] tabular-nums">
                          {format(l.timestamp, 'MMM dd · HH:mm:ss')}
                        </td>
                        <td className="px-4 py-2 text-[var(--color-bone-200)]">
                          {MODEL_BY_ID[l.model]?.label ?? l.model}
                        </td>
                        <td className="px-4 py-2 text-[var(--color-bone-300)] max-w-[280px] truncate">
                          {l.promptPreview || '—'}
                        </td>
                        <td className="px-4 py-2 text-[var(--color-bone-200)] text-right tabular-nums">
                          {l.promptTokens + l.completionTokens}
                        </td>
                        <td className="px-4 py-2 text-[var(--color-amber)] text-right tabular-nums">
                          ${l.costUsd.toFixed(5)}
                        </td>
                        <td className="px-4 py-2 text-[var(--color-bone-300)] text-right tabular-nums">
                          {l.latencyMs} ms
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`text-[10px] uppercase tracking-widest ${
                              l.status === 'success'
                                ? 'text-[var(--color-signal-green)]'
                                : 'text-[var(--color-signal-red)]'
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-hairline)] text-mono text-[10px] uppercase tracking-widest text-[var(--color-bone-400)]">
                <span>
                  {merged.length} entries · page {page + 1} of {pageCount}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    aria-label="Previous page"
                    className="border border-[var(--color-hairline)] px-2 py-1 disabled:opacity-30 hover:text-[var(--color-bone-100)]"
                  >
                    prev
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                    disabled={page >= pageCount - 1}
                    aria-label="Next page"
                    className="border border-[var(--color-hairline)] px-2 py-1 disabled:opacity-30 hover:text-[var(--color-bone-100)]"
                  >
                    next
                  </button>
                </div>
              </div>
            </>
          )}
        </Panel>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="border-r border-b lg:border-b-0 border-[var(--color-hairline)] [&:nth-child(2)]:border-r-0 lg:[&:nth-child(2)]:border-r [&:last-child]:border-r-0 px-5 sm:px-8 py-4 sm:py-5">
      <p className="text-eyebrow">{label}</p>
      <p
        className={`text-display text-xl sm:text-2xl mt-1.5 truncate ${
          accent ? 'text-[var(--color-amber)]' : 'text-[var(--color-bone-100)]'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function Panel({
  title,
  code,
  children,
  className = '',
}: {
  title: string
  code: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`glass overflow-hidden ${className}`}>
      <div className="flex items-center justify-between border-b border-[var(--color-hairline)] px-4 py-2.5">
        <div className="flex items-baseline gap-2.5">
          <span className="text-mono text-[10px] text-[var(--color-amber)]">
            {code}
          </span>
          <h3 className="text-[12px] tracking-tight text-[var(--color-bone-200)]">
            {title}
          </h3>
        </div>
      </div>
      {children}
    </div>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-8 py-16 text-center border-t border-[var(--color-hairline)]">
      <p className="text-display text-2xl text-[var(--color-bone-300)]">{title}</p>
      <p className="text-mono text-[11px] text-[var(--color-bone-500)] mt-2 max-w-md mx-auto">
        {body}
      </p>
    </div>
  )
}
