import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { DocumentStatusEvent } from '../types/api';
import { USE_MOCK_DATA } from '../mock';

interface SocketContextType {
  processingDocs: Record<string, DocumentStatusEvent>;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  processingDocs: {},
  connected: false,
});

export function SocketProvider({ children, userId }: { children: React.ReactNode; userId?: string }) {
  const [processingDocs, setProcessingDocs] = useState<Record<string, DocumentStatusEvent>>({});
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<import('socket.io-client').Socket | null>(null);

  useEffect(() => {
    if (USE_MOCK_DATA || !userId) return;

    const connect = async () => {
      const { io } = await import('socket.io-client');
      const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
        auth: { userId },
      });

      socketRef.current = socket;

      socket.on('connect', () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));

      socket.on('document:status', (event: DocumentStatusEvent) => {
        setProcessingDocs((prev) => ({ ...prev, [event.docId]: event }));
      });
    };

    connect();

    return () => {
      socketRef.current?.disconnect();
    };
  }, [userId]);

  return (
    <SocketContext.Provider value={{ processingDocs, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
