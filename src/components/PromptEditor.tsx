import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Play, Loader2, Square } from 'lucide-react'
import { useParallaxStore } from '@/store/useParallaxStore'
import { MODELS } from '@/lib/models'

interface PromptEditorProps {
  running: boolean
  onRun: () => void
  onCancel: () => void
}

export function PromptEditor({ running, onRun, onCancel }: PromptEditorProps) {
  const { settings, setSettings, toggleModel } = useParallaxStore()
  const [systemOpen, setSystemOpen] = useState(false)

  const lineNumbers = useMemo(() => {
    const lines = settings.userPrompt.split('\n').length
    return Array.from({ length: Math.max(lines, 8) }, (_, i) => i + 1)
  }, [settings.userPrompt])

  const canRun = settings.userPrompt.trim().length > 0 && settings.models.length > 0

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-hairline)] px-5 sm:px-6 py-4">
        <div className="min-w-0">
          <p className="text-eyebrow">Prompt</p>
          <h2 className="text-display text-lg sm:text-xl text-[var(--color-bone-100)] mt-1">
            Editor
          </h2>
        </div>
        <div className="text-mono text-[10px] text-[var(--color-bone-500)] tabular-nums shrink-0 text-right">
          {settings.userPrompt.length} chars · ~
          {Math.ceil(settings.userPrompt.length / 4)} tokens
        </div>
      </div>

      <div className="border-b border-[var(--color-hairline)]">
        <button
          type="button"
          onClick={() => setSystemOpen((v) => !v)}
          aria-expanded={systemOpen}
          aria-controls="parallax-system-prompt"
          className="flex w-full items-center gap-2 px-5 sm:px-6 py-3 text-left text-[12px] text-[var(--color-bone-400)] hover:bg-[var(--color-ink-200)]/40 transition-colors"
        >
          <ChevronDown
            size={12}
            aria-hidden="true"
            className={`transition-transform duration-200 ${
              systemOpen ? '' : '-rotate-90'
            }`}
          />
          <span className="text-eyebrow">System Prompt</span>
          {!systemOpen && (
            <span className="text-mono text-[10px] text-[var(--color-bone-500)] truncate">
              {settings.systemPrompt.slice(0, 80)}
            </span>
          )}
        </button>
        <AnimatePresence initial={false}>
          {systemOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <textarea
                id="parallax-system-prompt"
                value={settings.systemPrompt}
                onChange={(e) => setSettings({ systemPrompt: e.target.value })}
                rows={3}
                aria-label="System prompt"
                className="text-mono w-full resize-none bg-transparent px-5 sm:px-6 py-3 text-[13px] leading-relaxed text-[var(--color-bone-200)] placeholder:text-[var(--color-bone-500)]"
                placeholder="Define the assistant's behavior…"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative flex-1 min-h-[200px]">
        <div className="absolute inset-0 grid grid-cols-[44px_1fr] sm:grid-cols-[48px_1fr] overflow-hidden">
          <div
            aria-hidden="true"
            className="border-r border-[var(--color-hairline)] bg-[var(--color-ink-100)]/40 py-4 text-right overflow-hidden"
          >
            {lineNumbers.map((n) => (
              <div
                key={n}
                className="text-mono px-2 text-[11px] leading-[1.65] text-[var(--color-bone-500)]/60 tabular-nums"
              >
                {String(n).padStart(2, '0')}
              </div>
            ))}
          </div>
          <textarea
            value={settings.userPrompt}
            onChange={(e) => setSettings({ userPrompt: e.target.value })}
            placeholder="Type your prompt here…"
            aria-label="User prompt"
            className="text-mono h-full w-full resize-none bg-transparent px-3 sm:px-4 py-4 text-[13px] leading-[1.65] text-[var(--color-bone-100)] placeholder:text-[var(--color-bone-500)]/60"
            spellCheck={false}
          />
        </div>
      </div>

      <div className="border-t border-[var(--color-hairline)] px-5 sm:px-6 py-4">
        <div className="grid grid-cols-2 gap-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-eyebrow">Temperature</span>
              <span className="text-mono text-[11px] text-[var(--color-amber)] tabular-nums">
                {settings.temperature.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={settings.temperature}
              onChange={(e) =>
                setSettings({ temperature: parseFloat(e.target.value) })
              }
              aria-label="Temperature"
              aria-valuemin={0}
              aria-valuemax={2}
              aria-valuenow={settings.temperature}
              className="parallax-slider w-full"
              style={
                {
                  '--slider-fill': `${(settings.temperature / 2) * 100}%`,
                } as React.CSSProperties
              }
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-eyebrow">Max Tokens</span>
              <span className="text-mono text-[11px] text-[var(--color-bone-300)] tabular-nums">
                {settings.maxTokens}
              </span>
            </div>
            <input
              type="number"
              min={1}
              max={8192}
              value={settings.maxTokens}
              onChange={(e) =>
                setSettings({ maxTokens: Math.max(1, parseInt(e.target.value || '0', 10)) })
              }
              className="text-mono w-full border border-[var(--color-hairline-strong)] bg-[var(--color-ink-200)]/60 px-3 py-1.5 text-[12px] tabular-nums focus:border-[var(--color-amber)]/40 transition-colors"
            />
          </div>
        </div>

        <div className="mt-5">
          <p className="text-eyebrow mb-2">Models</p>
          <div className="grid grid-cols-2 gap-1.5">
            {MODELS.map((m) => {
              const active = settings.models.includes(m.id)
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleModel(m.id)}
                  className={`group relative flex items-center justify-between gap-2 border px-3 py-2 text-left text-[11.5px] transition-all duration-150 ${
                    active
                      ? 'border-[var(--color-hairline-strong)] bg-[var(--color-ink-300)]/40 text-[var(--color-bone-100)]'
                      : 'border-[var(--color-hairline)] bg-transparent text-[var(--color-bone-400)] hover:border-[var(--color-hairline-strong)] hover:text-[var(--color-bone-200)]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        background: m.accent,
                        boxShadow: active
                          ? `0 0 8px ${m.accent}`
                          : 'none',
                      }}
                    />
                    <span className="tracking-tight">{m.label}</span>
                  </span>
                  <span className="text-mono text-[9px] uppercase tracking-widest text-[var(--color-bone-500)]">
                    {m.provider}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          {running ? (
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cancel run"
              className="flex items-center justify-center gap-2 border border-[var(--color-signal-red)]/40 bg-[var(--color-signal-red)]/10 px-4 py-2.5 text-[12px] text-[var(--color-signal-red)] hover:bg-[var(--color-signal-red)]/20 transition-colors flex-1"
            >
              <Square size={12} fill="currentColor" aria-hidden="true" />
              <span className="text-mono uppercase tracking-widest">Cancel run</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onRun}
              disabled={!canRun}
              aria-busy={running}
              aria-label={`Run ${settings.models.length} model${settings.models.length === 1 ? '' : 's'}`}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 text-[12px] flex-1 transition-all duration-150 ${
                canRun
                  ? 'bg-[var(--color-amber)] text-[var(--color-ink-0)] amber-glow-soft hover:amber-glow'
                  : 'bg-[var(--color-ink-300)] text-[var(--color-bone-500)] cursor-not-allowed'
              }`}
            >
              {running ? (
                <Loader2 size={12} className="animate-spin" aria-hidden="true" />
              ) : (
                <Play size={12} fill="currentColor" aria-hidden="true" />
              )}
              <span className="text-mono uppercase tracking-widest">
                Run · {settings.models.length} model
                {settings.models.length === 1 ? '' : 's'}
              </span>
            </button>
          )}
        </div>
      </div>

    </div>
  )
}
