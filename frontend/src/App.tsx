import React from 'react';
import { ToastProvider } from './components/Toast';
import { AppShell } from './components/AppShell';

export function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
}

export default App;
