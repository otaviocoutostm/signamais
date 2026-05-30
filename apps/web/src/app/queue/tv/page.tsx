'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';

interface QueueDisplay {
  currentCalls: any[];
  waitingCount: number;
  recentCalls: any[];
}

export default function QueueTvPage() {
  const [display, setDisplay] = useState<QueueDisplay>({ currentCalls: [], waitingCount: 0, recentCalls: [] });
  const [time, setTime] = useState('');
  const [callFlash, setCallFlash] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const wsUrl = typeof window !== 'undefined' ? window.location.origin.replace('http', 'ws') : '';

  useEffect(() => {
    loadDisplay();
    connectWebSocket();
    
    const tick = () => setTime(new Date().toLocaleTimeString('pt-BR'));
    tick();
    const iv = setInterval(tick, 1000);
    return () => { clearInterval(iv); socketRef.current?.disconnect(); };
  }, []);

  const connectWebSocket = () => {
    const socket = io(`${wsUrl}/queue`, {
      query: { type: 'display' },
      transports: ['websocket'],
    });
    socket.on('queue:update', () => loadDisplay());
    socket.on('queue:call', (data) => {
      loadDisplay();
      if (data.ticket) {
        setCallFlash(data.ticket.displayNumber);
        setTimeout(() => setCallFlash(null), 5000);
      }
    });
    socketRef.current = socket;
  };

  const loadDisplay = async () => {
    try {
      const { data } = await axios.get(`/api/queue/display`);
      setDisplay(data);
    } catch {}
  };

  const getLast5Calls = () => {
    return display.recentCalls?.slice(0, 5) || [];
  };

  // Flash overlay
  if (callFlash) {
    setTimeout(() => setCallFlash(null), 4000);
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden flex flex-col"
         style={{ background: 'radial-gradient(ellipse at center, #111111 0%, #000000 100%)' }}>
      
      {/* Call Flash Overlay */}
      {callFlash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-pulse"
             style={{ animation: 'pulse 0.5s ease-in-out 5' }}>
          <div className="text-center">
            <div className="text-2xl text-gray-400 mb-4">🔔 CHAMADA</div>
            <div className="text-[12rem] font-bold tracking-widest leading-none mb-4" style={{ color: '#FF0044' }}>
              {callFlash}
            </div>
            {display.currentCalls.map((c, i) => (
              <div key={i} className="text-3xl text-white mt-2">
                → Guichê {c.desk?.number}
              </div>
            ))}
          </div>
          <style jsx>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}</style>
        </div>
      )}

      {/* Top: Current calls */}
      <div className="flex-1 flex flex-col items-center justify-center px-12">
        {display.currentCalls.length > 0 ? (
          <div className="text-center">
            <p className="text-lg text-gray-500 mb-4 uppercase tracking-widest">Atendimento</p>
            {display.currentCalls.map((call, i) => (
              <div key={i} className="mb-6 last:mb-0">
                <div className="text-8xl font-bold tracking-widest" style={{ color: call.service?.color || '#FF0044' }}>
                  {call.displayNumber}
                </div>
                <div className="text-3xl text-white mt-2">
                  Guichê {call.desk?.number} — {call.desk?.name}
                </div>
                <div className="text-xl text-gray-500 mt-1">
                  {call.service?.name}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center">
            <p className="text-6xl mb-4">🕐</p>
            <p className="text-2xl text-gray-500">Aguardando próximo atendimento</p>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-8 py-6 border-t border-white/5">
        {/* Waiting count */}
        <div className="flex items-center gap-6">
          <div>
            <p className="text-sm text-gray-500 uppercase">Aguardando</p>
            <p className="text-4xl font-bold text-white">{display.waitingCount}</p>
          </div>
        </div>

        {/* Recent calls */}
        <div className="flex items-center gap-6">
          <p className="text-sm text-gray-500 uppercase">Últimas</p>
          <div className="flex gap-4">
            {getLast5Calls().map((call: any, i: number) => (
              <div key={i} className="text-center">
                <p className="text-lg font-bold text-gray-300">{call.ticket?.displayNumber}</p>
                <p className="text-xs text-gray-500">G{call.desk?.number}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Clock */}
        <div className="text-2xl font-mono text-gray-400">{time}</div>
      </div>

      {/* SignaMais branding */}
      <div className="absolute top-4 right-6 text-sm opacity-20">
        <span>Signa</span><span style={{ color: '#FF0044' }}>Mais</span>
      </div>
    </div>
  );
}
