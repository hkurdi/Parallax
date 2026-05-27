import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FlaskConical,
  Telescope,
  Library as LibraryIcon,
  Sparkles,
  X,
} from 'lucide-react'

const NAV = [
  { to: '/lab', label: 'Lab', code: '01', Icon: FlaskConical },
  { to: '/observatory', label: 'Observatory', code: '02', Icon: Telescope },
  { to: '/library', label: 'Library', code: '03', Icon: LibraryIcon },
  { to: '/insights', label: 'Insights', code: '04', Icon: Sparkles },
] as const

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const location = useLocation()

  useEffect(() => {
    if (!mobileOpen) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [mobileOpen])

  useEffect(() => {
    if (!mobileOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mobileOpen, onClose])

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-[var(--color-ink-0)]/70 backdrop-blur-sm lg:hidden"
        />
      )}
      <aside
        className={`fixed lg:relative z-40 top-0 bottom-0 left-0 flex h-full w-[260px] lg:w-[220px] shrink-0 flex-col border-r border-[var(--color-hairline)] bg-[var(--color-ink-100)]/95 lg:bg-[var(--color-ink-100)]/40 backdrop-blur-xl transition-transform duration-200 ease-out ${
          mobileOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        }`}
        aria-label="Primary navigation"
      >
        <div className="px-6 pt-7 pb-5 border-b border-[var(--color-hairline)] flex items-start justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-display text-2xl text-[var(--color-bone-100)]">
                Parallax
              </span>
              <span aria-hidden="true" className="text-mono text-[10px] text-[var(--color-amber)]">
                ◊
              </span>
            </div>
            <p className="text-eyebrow mt-1.5">prompt intelligence</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="lg:hidden -mr-1 -mt-1 p-1.5 text-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p className="text-eyebrow px-3 pb-3">Views</p>
          <ul className="space-y-0.5">
            {NAV.map(({ to, label, code, Icon }) => {
              const active = location.pathname.startsWith(to)
              return (
                <li key={to}>
                  <NavLink
                    to={to}
                    onClick={onClose}
                    aria-current={active ? 'page' : undefined}
                    className="relative flex items-center gap-3 rounded-md px-3 py-3 lg:py-2.5 text-sm transition-colors duration-200 hover:bg-[var(--color-ink-200)]/60"
                  >
                    {active && (
                      <motion.span
                        layoutId="sidebar-active"
                        aria-hidden="true"
                        className="absolute inset-0 -z-10 rounded-md bg-[var(--color-ink-300)]/40 border border-[var(--color-hairline-strong)]"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className={`text-mono text-[10px] tabular-nums ${
                        active
                          ? 'text-[var(--color-amber)]'
                          : 'text-[var(--color-bone-500)]'
                      }`}
                    >
                      {code}
                    </span>
                    <Icon
                      size={14}
                      strokeWidth={1.6}
                      aria-hidden="true"
                      className={
                        active
                          ? 'text-[var(--color-bone-100)]'
                          : 'text-[var(--color-bone-400)]'
                      }
                    />
                    <span
                      className={
                        active
                          ? 'text-[var(--color-bone-100)] tracking-tight'
                          : 'text-[var(--color-bone-300)] tracking-tight'
                      }
                    >
                      {label}
                    </span>
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="border-t border-[var(--color-hairline)] px-5 py-4 text-mono text-[10px] text-[var(--color-bone-500)]">
          <div className="flex items-center justify-between">
            <span>v0.1.0</span>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-[var(--color-signal-green)] shadow-[0_0_6px_var(--color-signal-green)]"
              />
              keywords ai
            </span>
          </div>
          <p className="mt-2 leading-relaxed text-[var(--color-bone-500)]/80">
            See your prompts from every angle.
          </p>
          <p className="mt-3 pt-3 border-t border-[var(--color-hairline)]/60 leading-relaxed text-[10px] text-[var(--color-bone-500)]/70">
            <span className="block text-[var(--color-bone-400)]/80">
              developed by <span className="text-[var(--color-amber)]/80">hlk</span>
            </span>
            <span className="block text-[var(--color-bone-500)]/60">
              hamza luay kurdi · 2026
            </span>
          </p>
        </div>
      </aside>
    </>
  )
}
