import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('Parallax error boundary:', error, info)
    }
  }

  private handleReset = (): void => {
    this.setState({ error: null })
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex h-full items-center justify-center px-8 py-12">
        <div className="glass max-w-lg w-full">
          <div className="border-b border-[var(--color-hairline)] px-5 py-3">
            <p className="text-eyebrow text-[var(--color-signal-red)]">
              Runtime error
            </p>
            <h2 className="text-display text-2xl text-[var(--color-bone-100)] mt-1">
              Something broke
            </h2>
          </div>
          <pre className="text-mono text-[11.5px] text-[var(--color-bone-300)] px-5 py-4 leading-relaxed whitespace-pre-wrap break-words">
            {this.state.error.message}
          </pre>
          <div className="border-t border-[var(--color-hairline)] px-5 py-3 flex justify-end">
            <button
              type="button"
              onClick={this.handleReset}
              className="text-mono text-[10px] uppercase tracking-widest border border-[var(--color-hairline-strong)] px-3 py-1.5 text-[var(--color-bone-200)] hover:bg-[var(--color-ink-200)]/40"
            >
              retry
            </button>
          </div>
        </div>
      </div>
    )
  }
}
