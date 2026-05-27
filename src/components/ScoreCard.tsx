import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts'
import type { EvaluationScore } from '@/types'
import { MODEL_BY_ID } from '@/lib/models'

interface ScoreCardProps {
  modelId: string
  score: EvaluationScore
  isWinner: boolean
}

export function ScoreCard({ modelId, score, isWinner }: ScoreCardProps) {
  const spec = MODEL_BY_ID[modelId]
  const data = [
    { axis: 'Relevance', value: score.relevance },
    { axis: 'Coherence', value: score.coherence },
    { axis: 'Conciseness', value: score.conciseness },
    { axis: 'Instruction', value: score.instructionFollowing },
    { axis: 'Overall', value: score.overall },
  ]

  return (
    <div
      className={`glass relative flex flex-col overflow-hidden ${
        isWinner ? 'amber-glow-soft' : ''
      }`}
    >
      {isWinner && (
        <div className="absolute right-3 top-3 text-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-amber)]">
          ◊ winner
        </div>
      )}
      <header className="border-b border-[var(--color-hairline)] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: spec?.accent, boxShadow: `0 0 6px ${spec?.accent}` }}
          />
          <div>
            <h3 className="text-[13px] tracking-tight text-[var(--color-bone-100)]">
              {spec?.label}
            </h3>
            <p className="text-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-bone-500)]">
              evaluated by {score.evaluatorModel}
            </p>
          </div>
        </div>
      </header>

      <div className="h-[220px] px-2 pt-3">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid
              stroke="rgba(255,255,255,0.07)"
              strokeDasharray="2 2"
            />
            <PolarAngleAxis
              dataKey="axis"
              tick={{
                fill: '#8a8a85',
                fontSize: 9,
                fontFamily: 'JetBrains Mono',
                letterSpacing: '0.08em',
              }}
            />
            <PolarRadiusAxis
              domain={[0, 10]}
              tick={false}
              axisLine={false}
            />
            <Radar
              dataKey="value"
              stroke="#f59e0b"
              fill="#f59e0b"
              fillOpacity={0.18}
              strokeWidth={1.5}
              dot={{ r: 2.5, fill: '#f59e0b', stroke: 'none' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="border-t border-[var(--color-hairline)] grid grid-cols-5">
        {data.map((d) => (
          <div
            key={d.axis}
            className="border-r border-[var(--color-hairline)] last:border-r-0 px-2 py-2.5 text-center"
          >
            <div className="text-mono text-[9px] uppercase tracking-[0.15em] text-[var(--color-bone-500)]">
              {d.axis.slice(0, 4)}
            </div>
            <div
              className={`text-mono text-[16px] tabular-nums mt-0.5 ${
                d.axis === 'Overall'
                  ? 'text-[var(--color-amber)]'
                  : 'text-[var(--color-bone-100)]'
              }`}
            >
              {d.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
