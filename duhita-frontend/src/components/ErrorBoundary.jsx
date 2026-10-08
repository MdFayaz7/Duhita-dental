import { Component } from 'react';
import { FiAlertTriangle, FiHome, FiRotateCw } from 'react-icons/fi';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Duhita Dental] UI Error Boundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center p-6 bg-ivory">
          <div className="max-w-md w-full bg-white rounded-2xl border border-line p-8 text-center shadow-lg">
            <span className="w-14 h-14 mx-auto rounded-2xl bg-[#fff4e5] text-[#b54708] grid place-items-center mb-5">
              <FiAlertTriangle className="w-7 h-7" />
            </span>
            <h2 className="font-display text-[26px] text-ink leading-tight">Something went wrong</h2>
            <p className="mt-2.5 text-[14.5px] text-body leading-relaxed">
              We encountered an unexpected issue while rendering this section. Your data is safe.
            </p>
            <div className="mt-7 flex flex-wrap gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="btn btn-solid !py-2.5 inline-flex items-center gap-2"
              >
                <FiRotateCw className="w-4 h-4" /> Refresh Page
              </button>
              <button
                onClick={this.handleGoHome}
                className="btn btn-outline !py-2.5 inline-flex items-center gap-2"
              >
                <FiHome className="w-4 h-4" /> Return Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
