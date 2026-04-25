import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ModeProvider } from './context/ModeContext';
import { SocketProvider } from './context/SocketContext';
import App from './App';
import './styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ModeProvider>
        <SocketProvider userId="dev-user-001">
          <App />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#161D2F',
                color: '#F0F4FF',
                border: '1px solid rgba(255,255,255,0.12)',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#00E5C3', secondary: '#0A0D14' } },
              error: { iconTheme: { primary: '#FF4A6E', secondary: '#0A0D14' } },
            }}
          />
        </SocketProvider>
      </ModeProvider>
    </BrowserRouter>
  </StrictMode>
);
