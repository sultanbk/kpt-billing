// ============================================================================
// KPT Billing - React Error Boundary
// Catches rendering errors and prevents white-screen crashes
// ============================================================================
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to console in dev; in production this could be sent to a logging service
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo)
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  private handleDismiss = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex h-screen w-full items-center justify-center bg-background p-8">
          <div className="max-w-lg space-y-4 text-center">
            <div className="text-6xl">⚠️</div>
            <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
            <p className="text-muted-foreground">
              An unexpected error occurred. You can try reloading the application or dismissing this
              error to continue.
            </p>
            {this.state.error && (
              <details className="mt-4 rounded-md border bg-muted/50 p-3 text-left text-sm">
                <summary className="cursor-pointer font-medium text-muted-foreground">
                  Error details
                </summary>
                <pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs text-destructive">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <div className="flex justify-center gap-3 pt-4">
              <button
                onClick={this.handleDismiss}
                className="rounded-md border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
