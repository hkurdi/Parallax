export type ModelId =
  | 'gpt-5'
  | 'groq/llama-3.3-70b-versatile'
  | 'claude-haiku-4-5-20251001'
  | 'gemini/gemini-2.5-flash-lite'

export type ModelStatus = 'idle' | 'streaming' | 'done' | 'error'

export interface ModelSpec {
  id: ModelId
  label: string
  provider: 'OpenAI' | 'Anthropic' | 'Google' | 'Groq'
  accent: string
  inputCostPer1k: number
  outputCostPer1k: number
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ModelRunResult {
  modelId: ModelId
  status: ModelStatus
  text: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  costUsd: number
  latencyMs: number
  startedAt: number
  finishedAt: number | null
  error: string | null
}

export interface RunSettings {
  systemPrompt: string
  userPrompt: string
  temperature: number
  maxTokens: number
  models: ModelId[]
}

export interface RunRecord {
  id: string
  createdAt: number
  settings: RunSettings
  results: Record<ModelId, ModelRunResult>
  evaluations?: Partial<Record<ModelId, EvaluationScore>>
  tags: string[]
  notes: string
}

export interface EvaluationScore {
  relevance: number
  coherence: number
  conciseness: number
  instructionFollowing: number
  overall: number
  evaluatorCostUsd: number
  evaluatorModel: string
}

export interface LogEntry {
  id: string
  timestamp: number
  model: string
  promptPreview: string
  promptTokens: number
  completionTokens: number
  costUsd: number
  latencyMs: number
  status: 'success' | 'error'
}

