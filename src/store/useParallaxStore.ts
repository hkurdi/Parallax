import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  EvaluationScore,
  ModelId,
  ModelRunResult,
  RunRecord,
  RunSettings,
} from '@/types'
import {
  CURRENT_PERSIST_VERSION,
  migratePersistedState,
} from '@/store/migrations'

const DEFAULT_SYSTEM_PROMPT =
  'You are a precise, helpful assistant. Answer concisely and directly.'

const DEFAULT_USER_PROMPT =
  'Explain the bias–variance tradeoff to a senior engineer in under 80 words.'

interface ParallaxState {
  settings: RunSettings
  activeRunId: string | null
  runs: RunRecord[]
  sessionRunIds: string[]
  selectedLibraryId: string | null
  setSettings: (patch: Partial<RunSettings>) => void
  toggleModel: (id: ModelId) => void
  startRun: () => string
  patchResult: (
    runId: string,
    modelId: ModelId,
    patch: Partial<ModelRunResult>,
  ) => void
  appendResultText: (runId: string, modelId: ModelId, chunk: string) => void
  setEvaluation: (
    runId: string,
    modelId: ModelId,
    score: EvaluationScore,
  ) => void
  loadRun: (runId: string) => void
  selectLibraryItem: (runId: string | null) => void
  tagRun: (runId: string, tags: string[]) => void
  noteRun: (runId: string, notes: string) => void
  deleteRun: (runId: string) => void
}

const makeEmptyResult = (modelId: ModelId): ModelRunResult => ({
  modelId,
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
})

export const useParallaxStore = create<ParallaxState>()(
  persist(
    (set, get) => ({
      settings: {
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        userPrompt: DEFAULT_USER_PROMPT,
        temperature: 0.7,
        maxTokens: 1000,
        models: ['gpt-5', 'groq/llama-3.3-70b-versatile', 'claude-haiku-4-5-20251001', 'gemini/gemini-2.5-flash-lite'],
      },
      activeRunId: null,
      runs: [],
      sessionRunIds: [],
      selectedLibraryId: null,

      setSettings: (patch) =>
        set((state) => ({ settings: { ...state.settings, ...patch } })),

      toggleModel: (id) =>
        set((state) => {
          const has = state.settings.models.includes(id)
          const next = has
            ? state.settings.models.filter((m) => m !== id)
            : [...state.settings.models, id]
          return { settings: { ...state.settings, models: next } }
        }),

      startRun: () => {
        const uuid =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID().slice(0, 12)
            : Math.random().toString(36).slice(2, 14)
        const id = `run_${Date.now().toString(36)}_${uuid}`
        const settings = get().settings
        const results = settings.models.reduce(
          (acc, m) => {
            acc[m] = { ...makeEmptyResult(m), status: 'streaming', startedAt: Date.now() }
            return acc
          },
          {} as Record<ModelId, ModelRunResult>,
        )
        const record: RunRecord = {
          id,
          createdAt: Date.now(),
          settings: { ...settings },
          results,
          tags: [],
          notes: '',
        }
        set((state) => ({
          runs: [record, ...state.runs],
          activeRunId: id,
          sessionRunIds: [id, ...state.sessionRunIds].slice(0, 10),
        }))
        return id
      },

      patchResult: (runId, modelId, patch) =>
        set((state) => ({
          runs: state.runs.map((r) => {
            if (r.id !== runId) return r
            const current = r.results[modelId] ?? makeEmptyResult(modelId)
            return {
              ...r,
              results: {
                ...r.results,
                [modelId]: { ...current, ...patch },
              },
            }
          }),
        })),

      appendResultText: (runId, modelId, chunk) =>
        set((state) => ({
          runs: state.runs.map((r) => {
            if (r.id !== runId) return r
            const current = r.results[modelId] ?? makeEmptyResult(modelId)
            const nextText = current.text + chunk
            const estimated = Math.ceil(nextText.length / 4)
            return {
              ...r,
              results: {
                ...r.results,
                [modelId]: {
                  ...current,
                  text: nextText,
                  completionTokens: estimated,
                  totalTokens: current.promptTokens + estimated,
                },
              },
            }
          }),
        })),

      setEvaluation: (runId, modelId, score) =>
        set((state) => ({
          runs: state.runs.map((r) =>
            r.id !== runId
              ? r
              : {
                  ...r,
                  evaluations: { ...(r.evaluations ?? {}), [modelId]: score },
                },
          ),
        })),

      loadRun: (runId) => {
        const run = get().runs.find((r) => r.id === runId)
        if (!run) return
        set({ settings: { ...run.settings }, activeRunId: run.id })
      },

      selectLibraryItem: (runId) => set({ selectedLibraryId: runId }),

      tagRun: (runId, tags) =>
        set((state) => ({
          runs: state.runs.map((r) => (r.id === runId ? { ...r, tags } : r)),
        })),

      noteRun: (runId, notes) =>
        set((state) => ({
          runs: state.runs.map((r) => (r.id === runId ? { ...r, notes } : r)),
        })),

      deleteRun: (runId) =>
        set((state) => ({
          runs: state.runs.filter((r) => r.id !== runId),
          selectedLibraryId:
            state.selectedLibraryId === runId ? null : state.selectedLibraryId,
        })),
    }),
    {
      name: 'parallax-store',
      version: CURRENT_PERSIST_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        settings: state.settings,
        runs: state.runs,
      }),
      migrate: (persisted) => migratePersistedState(persisted) ?? undefined,
    },
  ),
)
