# Parallax

> See your prompts from every angle.

A prompt intelligence platform for developers — a full debugging and experimentation environment for LLM prompts, powered by [Keywords AI](https://docs.keywordsai.co) for model routing, observability, and cost tracking.

Built as a scientific instrument, not a marketing page. And to get this internship lol, hi guys.

---

## Stack

- **Vite 7** + **React 19** + **TypeScript 5**
- **Tailwind CSS 4** (via `@tailwindcss/vite`, theme tokens in `src/index.css`)
- **Framer Motion** for surgical view transitions and card entries
- **Zustand** (with `persist`) for prompt history and saved experiments
- **React Router v7** for the four-view SPA
- **Recharts** for analytics
- **react-markdown** for model output rendering
- **lucide-react** for icons
- **date-fns** for timestamps

---

## Models

Routed through Keywords AI. Costs are estimated client-side from the spec table in `src/lib/models.ts` whenever the API doesn't return a `cost` field.

| Model | Provider | Input / Output (per 1k tok) |
| --- | --- | --- |
| `gpt-5` | OpenAI | $0.00125 / $0.010 |
| `groq/llama-3.3-70b-versatile` | Groq | $0.00059 / $0.00079 |
| `claude-haiku-4-5-20251001` | Anthropic | $0.001 / $0.005 |
| `gemini/gemini-2.5-flash-lite` | Google | $0.000075 / $0.0003 |

The **Insights evaluator** uses `claude-haiku-4-5-20251001` (configurable in `src/lib/evaluator.ts`). Since Haiku 4.5 is also in the lineup, evaluator self-scoring is possible — swap the evaluator if you want strict independence.

---

## The four views

1. **Lab** — multi-model prompt workbench. Edit your prompt with line-numbered monospace, pick any subset of the four supported models, and hit Run. Cards stream independently with live token estimates, latency, and cost. Session history (last 10 runs) lives in the bottom rail and clicking a pill restores both the prompt settings *and* the response grid.
2. **Observatory** — Keywords AI analytics. Cost-over-time per model, donut for usage share, p50/p95/p99 latency bars, paginated request log. Falls back gracefully to local session data when no API key is set. Refresh button refetches; switching range resets pagination.
3. **Library** — persistent experiment storage in `localStorage` (via Zustand `persist`). Search, filter by model, tag, annotate, re-run, or export to JSON.
4. **Insights** — auto-evaluation. Click **Evaluate** to score each model's response on relevance, coherence, conciseness, instruction-following, and overall using Claude Haiku 4.5. Radar charts per model, head-to-head table, "Winner" badge, and transparent evaluator cost.

---

## Architecture

```text
src/
  views/
    Lab.tsx              # Multi-model streaming workbench
    Observatory.tsx      # Analytics dashboard (logs + charts)
    Library.tsx          # Saved experiments
    Insights.tsx         # Auto-evaluation
  components/
    Sidebar.tsx          # Nav with active-route morph
    PromptEditor.tsx     # Line-numbered editor + controls
    ModelStream.tsx      # Streaming response card with scanline
    MetricBadge.tsx      # Latency / tokens / cost
    ScoreCard.tsx        # Radar chart per model
  store/
    useParallaxStore.ts  # Zustand store, persisted to localStorage
  lib/
    keywordsai.ts        # SSE streaming + logs API client
    evaluator.ts         # Claude Haiku 4.5 scoring with JSON parsing
    models.ts            # Model registry (id, label, accent, cost)
  types/
    index.ts
  index.css              # Tailwind 4 @theme tokens + utilities
  App.tsx                # Top bar + sidebar + animated <Routes/>
  main.tsx               # React 19 root + BrowserRouter
```
