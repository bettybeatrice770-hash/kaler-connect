import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 1. ErrorBoundary class
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <ErrorScreen message={this.state.error.message} />;
    }
    return this.props.children;
  }
}

// 2. ErrorScreen component
function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-100 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
        <p className="text-sm text-gray-500">The app crashed unexpectedly. Try refreshing.</p>
        <pre className="text-left text-xs font-mono text-red-700 bg-red-50 p-3 rounded-lg border border-red-100 break-words whitespace-pre-wrap">
          {message}
        </pre>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
        >
          Reload App
        </button>
      </div>
    </div>
  );
}

// Helper: Centralized stale dynamic chunk-loading error handler
function handleChunkError(msg: string) {
  if (!msg.includes('Failed to fetch dynamically imported module')) return;
  console.warn('[main] Stale chunk detected. Reloading...');
  if (!sessionStorage.getItem('chunk-retry-loop')) {
    sessionStorage.setItem('chunk-retry-loop', 'true');
    window.location.reload();
  }
}

// 3. window 'error' listener
window.addEventListener('error', (event) => {
  handleChunkError(event.message ?? '');
});

// 4. window 'unhandledrejection' listener
window.addEventListener('unhandledrejection', (event) => {
  handleChunkError(event.reason?.message ?? String(event.reason ?? ''));
});

const root = document.getElementById('root');
if (!root) throw new Error('[main] #root element not found in index.html');

// 5. ReactDOM.createRoot(...).render(...)
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// 6. Clear loop protection state immediately following a clean synchronous mount pass
sessionStorage.removeItem('chunk-retry-loop');
