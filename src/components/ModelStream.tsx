import { useState } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { Copy, AlertCircle, Check } from 'lucide-react'
import type { ModelRunResult } from '@/types'
import { MODEL_BY_ID } from '@/lib/models'
import { MetricBadge } from '@/components/MetricBadge'

interface ModelStreamProps {
  result: ModelRunResult
  index: number
}

function formatCost(c: number) {
  if (c === 0) return '$0.0000'
  if (c < 0.001) return `$${c.toFixed(5)}`
  return `$${c.toFixed(4)}`
}

function formatLatency(ms: number) {
  if (!ms) return '—'
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

export function ModelStream({ result, index }: ModelStreamProps) {
  const spec = MODEL_BY_ID[result.modelId]
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  const isStreaming = result.status === 'streaming'
  const isError = result.status === 'error'
  const isDone = result.status === 'done'

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.32,
        delay: index * 0.06,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="glass relative flex h-full flex-col overflow-hidden"
    >
      <header className="flex items-center justify-between gap-3 border-b border-[var(--color-hairline)] px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{
              background: spec?.accent,
              boxShadow: isStreaming
                ? `0 0 10px ${spec?.accent}`
                : `0 0 4px ${spec?.accent}50`,
            }}
          />
          <div className="min-w-0">
            <h3 className="truncate text-[13px] tracking-tight text-[var(--color-bone-100)]">
              {spec?.label}
            </h3>
            <p className="text-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-bone-500)]">
              {spec?.provider}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusPill status={result.status} />
        </div>
      </header>

      <div
        role="region"
        aria-label={`${spec?.label ?? result.modelId} response`}
        aria-live={isStreaming ? 'polite' : 'off'}
        aria-busy={isStreaming}
        className={`relative min-h-[180px] flex-1 overflow-y-auto px-4 py-4 ${
          isStreaming ? 'scanline' : ''
        }`}
      >
        {isError ? (
          <div className="flex items-start gap-2 text-[12px] text-[var(--color-signal-red)]/90">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <div className="text-mono leading-relaxed">
              {result.error || 'Request failed.'}
            </div>
          </div>
        ) : result.text.length === 0 && !isStreaming ? (
          <div className="text-mono text-[11px] text-[var(--color-bone-500)] italic">
            Awaiting run…
          </div>
        ) : (
          <div className="prose-parallax text-[13px] leading-[1.7] text-[var(--color-bone-200)]">
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="mb-3 last:mb-0">{children}</p>
                ),
                code: ({ children, ...props }) => {
                  const isInline = !(props as { className?: string }).className
                  return isInline ? (
                    <code className="text-mono rounded bg-[var(--color-ink-300)]/60 px-1 py-0.5 text-[12px] text-[var(--color-amber-soft)]">
                      {children}
                    </code>
                  ) : (
                    <code className="text-mono block overflow-x-auto rounded border border-[var(--color-hairline)] bg-[var(--color-ink-0)]/80 p-3 text-[12px] text-[var(--color-bone-200)]">
                      {children}
                    </code>
                  )
                },
                ul: ({ children }) => (
                  <ul className="my-2 list-disc pl-5 space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="my-2 list-decimal pl-5 space-y-1">{children}</ol>
                ),
                strong: ({ children }) => (
                  <strong className="text-[var(--color-bone-100)] font-medium">
                    {children}
                  </strong>
                ),
              }}
            >
              {result.text}
            </ReactMarkdown>
            {isStreaming && <span className="cursor-bar" />}
          </div>
        )}
      </div>

      <footer className="border-t border-[var(--color-hairline)] bg-[var(--color-ink-100)]/40 px-4 py-3">
        <div className="grid grid-cols-3 gap-3">
          <MetricBadge
            label="Latency"
            value={formatLatency(result.latencyMs)}
            accent={isDone ? 'amber' : 'neutral'}
          />
          <MetricBadge
            label="Tokens"
            value={
              isStreaming
                ? `${result.completionTokens}`
                : `${result.totalTokens}`
            }
          />
          <MetricBadge
            label="Cost"
            value={formatCost(result.costUsd)}
            accent="amber"
            align="right"
          />
        </div>
        {isDone && (
          <div className="mt-3 flex items-center gap-1.5 border-t border-[var(--color-hairline)] pt-3">
            <button
              type="button"
              onClick={handleCopy}
              aria-label={copied ? 'Copied response' : 'Copy response'}
              className="flex items-center gap-1.5 border border-[var(--color-hairline)] bg-[var(--color-ink-200)]/40 px-2.5 py-1.5 text-mono text-[10px] uppercase tracking-widest text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-hairline-strong)] hover:text-[var(--color-bone-100)]"
            >
              {copied ? (
                <>
                  <Check
                    size={11}
                    aria-hidden="true"
                    className="text-[var(--color-signal-green)]"
                  />
                  copied
                </>
              ) : (
                <>
                  <Copy size={11} aria-hidden="true" />
                  copy
                </>
              )}
            </button>
          </div>
        )}
      </footer>
    </motion.article>
  )
}

function StatusPill({ status }: { status: ModelRunResult['status'] }) {
  const map = {
    idle: { label: 'idle', color: 'text-[var(--color-bone-500)]', dot: '#5e5e5b' },
    streaming: {
      label: 'streaming',
      color: 'text-[var(--color-amber)]',
      dot: '#f59e0b',
    },
    done: {
      label: 'complete',
      color: 'text-[var(--color-signal-green)]',
      dot: '#84cc16',
    },
    error: {
      label: 'error',
      color: 'text-[var(--color-signal-red)]',
      dot: '#ef4444',
    },
  } as const
  const s = map[status]
  return (
    <span className={`flex items-center gap-1.5 text-mono text-[10px] uppercase tracking-[0.18em] ${s.color}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === 'streaming' ? 'animate-pulse' : ''
        }`}
        style={{ background: s.dot, boxShadow: `0 0 6px ${s.dot}` }}
      />
      {s.label}
    </span>
  )
}
