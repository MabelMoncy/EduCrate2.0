import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('EduCrate UI error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-white flex items-center justify-center p-6">
          <div className="max-w-md rounded-2xl border border-white/10 bg-surface p-6 text-center shadow-2xl">
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-sm text-textMuted mb-5">
              The page hit an unexpected error. Refreshing usually gets things back in place.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primaryHover transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
