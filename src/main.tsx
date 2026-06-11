import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 1. Error Boundary to catch interface rendering crashes cleanly during runtime
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary Summary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <ErrorScreen message={(this.state.error as Error).message} />;
    }
    return this.props.children;
  }
}

// 2. Uniform error fallback layout screen
function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 font-sans">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-100 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
        <p className="text-sm text-gray-500">The application encountered an unexpected initialization error.</p>
        <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-left">
          <p className="text-xs font-mono text-red-700 break-words font-semibold whitespace-pre-wrap">
            {message}
          </p>
        </div>
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

// 3. Clear, synchronous execution boundary to safely handle DOM mount states
try {
  const root = document.getElementById('root');
  if (!root) {
    throw new Error('[main] The primary DOM attachment element "#root" was not found in index.html.');
  }

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (err: any) {
  console.error('[Fatal Bootstrap Halting]', err);
  
  // Safe static fallback string projection to prevent blank screens if rendering container is missing
  document.body.innerHTML = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background-color: #f9fafb; padding: 1rem; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
      <div style="max-width: 28rem; width: 100%; background: #ffffff; padding: 2rem; border-radius: 0.75rem; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border: 1px solid #f3f4f6; text-align: center;">
        <h1 style="font-size: 1.5rem; font-weight: 700; color: #111827; margin: 0 0 0.5rem 0;">Initialization Failure</h1>
        <p style="font-size: 0.875rem; color: #4b5563; margin-bottom: 1rem;">The application layout layer could not attach to the document frame.</p>
        <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 0.5rem; padding: 1rem; text-align: left;">
          <p id="static-error-desc" style="font-size: 0.75rem; font-family: monospace; color: #b91c1c; margin: 0; word-break: break-all; font-weight: 600;"></p>
        </div>
      </div>
    </div>
  `;
  const errorContainer = document.getElementById('static-error-desc');
  if (errorContainer) {
    errorContainer.textContent = err?.message || String(err);
  }
}
