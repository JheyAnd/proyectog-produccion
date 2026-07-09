import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CashFlowPage from './pages/CashFlowPage';

const queryClient = new QueryClient();

export default function App() { 
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div style={{ height: '100vh', width: '100vw' }}>
          <CashFlowPage />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  ); 
}
