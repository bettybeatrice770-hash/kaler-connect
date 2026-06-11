import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// 1. Error Boundary to catch UI rendering crashes gracefully during runtime
class ConfigurationErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("React Component Lifecycle Crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 font-sans">
          <div className="max-w-md w-full space-y-6 text-center bg-white p-8 rounded-xl shadow-lg border border-gray-100">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-2">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Application Render Error</h1>
            <p className="text-sm text-gray-600 leading-relaxed">
              An unexpected crash occurred within the interface presentation layout layer.
            </p>
            <div className="bg-red-50 text-left p-3.5 rounded-lg border border-red-100">
              <p className="text-xs font-mono text-red-700 break-words font-semibold">
                {this.state.errorMessage}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 2. Pure static fallback UI for early module crashes - sanitized against XSS
function renderStaticFailureScreen(message: string) {
  document.body.innerHTML = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background-color: #f9fafb; padding: 1rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 28rem; width: 100%; background: #ffffff; padding: 2rem; border-radius: 0.75rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid #f3f4f6; text-align: center;">
        <div style="display: inline-flex; align-items: center; justify-content: center; width: 4rem; height: 4rem; border-radius: 50%; background-color: #fee2e2; color: #dc2626; margin-bottom: 0.5rem;">
          <svg style="width: 2rem; height: 2rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        </div>
        <h1 style="font-size: 1.5rem; font-weight: 700; color: #111827; margin: 0 0 0.5rem 0;">System Connection Offline</h1>
        <p style="font-size: 0.875rem; color: #4b5563; line-height: 1.5; margin-bottom: 1.5rem;">
          Kaler Connect initialization failed. This error typically occurs outside of React's lifecycle due to unpopulated configuration parameters.
        </p>
        <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 0.5rem; padding: 1rem; text-align: left; margin-bottom: 1rem;">
          <p id="error-message-text" style="font-size: 0.75rem; font-family: monospace; color: #b91c1c; margin: 0; word-break: break-all; font-weight: 600;"></p>
        </div>
        <p style="font-size: 0.75rem; color: #9ca3af; margin: 0;">Please check your Netlify environment settings or Lovable secret panel variables.</p>
      </div>
    </div>
  `;

  const errorTextContainer = document.getElementById('error-message-text');
  // CRITICAL SECURITY GUARD: Do NOT move message into the innerHTML template above. 
  // Using textContent explicitly sanitizes variable input and prevents potential XSS script execution.
  if (errorTextContainer) {
    errorTextContainer.textContent = message;
  }
}

// 3. Deferred execution to capture module load evaluation failures cleanly
async function bootstrapApplication() {
  try {
    // Dynamically loading App and safeClient inside the execution block ensures that any
    // module-level load exceptions are caught by the local try/catch shell.
    const [{ default: App }] = await Promise.all([
      import('./App'),
      // safeClient import is intentional: triggers module-level env var validation
      // before App mounts. The exported client is used downstream via @/integrations/supabase/safeClient.
      import('./integrations/supabase/safeClient')
    ]);

    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error("Missing Root Mount Point: The HTML document container element '#root' was not found in index.html.");
    }

    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <ConfigurationErrorBoundary>
          <App />
        </ConfigurationErrorBoundary>
      </React.StrictMode>
    );
  } catch (err: any) {
    console.error("Fatal System Bootstrap Halting:", err);
    renderStaticFailureScreen(err?.message || String(err));
  }
}

bootstrapApplication();
