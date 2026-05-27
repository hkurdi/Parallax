import { useMemo, useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { useParallaxStore } from '@/store/useParallaxStore'
import { evaluateResponse } from '@/lib/evaluator'
import { ScoreCard } from '@/components/ScoreCard'
import { MODEL_BY_ID } from '@/lib/models'
import type { EvaluationScore, ModelId } from '@/types'

export function Insights() {
  const { runs, activeRunId, setEvaluation } = useParallaxStore()
  const [selectedId, setSelectedId] = useState<string | null>(activeRunId)
  const [evaluating, setEvaluating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selected = useMemo(() => {
    const id = selectedId ?? activeRunId
    return runs.find((r) => r.id === id) ?? runs[0] ?? null
  }, [runs, selectedId, activeRunId])

  const completedRuns = useMemo(
    () =>
      runs.filter((r) =>
        Object.values(r.results).some((res) => res.status === 'done'),
      ),
    [runs],
  )

  const handleEvaluate = async () => {
    if (!selected) return
    setEvaluating(true)
    setError(null)
    try {
      const completed = Object.values(selected.results).filter(
        (r) => r.status === 'done',
      )
      await Promise.all(
        completed.map(async (r) => {
          const score = await evaluateResponse(
            selected.settings.userPrompt,
            r.text,
          )
          setEvaluation(selected.id, r.modelId, score)
        }),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setEvaluating(false)
    }
  }

  const scoredEntries = useMemo<[ModelId, EvaluationScore][]>(() => {
    const evaluations = selected?.evaluations
    if (!evaluations) return []
    return Object.entries(evaluations).flatMap(([id, score]) =>
      score ? [[id as ModelId, score] as [ModelId, EvaluationScore]] : [],
    )
  }, [selected])

  const winnerModel = useMemo<ModelId | null>(() => {
    if (scoredEntries.length === 0) return null
    return [...scoredEntries].sort((a, b) => b[1].overall - a[1].overall)[0][0]
  }, [scoredEntries])

  const evaluatorCost = scoredEntries.reduce(
    (acc, [, score]) => acc + score.evaluatorCostUsd,
    0,
  )
  const evaluatorModelName = scoredEntries[0]?.[1].evaluatorModel ?? null

  return (
    <div className="flex h-full flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
      <section className="w-full lg:w-[260px] xl:w-[280px] lg:shrink-0 border-b lg:border-b-0 lg:border-r border-[var(--color-hairline)] bg-[var(--color-ink-50)]/60 lg:h-full lg:overflow-y-auto">
        <header className="border-b border-[var(--color-hairline)] px-5 py-4">
          <p className="text-eyebrow">Insights</p>
          <h2 className="text-display text-lg sm:text-xl text-[var(--color-bone-100)] mt-1">
            Auto-evaluation
          </h2>
        </header>
        <ul>
          {completedRuns.length === 0 ? (
            <li className="px-5 py-8 text-center text-mono text-[11px] text-[var(--color-bone-500)]">
              No completed runs yet.
            </li>
          ) : (
            completedRuns.map((r) => {
              const isActive = selected?.id === r.id
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className={`group block w-full border-b border-[var(--color-hairline)]/60 px-5 py-3 text-left transition-colors ${
                      isActive
                        ? 'bg-[var(--color-ink-300)]/40'
                        : 'hover:bg-[var(--color-ink-200)]/30'
                    }`}
                  >
                    <div className="flex items-center justify-between text-mono text-[10px] uppercase tracking-widest mb-1">
                      <span
                        className={
                          isActive
                            ? 'text-[var(--color-amber)]'
                            : 'text-[var(--color-bone-500)]'
                        }
                      >
                        {r.id.slice(-5)}
                      </span>
                      {r.evaluations && (
                        <span className="text-[var(--color-signal-green)]">scored</span>
                      )}
                    </div>
                    <p
                      className={`text-[12px] leading-snug line-clamp-2 ${
                        isActive
                          ? 'text-[var(--color-bone-100)]'
                          : 'text-[var(--color-bone-300)]'
                      }`}
                    >
                      {r.settings.userPrompt}
                    </p>
                  </button>
                </li>
              )
            })
          )}
        </ul>
      </section>

      <section className="flex-1 min-w-0 lg:overflow-y-auto min-h-[480px] lg:min-h-0">
        {!selected ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-display text-3xl text-[var(--color-bone-300)]">
                Nothing to evaluate
              </p>
              <p className="text-mono text-[11px] text-[var(--color-bone-500)] mt-2">
                Run a prompt in the Lab first.
              </p>
            </div>
          </div>
        ) : (
          <div className="px-5 sm:px-8 py-5 sm:py-6">
            <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6 mb-6">
              <div className="min-w-0">
                <p className="text-eyebrow">Evaluating</p>
                <h1 className="text-display text-xl sm:text-2xl text-[var(--color-bone-100)] mt-1 leading-tight line-clamp-2">
                  {selected.settings.userPrompt}
                </h1>
              </div>
              <button
                type="button"
                onClick={handleEvaluate}
                disabled={evaluating}
                className={`shrink-0 flex items-center gap-2 px-4 py-2.5 text-[12px] transition-all ${
                  evaluating
                    ? 'border border-[var(--color-amber)]/40 bg-[var(--color-amber)]/10 text-[var(--color-amber)] cursor-wait'
                    : 'bg-[var(--color-amber)] text-[var(--color-ink-0)] amber-glow-soft hover:amber-glow'
                }`}
              >
                {evaluating ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span className="text-mono uppercase tracking-widest">
                      scoring…
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles size={12} />
                    <span className="text-mono uppercase tracking-widest">
                      {scoredEntries.length > 0 ? 're-evaluate' : 'evaluate'}
                    </span>
                  </>
                )}
              </button>
            </header>

            {error && (
              <div className="mb-5 border border-[var(--color-signal-red)]/30 bg-[var(--color-signal-red)]/5 text-[var(--color-signal-red)] text-mono text-[11px] px-4 py-3">
                {error}
              </div>
            )}

            {scoredEntries.length > 0 ? (
              <>
                <div className="mb-5 flex items-center justify-between text-mono text-[10.5px] text-[var(--color-bone-400)] tabular-nums border-b border-[var(--color-hairline)] pb-3">
                  <span className="text-eyebrow">
                    Evaluator{' '}
                    <span className="text-[var(--color-bone-300)]">
                      {evaluatorModelName}
                    </span>
                  </span>
                  <span>
                    eval cost{' '}
                    <span className="text-[var(--color-amber)]">
                      ${evaluatorCost.toFixed(5)}
                    </span>
                  </span>
                </div>

                <div
                  className={`grid gap-5 mb-8 grid-cols-1 ${
                    scoredEntries.length > 1 ? 'md:grid-cols-2' : ''
                  }`}
                >
                  {scoredEntries.map(([modelId, score]) => (
                    <ScoreCard
                      key={modelId}
                      modelId={modelId}
                      score={score}
                      isWinner={modelId === winnerModel}
                    />
                  ))}
                </div>

                <div className="glass overflow-hidden">
                  <div className="flex items-center justify-between border-b border-[var(--color-hairline)] px-4 py-2.5">
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-mono text-[10px] text-[var(--color-amber)]">
                        H2H
                      </span>
                      <h3 className="text-[12px] tracking-tight text-[var(--color-bone-200)]">
                        Head-to-head comparison
                      </h3>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead>
                      <tr className="border-b border-[var(--color-hairline)]">
                        <th className="text-eyebrow text-left px-4 py-2.5 font-normal">
                          Model
                        </th>
                        <th className="text-eyebrow text-right px-4 py-2.5 font-normal">
                          Relevance
                        </th>
                        <th className="text-eyebrow text-right px-4 py-2.5 font-normal">
                          Coherence
                        </th>
                        <th className="text-eyebrow text-right px-4 py-2.5 font-normal">
                          Conciseness
                        </th>
                        <th className="text-eyebrow text-right px-4 py-2.5 font-normal">
                          Instruction
                        </th>
                        <th className="text-eyebrow text-right px-4 py-2.5 font-normal">
                          Overall
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-mono text-[12px] tabular-nums">
                      {[...scoredEntries]
                        .sort((a, b) => b[1].overall - a[1].overall)
                        .map(([modelId, score]) => {
                          const isWinner = modelId === winnerModel
                          const spec = MODEL_BY_ID[modelId]
                          return (
                            <tr
                              key={modelId}
                              className="border-b border-[var(--color-hairline)]/60 last:border-b-0"
                            >
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2.5">
                                  <span
                                    className="h-1.5 w-1.5 rounded-full"
                                    style={{ background: spec?.accent }}
                                  />
                                  <span
                                    className={
                                      isWinner
                                        ? 'text-[var(--color-amber)]'
                                        : 'text-[var(--color-bone-100)]'
                                    }
                                  >
                                    {spec?.label}
                                  </span>
                                  {isWinner && (
                                    <span className="text-mono text-[9px] uppercase tracking-widest text-[var(--color-amber)] border border-[var(--color-amber)]/40 px-1.5 py-0.5">
                                      ◊ winner
                                    </span>
                                  )}
                                </div>
                              </td>
                              <Cell value={score.relevance} />
                              <Cell value={score.coherence} />
                              <Cell value={score.conciseness} />
                              <Cell value={score.instructionFollowing} />
                              <Cell value={score.overall} accent />
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="border border-dashed border-[var(--color-hairline-strong)] px-8 py-16 text-center">
                <Sparkles
                  size={20}
                  className="mx-auto text-[var(--color-amber)] mb-3"
                />
                <p className="text-display text-2xl text-[var(--color-bone-100)]">
                  Not yet evaluated
                </p>
                <p className="text-mono text-[11px] text-[var(--color-bone-400)] mt-2 max-w-md mx-auto leading-relaxed">
                  Run auto-evaluation to score each model on relevance,
                  coherence, conciseness, instruction-following, and overall
                  quality. Powered by Claude Haiku 4.5 via Keywords AI.
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function Cell({ value, accent = false }: { value: number; accent?: boolean }) {
  return (
    <td
      className={`px-4 py-2.5 text-right ${
        accent ? 'text-[var(--color-amber)]' : 'text-[var(--color-bone-200)]'
      }`}
    >
      {value}
    </td>
  )
}
