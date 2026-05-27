import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu } from 'lucide-react'
import { Sidebar } from '@/components/Sidebar'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ViewFallback } from '@/components/ViewFallback'
import { Lab } from '@/views/Lab'
import { hasApiKey } from '@/lib/keywordsai'

const Observatory = lazy(() =>
  import('@/views/Observatory').then((m) => ({ default: m.Observatory })),
)
const Library = lazy(() =>
  import('@/views/Library').then((m) => ({ default: m.Library })),
)
const Insights = lazy(() =>
  import('@/views/Insights').then((m) => ({ default: m.Insights })),
)

const transition = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
}

export function App() {
  const location = useLocation()
  const apiKey = hasApiKey()
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <TopBar
        apiKey={apiKey}
        navOpen={navOpen}
        onToggleNav={() => setNavOpen((v) => !v)}
      />
      <div className="flex min-h-0 flex-1 relative">
        <Sidebar mobileOpen={navOpen} onClose={() => setNavOpen(false)} />
        <main className="relative min-w-0 flex-1 overflow-hidden">
          <ErrorBoundary>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                {...transition}
                className="absolute inset-0 flex"
              >
                <Suspense fallback={<ViewFallback />}>
                  <Routes location={location}>
                    <Route path="/" element={<Navigate to="/lab" replace />} />
                    <Route path="/lab" element={<Lab />} />
                    <Route path="/observatory" element={<Observatory />} />
                    <Route path="/library" element={<Library />} />
                    <Route path="/insights" element={<Insights />} />
                    <Route path="*" element={<Navigate to="/lab" replace />} />
                  </Routes>
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

interface TopBarProps {
  apiKey: boolean
  navOpen: boolean
  onToggleNav: () => void
}

function TopBar({ apiKey, navOpen, onToggleNav }: TopBarProps) {
  return (
    <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-[var(--color-hairline)] bg-[var(--color-ink-0)]/80 backdrop-blur-md px-3 sm:px-5 text-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-bone-500)]">
      <div className="flex items-center gap-3 sm:gap-5 min-w-0">
        <button
          type="button"
          onClick={onToggleNav}
          aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={navOpen}
          className="lg:hidden flex h-7 w-7 items-center justify-center border border-[var(--color-hairline)] text-[var(--color-bone-300)] hover:border-[var(--color-hairline-strong)] hover:text-[var(--color-bone-100)]"
        >
          <Menu size={13} aria-hidden="true" />
        </button>
        <span className="text-[var(--color-bone-300)]">parallax</span>
        <span aria-hidden="true" className="hidden sm:inline">·</span>
        <span className="hidden sm:inline truncate">respan / keywords-ai</span>
      </div>
      <div className="flex items-center gap-3 sm:gap-5 shrink-0">
        <span
          className="flex items-center gap-2"
          role="status"
          aria-label={apiKey ? 'API connected' : 'No API key'}
        >
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${
              apiKey
                ? 'bg-[var(--color-signal-green)]'
                : 'bg-[var(--color-signal-red)]'
            }`}
            style={{
              boxShadow: apiKey
                ? '0 0 6px var(--color-signal-green)'
                : '0 0 6px var(--color-signal-red)',
            }}
          />
          <span className="hidden xs:inline sm:inline">
            {apiKey ? 'api connected' : 'no api key'}
          </span>
        </span>
        <span className="hidden sm:inline text-[var(--color-bone-500)]">
          {new Date().getFullYear()}
        </span>
      </div>
    </div>
  )
}
