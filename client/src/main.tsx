import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ModeProvider } from './context/ModeContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeStateContext';
import App from './App';
import './styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ModeProvider>
          <SocketProvider userId="dev-user-001">
            <App />
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: 'var(--dd-card)',
                  color: 'var(--dd-text)',
                  border: '1px solid var(--dd-border)',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: '14px',
                  borderRadius: '12px',
                },
                success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
                error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
              }}
            />
          </SocketProvider>
        </ModeProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
