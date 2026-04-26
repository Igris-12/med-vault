import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { DocumentStatusEvent } from '../types/api';
import { USE_MOCK_DATA } from '../mock';

interface Notification {
  id: string;
  type: 'document' | 'reminder' | 'alert';
  message: string;
  timestamp: Date;
  read: boolean;
}

interface SocketContextType {
  processingDocs: Record<string, DocumentStatusEvent>;
  connected: boolean;
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => void;
}

const SocketContext = createContext<SocketContextType>({
  processingDocs: {},
  connected: false,
  notifications: [],
  unreadCount: 0,
  markAllRead: () => {},
});

export function SocketProvider({ children, userId }: { children: React.ReactNode; userId?: string }) {
  const [processingDocs, setProcessingDocs] = useState<Record<string, DocumentStatusEvent>>({});
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const socketRef = useRef<import('socket.io-client').Socket | null>(null);

  const unreadCount = notifications.filter(n => !n.read).length;
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

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
        if (event.status === 'done') {
          setNotifications(prev => [{
            id: `doc-${event.docId}-${Date.now()}`,
            type: 'document',
            message: `Document processed successfully`,
            timestamp: new Date(),
            read: false,
          }, ...prev].slice(0, 50));
        }
      });

      socket.on('reminder:sent', (data: { id: string; message: string }) => {
        setNotifications(prev => [{
          id: `rem-${data.id}-${Date.now()}`,
          type: 'reminder',
          message: `Reminder sent: ${data.message.slice(0, 60)}`,
          timestamp: new Date(),
          read: false,
        }, ...prev].slice(0, 50));
      });

      socket.on('reminder:failed', (data: { id: string }) => {
        setNotifications(prev => [{
          id: `rem-fail-${data.id}-${Date.now()}`,
          type: 'reminder',
          message: `Reminder delivery failed`,
          timestamp: new Date(),
          read: false,
        }, ...prev].slice(0, 50));
      });
    };

    connect();

    return () => {
      socketRef.current?.disconnect();
    };
  }, [userId]);

  return (
    <SocketContext.Provider value={{ processingDocs, connected, notifications, unreadCount, markAllRead }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
