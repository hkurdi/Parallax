import { runCompletion } from '@/lib/keywordsai'
import type { EvaluationScore } from '@/types'

const EVALUATOR_MODEL = 'claude-haiku-4-5-20251001'

const EVALUATOR_SYSTEM = `You are a strict, calibrated LLM response evaluator.
Score each response on a 1–10 integer scale (10 = perfect).
Be tough; reserve 9–10 for genuinely outstanding work.
Return ONLY a single JSON object with keys: relevance, coherence, conciseness, instructionFollowing, overall.
No prose, no markdown, no code fences.`

const buildUserPrompt = (originalPrompt: string, response: string) =>
  `ORIGINAL PROMPT:
"""
${originalPrompt}
"""

MODEL RESPONSE:
"""
${response}
"""

Score on:
- relevance (does it address the prompt?)
- coherence (is it logically structured?)
- conciseness (no padding, no fluff?)
- instructionFollowing (did it obey every constraint?)
- overall (your holistic judgement)

JSON only.`

const EVALUATOR_INPUT_COST_PER_1K = 0.001
const EVALUATOR_OUTPUT_COST_PER_1K = 0.005

function clamp(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return 0
  return Math.min(10, Math.max(0, Math.round(v)))
}

function safeJsonParse(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      return JSON.parse(match[0])
    } catch {
      return null
    }
  }
}

export async function evaluateResponse(
  originalPrompt: string,
  response: string,
): Promise<EvaluationScore> {
  const result = await runCompletion({
    model: EVALUATOR_MODEL as never,
    messages: [
      { role: 'system', content: EVALUATOR_SYSTEM },
      { role: 'user', content: buildUserPrompt(originalPrompt, response) },
    ],
    temperature: 0,
    maxTokens: 200,
  })

  const parsed = safeJsonParse(result.text) ?? {}
  const cost =
    (result.promptTokens / 1000) * EVALUATOR_INPUT_COST_PER_1K +
    (result.completionTokens / 1000) * EVALUATOR_OUTPUT_COST_PER_1K

  return {
    relevance: clamp(parsed.relevance),
    coherence: clamp(parsed.coherence),
    conciseness: clamp(parsed.conciseness),
    instructionFollowing: clamp(
      parsed.instructionFollowing ?? parsed.instruction_following,
    ),
    overall: clamp(parsed.overall),
    evaluatorCostUsd: cost,
    evaluatorModel: EVALUATOR_MODEL,
  }
}
