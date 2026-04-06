import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6">
          <div className="bg-bg-surface border border-border rounded-lg p-8 max-w-md text-center">
            <div className="text-3xl mb-3">⚠️</div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">Something went wrong</h2>
            <p className="text-sm text-text-secondary mb-4">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="bg-accent text-bg-primary px-5 py-2 rounded text-sm font-medium hover:opacity-90"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-bg-card text-text-secondary px-5 py-2 rounded text-sm hover:text-text-primary"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
