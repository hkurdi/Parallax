import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import {
  Search,
  Tag,
  Download,
  RotateCw,
  Trash2,
  Filter,
} from 'lucide-react'
import { useParallaxStore } from '@/store/useParallaxStore'
import { MODELS, MODEL_BY_ID } from '@/lib/models'
import { MetricBadge } from '@/components/MetricBadge'
import type { ModelId } from '@/types'

export function Library() {
  const navigate = useNavigate()
  const {
    runs,
    selectedLibraryId,
    selectLibraryItem,
    loadRun,
    tagRun,
    noteRun,
    deleteRun,
  } = useParallaxStore()

  const [query, setQuery] = useState('')
  const [modelFilter, setModelFilter] = useState<ModelId | null>(null)
  const [tagInput, setTagInput] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return runs.filter((r) => {
      if (modelFilter && !r.settings.models.includes(modelFilter)) {
        return false
      }
      if (!q) return true
      if (r.settings.userPrompt.toLowerCase().includes(q)) return true
      if (r.notes.toLowerCase().includes(q)) return true
      if (r.tags.some((t) => t.toLowerCase().includes(q))) return true
      return false
    })
  }, [runs, query, modelFilter])

  const selected = filtered.find((r) => r.id === selectedLibraryId) ?? filtered[0]

  const exportRun = () => {
    if (!selected) return
    const blob = new Blob([JSON.stringify(selected, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `parallax-${selected.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const reRun = () => {
    if (!selected) return
    loadRun(selected.id)
    navigate('/lab')
  }

  const addTag = () => {
    if (!selected || !tagInput.trim()) return
    const next = Array.from(new Set([...selected.tags, tagInput.trim()]))
    tagRun(selected.id, next)
    setTagInput('')
  }

  const removeTag = (t: string) => {
    if (!selected) return
    tagRun(
      selected.id,
      selected.tags.filter((x) => x !== t),
    )
  }

  return (
    <div className="flex h-full flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
      <section className="w-full lg:w-[360px] xl:w-[380px] lg:shrink-0 border-b lg:border-b-0 lg:border-r border-[var(--color-hairline)] bg-[var(--color-ink-50)]/60 flex flex-col lg:h-full lg:max-h-full">
        <header className="border-b border-[var(--color-hairline)] px-5 py-4">
          <p className="text-eyebrow">Library</p>
          <h2 className="text-display text-lg sm:text-xl text-[var(--color-bone-100)] mt-1">
            {runs.length} experiment{runs.length === 1 ? '' : 's'}
          </h2>
        </header>

        <div className="border-b border-[var(--color-hairline)] px-5 py-3 space-y-2.5 shrink-0">
          <div className="flex items-center gap-2 border border-[var(--color-hairline-strong)] bg-[var(--color-ink-200)]/40 px-2.5 py-1.5">
            <Search size={11} className="text-[var(--color-bone-500)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search prompts, tags, notes…"
              className="text-mono w-full bg-transparent text-[11.5px] placeholder:text-[var(--color-bone-500)]"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={10} className="text-[var(--color-bone-500)]" />
            <button
              type="button"
              onClick={() => setModelFilter(null)}
              className={`text-mono text-[9px] uppercase tracking-widest px-2 py-0.5 border transition-colors ${
                modelFilter === null
                  ? 'border-[var(--color-amber)]/40 bg-[var(--color-amber)]/10 text-[var(--color-amber)]'
                  : 'border-[var(--color-hairline)] text-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]'
              }`}
            >
              all
            </button>
            {MODELS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setModelFilter(m.id)}
                className={`text-mono text-[9px] uppercase tracking-widest px-2 py-0.5 border transition-colors ${
                  modelFilter === m.id
                    ? 'border-[var(--color-bone-200)]/30 text-[var(--color-bone-100)]'
                    : 'border-[var(--color-hairline)] text-[var(--color-bone-400)] hover:text-[var(--color-bone-200)]'
                }`}
              >
                {m.label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        <ul className="flex-1 lg:overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-5 py-12 text-center">
              <p className="text-display text-xl text-[var(--color-bone-300)]">
                No experiments
              </p>
              <p className="text-mono text-[10.5px] text-[var(--color-bone-500)] mt-2">
                Run a prompt in the Lab to save it here.
              </p>
            </li>
          ) : (
            filtered.map((r) => {
              const isActive = selected?.id === r.id
              const totalCost = Object.values(r.results).reduce(
                (a, b) => a + b.costUsd,
                0,
              )
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => selectLibraryItem(r.id)}
                    className={`group block w-full border-b border-[var(--color-hairline)]/60 px-5 py-3.5 text-left transition-colors ${
                      isActive
                        ? 'bg-[var(--color-ink-300)]/40'
                        : 'hover:bg-[var(--color-ink-200)]/30'
                    }`}
                  >
                    <div className="flex items-center justify-between text-mono text-[10px] uppercase tracking-widest mb-1.5">
                      <span
                        className={
                          isActive
                            ? 'text-[var(--color-amber)]'
                            : 'text-[var(--color-bone-500)]'
                        }
                      >
                        {format(r.createdAt, 'MMM dd · HH:mm')}
                      </span>
                      <span className="text-[var(--color-bone-500)] tabular-nums">
                        ${totalCost.toFixed(4)}
                      </span>
                    </div>
                    <p
                      className={`text-[12.5px] leading-snug line-clamp-2 ${
                        isActive
                          ? 'text-[var(--color-bone-100)]'
                          : 'text-[var(--color-bone-300)]'
                      }`}
                    >
                      {r.settings.userPrompt}
                    </p>
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      {r.settings.models.map((m) => (
                        <span
                          key={m}
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            background: MODEL_BY_ID[m]?.accent,
                            boxShadow: `0 0 4px ${MODEL_BY_ID[m]?.accent}80`,
                          }}
                        />
                      ))}
                      {r.tags.length > 0 && (
                        <>
                          <span className="text-[var(--color-bone-500)] mx-1">·</span>
                          {r.tags.slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="text-mono text-[9px] text-[var(--color-bone-400)]"
                            >
                              #{t}
                            </span>
                          ))}
                        </>
                      )}
                    </div>
                  </button>
                </li>
              )
            })
          )}
        </ul>
      </section>

      <section className="flex-1 lg:overflow-y-auto min-h-[400px] lg:min-h-0">
        {!selected ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-display text-3xl text-[var(--color-bone-300)]">
                Select an experiment
              </p>
              <p className="text-mono text-[11px] text-[var(--color-bone-500)] mt-2">
                Saved runs appear in the panel to the left
              </p>
            </div>
          </div>
        ) : (
          <div className="px-5 sm:px-8 py-5 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6 mb-6">
              <div className="min-w-0">
                <p className="text-eyebrow">
                  {format(selected.createdAt, 'PPP · HH:mm')}
                </p>
                <h1 className="text-display text-xl sm:text-2xl text-[var(--color-bone-100)] mt-1 leading-tight">
                  Experiment <span className="text-mono text-base text-[var(--color-amber)]">{selected.id.slice(-5)}</span>
                </h1>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap sm:shrink-0">
                <ActionButton onClick={reRun} icon={<RotateCw size={11} />}>
                  re-run
                </ActionButton>
                <ActionButton onClick={exportRun} icon={<Download size={11} />}>
                  export
                </ActionButton>
                <ActionButton
                  onClick={() => deleteRun(selected.id)}
                  icon={<Trash2 size={11} />}
                  danger
                >
                  delete
                </ActionButton>
              </div>
            </div>

            <div className="glass mb-5">
              <div className="border-b border-[var(--color-hairline)] px-4 py-2.5 flex items-center justify-between">
                <span className="text-eyebrow">Prompt</span>
                <span className="text-mono text-[10px] text-[var(--color-bone-500)] tabular-nums">
                  T = {selected.settings.temperature.toFixed(2)} · max ={' '}
                  {selected.settings.maxTokens}
                </span>
              </div>
              {selected.settings.systemPrompt && (
                <div className="border-b border-[var(--color-hairline)] px-4 py-3">
                  <div className="text-eyebrow mb-1.5">System</div>
                  <p className="text-mono text-[12px] text-[var(--color-bone-300)] leading-relaxed whitespace-pre-wrap">
                    {selected.settings.systemPrompt}
                  </p>
                </div>
              )}
              <div className="px-4 py-3">
                <div className="text-eyebrow mb-1.5">User</div>
                <p className="text-mono text-[12.5px] text-[var(--color-bone-100)] leading-relaxed whitespace-pre-wrap">
                  {selected.settings.userPrompt}
                </p>
              </div>
            </div>

            <div
              className="grid gap-4 mb-5 grid-cols-1 md:grid-cols-2"
              style={
                selected.settings.models.length === 1
                  ? { gridTemplateColumns: '1fr' }
                  : undefined
              }
            >
              {selected.settings.models.map((modelId) => {
                const r = selected.results[modelId]
                if (!r) return null
                const spec = MODEL_BY_ID[modelId]
                return (
                  <div key={modelId} className="glass">
                    <div className="flex items-center justify-between border-b border-[var(--color-hairline)] px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: spec?.accent }}
                        />
                        <span className="text-[12px] text-[var(--color-bone-100)]">
                          {spec?.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <MetricBadge
                          label="latency"
                          value={`${r.latencyMs}ms`}
                          align="right"
                        />
                      </div>
                    </div>
                    <div className="px-4 py-3 max-h-[280px] overflow-y-auto">
                      <p className="text-mono text-[12px] text-[var(--color-bone-200)] leading-relaxed whitespace-pre-wrap">
                        {r.text || (
                          <span className="italic text-[var(--color-bone-500)]">
                            {r.error ?? 'No output captured.'}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="border-t border-[var(--color-hairline)] grid grid-cols-3 text-mono text-[10px] tabular-nums">
                      <div className="px-3 py-2 text-[var(--color-bone-400)] border-r border-[var(--color-hairline)]">
                        <div className="text-eyebrow">tokens</div>
                        <div className="text-[var(--color-bone-200)] text-[12px] mt-0.5">
                          {r.totalTokens}
                        </div>
                      </div>
                      <div className="px-3 py-2 text-[var(--color-bone-400)] border-r border-[var(--color-hairline)]">
                        <div className="text-eyebrow">cost</div>
                        <div className="text-[var(--color-amber)] text-[12px] mt-0.5">
                          ${r.costUsd.toFixed(5)}
                        </div>
                      </div>
                      <div className="px-3 py-2 text-[var(--color-bone-400)]">
                        <div className="text-eyebrow">status</div>
                        <div className="text-[12px] mt-0.5 capitalize">
                          {r.status}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="glass mb-5">
              <div className="border-b border-[var(--color-hairline)] px-4 py-2.5 flex items-center justify-between">
                <span className="text-eyebrow flex items-center gap-1.5">
                  <Tag size={10} /> Tags
                </span>
                <div className="flex gap-1.5">
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTag()}
                    placeholder="add tag…"
                    className="text-mono text-[11px] bg-[var(--color-ink-200)]/40 border border-[var(--color-hairline)] px-2 py-1 placeholder:text-[var(--color-bone-500)]"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="text-mono text-[10px] uppercase tracking-widest border border-[var(--color-hairline-strong)] px-2 py-1 text-[var(--color-bone-300)] hover:text-[var(--color-bone-100)]"
                  >
                    add
                  </button>
                </div>
              </div>
              <div className="px-4 py-3 flex flex-wrap gap-1.5">
                {selected.tags.length === 0 ? (
                  <span className="text-mono text-[11px] text-[var(--color-bone-500)] italic">
                    no tags
                  </span>
                ) : (
                  selected.tags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => removeTag(t)}
                      className="text-mono text-[10px] uppercase tracking-widest border border-[var(--color-hairline-strong)] bg-[var(--color-ink-200)]/40 px-2 py-1 text-[var(--color-bone-300)] hover:border-[var(--color-signal-red)]/40 hover:text-[var(--color-signal-red)] transition-colors"
                    >
                      #{t} ×
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="glass">
              <div className="border-b border-[var(--color-hairline)] px-4 py-2.5">
                <span className="text-eyebrow">Notes</span>
              </div>
              <textarea
                value={selected.notes}
                onChange={(e) => noteRun(selected.id, e.target.value)}
                placeholder="What did you learn from this run?"
                rows={4}
                className="text-mono w-full bg-transparent px-4 py-3 text-[12px] leading-relaxed text-[var(--color-bone-200)] placeholder:text-[var(--color-bone-500)] resize-none"
              />
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function ActionButton({
  onClick,
  icon,
  children,
  danger = false,
}: {
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 border px-2.5 py-1.5 text-mono text-[10px] uppercase tracking-widest transition-colors ${
        danger
          ? 'border-[var(--color-hairline)] text-[var(--color-bone-400)] hover:border-[var(--color-signal-red)]/40 hover:text-[var(--color-signal-red)]'
          : 'border-[var(--color-hairline-strong)] text-[var(--color-bone-300)] hover:bg-[var(--color-ink-200)]/40 hover:text-[var(--color-bone-100)]'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}
