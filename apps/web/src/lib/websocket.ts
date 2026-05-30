'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000';

export function useWebSocket(userId?: string) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const socket = io(`${WS_URL}/ws`, {
      transports: ['websocket', 'polling'],
      query: { playerId: `admin-${userId}` },
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  return { socket: socketRef, connected };
}

export function usePlayerStatus(socket: React.MutableRefObject<Socket | null>, players: any[]) {
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!socket.current) return;

    const handlePlayerStatus = (data: { playerId: string; status: string; lastSeenAt: string }) => {
      setStatusMap(prev => ({ ...prev, [data.playerId]: data.status }));
    };

    socket.current.on('player:status', handlePlayerStatus);

    return () => {
      socket.current?.off('player:status', handlePlayerStatus);
    };
  }, [socket.current]);

  return statusMap;
}

export function sendCommand(socket: Socket | null, playerId: string, command: string) {
  if (!socket) return;
  socket.emit('command', { playerId, command });
}
