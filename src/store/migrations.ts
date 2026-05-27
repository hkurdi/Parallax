import type { ModelId, RunRecord, RunSettings } from '@/types'
import { isModelId } from '@/lib/models'

const LEGACY_ID_REMAP: { [legacy: string]: ModelId | null } = {
  'gpt-4o': 'gpt-5',
  'gpt-4o-mini': null,
  'claude-3-5-sonnet-20241022': 'claude-haiku-4-5-20251001',
  'claude-haiku-4-5': 'claude-haiku-4-5-20251001',
  'mistral-large-latest': null,
  'gemini-1.5-pro': 'gemini/gemini-2.5-flash-lite',
  'gemini-1.5-flash': 'gemini/gemini-2.5-flash-lite',
  'gemini-2.0-flash': 'gemini/gemini-2.5-flash-lite',
  'gemini-2.5-flash-lite': 'gemini/gemini-2.5-flash-lite',
}

function remapId(id: unknown): ModelId | null {
  if (isModelId(id)) return id
  if (typeof id !== 'string') return null
  return LEGACY_ID_REMAP[id] ?? null
}

function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

function migrateSettings(raw: unknown): RunSettings | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Record<string, unknown>
  const models = Array.isArray(s.models)
    ? uniq(
        s.models
          .map(remapId)
          .filter((id): id is ModelId => id !== null),
      )
    : []
  return {
    systemPrompt: typeof s.systemPrompt === 'string' ? s.systemPrompt : '',
    userPrompt: typeof s.userPrompt === 'string' ? s.userPrompt : '',
    temperature:
      typeof s.temperature === 'number' && Number.isFinite(s.temperature)
        ? s.temperature
        : 0.7,
    maxTokens:
      typeof s.maxTokens === 'number' && Number.isFinite(s.maxTokens)
        ? s.maxTokens
        : 1000,
    models,
  }
}

function migrateRun(raw: unknown): RunRecord | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string') return null
  const settings = migrateSettings(r.settings)
  if (!settings) return null
  const rawResults = (r.results ?? {}) as Record<string, unknown>
  const results: Record<string, unknown> = {}
  for (const [legacyId, value] of Object.entries(rawResults)) {
    const id = remapId(legacyId)
    if (!id) continue
    if (value && typeof value === 'object') {
      results[id] = { ...(value as Record<string, unknown>), modelId: id }
    }
  }
  const rawEvaluations =
    r.evaluations && typeof r.evaluations === 'object'
      ? (r.evaluations as Record<string, unknown>)
      : null
  const evaluations: Record<string, unknown> | undefined = rawEvaluations
    ? Object.entries(rawEvaluations).reduce<Record<string, unknown>>(
        (acc, [legacyId, score]) => {
          const id = remapId(legacyId)
          if (id && score) acc[id] = score
          return acc
        },
        {},
      )
    : undefined
  return {
    id: r.id,
    createdAt:
      typeof r.createdAt === 'number' && Number.isFinite(r.createdAt)
        ? r.createdAt
        : Date.now(),
    settings,
    results: results as RunRecord['results'],
    evaluations: evaluations as RunRecord['evaluations'],
    tags: Array.isArray(r.tags)
      ? r.tags.filter((t): t is string => typeof t === 'string')
      : [],
    notes: typeof r.notes === 'string' ? r.notes : '',
  }
}

export interface PersistedShape {
  settings: RunSettings
  runs: RunRecord[]
}

export const CURRENT_PERSIST_VERSION = 6

export function migratePersistedState(
  persisted: unknown,
): PersistedShape | undefined {
  if (!persisted || typeof persisted !== 'object') return undefined
  const root = persisted as Record<string, unknown>
  const settings = migrateSettings(root.settings)
  const runs = Array.isArray(root.runs)
    ? root.runs
        .map(migrateRun)
        .filter((r): r is RunRecord => r !== null)
    : []
  if (!settings) return undefined
  return { settings, runs }
}
