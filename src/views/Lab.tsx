import { useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { History, ArrowUpRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { PromptEditor } from '@/components/PromptEditor'
import { ModelStream } from '@/components/ModelStream'
import { useParallaxStore } from '@/store/useParallaxStore'
import { runCompletion, hasApiKey } from '@/lib/keywordsai'
import type { ChatMessage, ModelId, ModelRunResult } from '@/types'

export function Lab() {
  const {
    settings,
    runs,
    activeRunId,
    sessionRunIds,
    startRun,
    appendResultText,
    patchResult,
    loadRun,
  } = useParallaxStore()

  const [running, setRunning] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const activeRun = useMemo(
    () => runs.find((r) => r.id === activeRunId) ?? null,
    [runs, activeRunId],
  )

  const sessionRuns = useMemo(
    () =>
      sessionRunIds
        .map((id) => runs.find((r) => r.id === id))
        .filter((r): r is NonNullable<typeof r> => Boolean(r)),
    [sessionRunIds, runs],
  )

  const sessionCost = sessionRuns.reduce(
    (acc, r) =>
      acc +
      Object.values(r.results).reduce((s, res) => s + res.costUsd, 0),
    0,
  )

  const handleRun = async () => {
    if (!hasApiKey()) {
      alert(
        'Add VITE_KEYWORDS_AI_API_KEY to a .env file in the project root, then restart the dev server.',
      )
      return
    }
    const runId = startRun()
    setRunning(true)
    abortRef.current = new AbortController()
    const messages: ChatMessage[] = [
      { role: 'system', content: settings.systemPrompt },
      { role: 'user', content: settings.userPrompt },
    ]

    await Promise.allSettled(
      settings.models.map(async (modelId: ModelId) => {
        const startedAt = Date.now()
        try {
          const result = await runCompletion({
            model: modelId,
            messages,
            temperature: settings.temperature,
            maxTokens: settings.maxTokens,
            signal: abortRef.current?.signal,
            onToken: (delta) => appendResultText(runId, modelId, delta),
          })
          patchResult(runId, modelId, {
            text: result.text,
            status: 'done',
            promptTokens: result.promptTokens,
            completionTokens: result.completionTokens,
            totalTokens: result.totalTokens,
            costUsd: result.costUsd,
            latencyMs: result.latencyMs,
            finishedAt: Date.now(),
          })
        } catch (err) {
          const isAbort =
            err instanceof Error && err.name === 'AbortError'
          patchResult(runId, modelId, {
            status: isAbort ? 'idle' : 'error',
            error: isAbort
              ? 'Cancelled'
              : err instanceof Error
                ? err.message
                : String(err),
            latencyMs: Date.now() - startedAt,
            finishedAt: Date.now(),
          })
        }
      }),
    )

    setRunning(false)
    abortRef.current = null
  }

  const handleCancel = () => {
    abortRef.current?.abort()
  }

  const selectedModels: ModelRunResult[] = useMemo(
    () =>
      settings.models.map((id) => {
        const fromRun = activeRun?.results[id]
        if (fromRun) return fromRun
        return {
          modelId: id,
          status: 'idle',
          text: '',
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          costUsd: 0,
          latencyMs: 0,
          startedAt: 0,
          finishedAt: null,
          error: null,
        }
      }),
    [settings.models, activeRun],
  )

  const gridCols =
    selectedModels.length <= 1
      ? 'grid-cols-1'
      : selectedModels.length === 2
        ? 'grid-cols-1 md:grid-cols-2'
        : selectedModels.length === 3
          ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
          : 'grid-cols-1 md:grid-cols-2'

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
      <section className="w-full lg:w-[420px] xl:w-[440px] lg:shrink-0 border-b lg:border-b-0 lg:border-r border-[var(--color-hairline)] bg-[var(--color-ink-50)]/60 lg:h-full lg:overflow-hidden min-h-[640px] lg:min-h-0">
        <PromptEditor
          running={running}
          onRun={handleRun}
          onCancel={handleCancel}
        />
      </section>

      <section className="flex min-w-0 flex-1 flex-col lg:overflow-hidden min-h-[480px] lg:min-h-0">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--color-hairline)] px-5 sm:px-8 py-4">
          <div className="min-w-0">
            <p className="text-eyebrow">Lab · Response Grid</p>
            <h1 className="text-display text-xl sm:text-2xl text-[var(--color-bone-100)] mt-1 leading-tight">
              See your prompts <span className="italic text-[var(--color-amber)]">from every angle</span>.
            </h1>
          </div>
          <div className="text-mono text-[11px] text-[var(--color-bone-500)] tabular-nums shrink-0">
            {selectedModels.length} stream{selectedModels.length === 1 ? '' : 's'} ·{' '}
            {running ? (
              <span className="text-[var(--color-amber)]">live</span>
            ) : (
              <span>idle</span>
            )}
          </div>
        </header>

        <div className="grid-paper relative flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 lg:py-8">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={activeRunId ?? 'empty'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              className={`grid gap-5 ${gridCols}`}
            >
              {selectedModels.map((r, i) => (
                <ModelStream key={r.modelId} result={r} index={i} />
              ))}
            </motion.div>
          </AnimatePresence>

          {selectedModels.length === 0 && (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <p className="text-display text-3xl text-[var(--color-bone-300)]">
                  No models selected
                </p>
                <p className="text-mono text-[11px] text-[var(--color-bone-500)] mt-2 uppercase tracking-widest">
                  Toggle at least one model in the editor
                </p>
              </div>
            </div>
          )}
        </div>

        <footer className="border-t border-[var(--color-hairline)] bg-[var(--color-ink-100)]/60 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <History
                size={13}
                aria-hidden="true"
                className="text-[var(--color-bone-500)] shrink-0"
              />
              <span className="text-eyebrow shrink-0">Session</span>
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {sessionRuns.length === 0 ? (
                  <span className="text-mono text-[10.5px] text-[var(--color-bone-500)] italic">
                    no runs yet
                  </span>
                ) : (
                  sessionRuns.map((r) => {
                    const isActive = r.id === activeRunId
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => loadRun(r.id)}
                        aria-label={`Load run ${r.id.slice(-5)}`}
                        aria-pressed={isActive}
                        className={`group flex shrink-0 items-center gap-1.5 border px-2 py-1 text-mono text-[10px] uppercase tracking-widest transition-colors ${
                          isActive
                            ? 'border-[var(--color-amber)]/40 bg-[var(--color-amber)]/10 text-[var(--color-amber)]'
                            : 'border-[var(--color-hairline)] text-[var(--color-bone-400)] hover:border-[var(--color-hairline-strong)] hover:text-[var(--color-bone-200)]'
                        }`}
                      >
                        <span className="tabular-nums">{r.id.slice(-5)}</span>
                        <span aria-hidden="true" className="text-[var(--color-bone-500)]">·</span>
                        <span>
                          {formatDistanceToNow(r.createdAt, { addSuffix: false })}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 sm:border-l border-[var(--color-hairline)] sm:pl-6">
              <span className="text-eyebrow">Session cost</span>
              <span className="text-mono text-[14px] tabular-nums text-[var(--color-amber)]">
                ${sessionCost.toFixed(4)}
              </span>
              <ArrowUpRight
                size={11}
                aria-hidden="true"
                className="text-[var(--color-amber)]"
              />
            </div>
          </div>
        </footer>
      </section>
    </div>
  )
}
