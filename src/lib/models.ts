import type { ModelSpec } from '@/types'

export const MODELS: ReadonlyArray<ModelSpec> = [
  {
    id: 'gpt-5',
    label: 'GPT-5',
    provider: 'OpenAI',
    accent: '#10a37f',
    inputCostPer1k: 0.00125,
    outputCostPer1k: 0.01,
  },
  {
    id: 'groq/llama-3.3-70b-versatile',
    label: 'Llama 3.3 70B',
    provider: 'Groq',
    accent: '#f55036',
    inputCostPer1k: 0.00059,
    outputCostPer1k: 0.00079,
  },
  {
    id: 'claude-haiku-4-5-20251001',
    label: 'Claude 4.5 Haiku',
    provider: 'Anthropic',
    accent: '#d97757',
    inputCostPer1k: 0.001,
    outputCostPer1k: 0.005,
  },
  {
    id: 'gemini/gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash Lite',
    provider: 'Google',
    accent: '#4285f4',
    inputCostPer1k: 0.000075,
    outputCostPer1k: 0.0003,
  },
]

export const MODEL_BY_ID: { [id: string]: ModelSpec } = Object.fromEntries(
  MODELS.map((m) => [m.id, m]),
)

export const VALID_MODEL_IDS = new Set<string>(MODELS.map((m) => m.id))

export const isModelId = (value: unknown): value is import('@/types').ModelId =>
  typeof value === 'string' && VALID_MODEL_IDS.has(value)
