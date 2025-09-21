// frontend/src/main.tsx
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { InternetIdentityProvider } from './hooks/useInternetIdentity';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx'; // note the exact case + extension
import './index.css';

const queryClient = new QueryClient();

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found in index.html');
}

ReactDOM.createRoot(rootEl).render(
  <StrictMode>
    <InternetIdentityProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </InternetIdentityProvider>
  </StrictMode>
);