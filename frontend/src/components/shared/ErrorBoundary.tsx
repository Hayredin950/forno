import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Without this, any uncaught render-time error (bad API response shape,
// a thrown Date, a missing method) unmounts the whole React tree and
// leaves the user staring at a blank/black page with no way back.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled error caught by ErrorBoundary:', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.href = import.meta.env.BASE_URL;
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-forno-bg-primary px-6">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-semibold text-forno-text-primary mb-3">Something went wrong</h2>
            <p className="text-forno-text-secondary mb-6 text-sm">
              An unexpected error occurred while loading this page. You can go back to the homepage and try again.
            </p>
            <button
              onClick={this.handleReload}
              className="px-6 py-3 accent-gradient rounded-button text-white font-medium hover:brightness-110 transition-all"
            >
              Back to Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
