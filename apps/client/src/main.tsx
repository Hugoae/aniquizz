import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { captureClientError } from '@/lib/errorReporter';
import './fonts.css';
import './index.css';

window.addEventListener('error', (event) => {
  captureClientError(event.error ?? event.message, { source: 'window_error' });
});

window.addEventListener('unhandledrejection', (event) => {
  captureClientError(event.reason, { source: 'unhandledrejection' });
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
);
