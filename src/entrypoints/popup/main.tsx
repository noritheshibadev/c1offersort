import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/popup/App';
import { ErrorBoundary } from '@/popup/components/ErrorBoundary';
import '@/popup/index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
