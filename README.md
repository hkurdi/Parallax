# Parallax

> See your prompts from every angle.

A prompt intelligence platform for developers — a full debugging and experimentation environment for LLM prompts, powered by [Keywords AI](https://docs.keywordsai.co) for model routing, observability, and cost tracking.

Built as a scientific instrument, not a marketing page. Editorial typography (DM Serif Display), monospace data (JetBrains Mono), and a single accent — electric amber — on near-black.

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

## Setup

```bash
# 1. Install
npm install

# 2. Configure the Keywords AI key
cp .env.example .env
# Edit .env and add your VITE_KEYWORDS_AI_API_KEY

# 3. Run the dev server
npm run dev
# → http://localhost:5173
```

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_KEYWORDS_AI_API_KEY` | yes (for live runs) | Bearer token for `https://api.keywordsai.co/api/*`. The app boots without it but disables Lab runs and Observatory log fetches. |

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check (`tsc -b`) and produce a production build in `dist/` |
| `npm run typecheck` | Type-check only |
| `npm run preview` | Preview the production build locally |

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

---

## Deployment (Netlify)

A `netlify.toml` ships at the repo root. Connect the repo, set `VITE_KEYWORDS_AI_API_KEY` as a build env var in Netlify's site settings (Site → Build & deploy → Environment), and push — the publish dir is `dist/` and the SPA redirect rule sends all unknown paths to `index.html`.

```bash
# Local production preview
npm run build && npm run preview
```

---

## Design notes

Aesthetic direction: **electric amber `#f59e0b` on ink `#0a0a0b`**. Three typefaces — DM Serif Display for section titles, Geist for UI chrome, JetBrains Mono for every number, code block, and metric. Borders are hairlines at `#ffffff0a–14`. Cards use a low-opacity glass with `backdrop-filter: blur(14px) saturate(120%)` and a sharp 1px border. Streaming responses get a subtle `scanline` overlay and an amber `cursor-bar`. View transitions are a 200ms fade-slide. The sidebar's active item uses a Framer `layoutId` morph.

No purple. No generic rounded-3xl. No Inter.
