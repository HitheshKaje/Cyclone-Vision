import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 rounded-2xl bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 shadow-lg text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center">
            <AlertTriangle size={28} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {this.props.title || 'Something went wrong rendering this view'}
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {this.state.error?.message || 'An unexpected rendering error occurred. Please refresh or navigate back.'}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>Retry View</span>
            </button>
            {this.props.fallbackAction && (
              <button
                onClick={this.props.fallbackAction}
                className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-900 font-semibold text-xs flex items-center gap-2 hover:bg-emerald-400 transition-colors cursor-pointer"
              >
                <span>Back to Overview</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
