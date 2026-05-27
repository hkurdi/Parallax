import type { ChatMessage, LogEntry, ModelId } from '@/types'
import { MODEL_BY_ID } from '@/lib/models'

const KEYWORDS_AI_BASE = 'https://api.keywordsai.co/api'
const KEYWORDS_AI_KEY = import.meta.env.VITE_KEYWORDS_AI_API_KEY as
  | string
  | undefined

export interface RunCompletionParams {
  model: ModelId
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
  onToken?: (delta: string) => void
}

export interface RunCompletionResult {
  text: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  costUsd: number
  latencyMs: number
}

function authHeaders(): HeadersInit {
  if (!KEYWORDS_AI_KEY) {
    throw new Error(
      'VITE_KEYWORDS_AI_API_KEY is not set. Copy .env.example to .env and add your key.',
    )
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${KEYWORDS_AI_KEY}`,
  }
}

function estimateCost(
  modelId: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const spec = MODEL_BY_ID[modelId]
  if (!spec) return 0
  const input = (promptTokens / 1000) * spec.inputCostPer1k
  const output = (completionTokens / 1000) * spec.outputCostPer1k
  return input + output
}

export async function runCompletion({
  model,
  messages,
  temperature = 0.7,
  maxTokens = 1000,
  signal,
  onToken,
}: RunCompletionParams): Promise<RunCompletionResult> {
  const startedAt = performance.now()
  const spec = MODEL_BY_ID[model]
  const cappedTemperature = spec
    ? Math.min(Math.max(temperature, 0), spec.maxTemperature)
    : temperature

  const res = await fetch(`${KEYWORDS_AI_BASE}/chat/completions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      model,
      messages,
      temperature: cappedTemperature,
      max_tokens: maxTokens,
      stream: true,
      stream_options: { include_usage: true },
    }),
    signal,
  })

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Keywords AI ${res.status}: ${detail.slice(0, 200)}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  let promptTokens = 0
  let completionTokens = 0
  let totalTokens = 0
  let reportedCost: number | null = null

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line || !line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') continue
      try {
        const json = JSON.parse(payload)
        const delta: string | undefined = json?.choices?.[0]?.delta?.content
        if (delta) {
          text += delta
          onToken?.(delta)
        }
        if (json?.usage) {
          promptTokens = json.usage.prompt_tokens ?? promptTokens
          completionTokens = json.usage.completion_tokens ?? completionTokens
          totalTokens = json.usage.total_tokens ?? totalTokens
        }
        const keywordsCost: number | undefined =
          json?.keywords_ai?.cost ?? json?.cost
        if (typeof keywordsCost === 'number') {
          reportedCost = keywordsCost
        }
      } catch {
        // skip malformed chunk
      }
    }
  }

  const latencyMs = Math.round(performance.now() - startedAt)
  if (!completionTokens) completionTokens = Math.ceil(text.length / 4)
  if (!totalTokens) totalTokens = promptTokens + completionTokens
  const costUsd = reportedCost ?? estimateCost(model, promptTokens, completionTokens)

  return {
    text,
    promptTokens,
    completionTokens,
    totalTokens,
    costUsd,
    latencyMs,
  }
}

type RawRecord = Record<string, unknown>

function pickString(rec: RawRecord, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = rec[k]
    if (typeof v === 'string' && v.length > 0) return v
  }
  return undefined
}

function pickNumber(rec: RawRecord, keys: string[]): number {
  for (const k of keys) {
    const v = rec[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
  }
  return 0
}

function pickPrompt(rec: RawRecord): string {
  const messages = rec.prompt_messages
  if (Array.isArray(messages) && messages.length > 0) {
    const first = messages[0]
    if (first && typeof first === 'object') {
      const content = (first as RawRecord).content
      if (typeof content === 'string') return content.slice(0, 140)
    }
  }
  return pickString(rec, ['full_request', 'prompt']) ?? ''
}

export async function fetchLogs(params: {
  days?: number
  limit?: number
}): Promise<LogEntry[]> {
  if (!KEYWORDS_AI_KEY) return []
  const days = params.days ?? 7
  const limit = params.limit ?? 200
  const from = new Date(Date.now() - days * 86400_000).toISOString()
  const url = new URL(`${KEYWORDS_AI_BASE}/request-logs/`)
  url.searchParams.set('start_time', from)
  url.searchParams.set('page_size', String(limit))

  const res = await fetch(url.toString(), { headers: authHeaders() })
  if (!res.ok) {
    throw new Error(`Keywords AI logs ${res.status}`)
  }
  const data = (await res.json()) as RawRecord
  const items: unknown[] = Array.isArray(data?.results)
    ? (data.results as unknown[])
    : Array.isArray(data?.logs)
      ? (data.logs as unknown[])
      : Array.isArray(data?.data)
        ? (data.data as unknown[])
        : []

  return items.flatMap((raw, i): LogEntry[] => {
    if (!raw || typeof raw !== 'object') return []
    const item = raw as RawRecord
    const tokensIn = pickNumber(item, ['prompt_tokens', 'input_tokens'])
    const tokensOut = pickNumber(item, ['completion_tokens', 'output_tokens'])
    const cost = pickNumber(item, ['cost', 'total_cost'])
    const latencySeconds = pickNumber(item, ['latency', 'total_latency'])
    const timestampRaw = pickString(item, ['timestamp', 'created_at'])
    const id = pickString(item, ['id', 'unique_id']) ?? String(i)
    const status =
      item.status === 'success' || !item.error ? 'success' : 'error'

    return [
      {
        id,
        timestamp: timestampRaw
          ? new Date(timestampRaw).getTime()
          : Date.now(),
        model: pickString(item, ['model', 'model_name']) ?? 'unknown',
        promptPreview: pickPrompt(item),
        promptTokens: tokensIn,
        completionTokens: tokensOut,
        costUsd: cost,
        latencyMs: Math.round(latencySeconds * 1000),
        status,
      },
    ]
  })
}

export const hasApiKey = (): boolean => Boolean(KEYWORDS_AI_KEY)
