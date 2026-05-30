'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { Phone, PhoneOff, SkipForward, Repeat, ArrowRight, Pause, Play } from 'lucide-react';

interface Desk {
  id: string; name: string; number: number; isPaused: boolean; isActive: boolean;
}

interface Ticket {
  id: string; displayNumber: string; status: string;
  service?: any; desk?: any;
}

function QueueDeskInner() {
  const searchParams = useSearchParams();
  const deskIdParam = searchParams.get('deskId');
  const [deskId, setDeskId] = useState(deskIdParam || '');
  const [desk, setDesk] = useState<Desk | null>(null);
  const [desks, setDesks] = useState<Desk[]>([]);
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [showSelector, setShowSelector] = useState(!deskIdParam);
  const socketRef = useRef<Socket | null>(null);

  const wsUrl = typeof window !== 'undefined' ? window.location.origin.replace('http', 'ws') : '';

  useEffect(() => {
    loadDesks();
    if (deskIdParam) {
      setDeskId(deskIdParam);
      setShowSelector(false);
      connectWebSocket(deskIdParam);
      loadCurrentTicket(deskIdParam);
    }
  }, []);

  useEffect(() => {
    if (deskId && socketRef.current?.connected) {
      loadCurrentTicket(deskId);
    }
  }, [deskId]);

  const loadDesks = async () => {
    try {
      const { data } = await axios.get(`/api/queue/desks`);
      setDesks(data.filter((d: Desk) => d.isActive));
    } catch {}
    setLoading(false);
  };

  const connectWebSocket = (did: string) => {
    if (socketRef.current) socketRef.current.disconnect();
    const socket = io(`${wsUrl}/queue`, {
      query: { type: 'desk', deskId: did },
      transports: ['websocket'],
    });
    socket.on('connect', () => console.log('[WS Desk] Conectado'));
    socket.on('queue:update', () => {
      loadCurrentTicket(did);
      loadQueueStatus();
    });
    socketRef.current = socket;
  };

  const selectDesk = (d: Desk) => {
    setDeskId(d.id);
    setDesk(d);
    setShowSelector(false);
    connectWebSocket(d.id);
    loadCurrentTicket(d.id);
    loadQueueStatus();
  };

  const loadCurrentTicket = async (did: string) => {
    try {
      const { data } = await axios.get(`/api/queue/status`);
      // Find any ticket currently called/in-progress for this desk
      const { data: history } = await axios.get(`/api/queue/history?limit=5`);
      // Check if there's a current ticket by looking at recent calls
      setCurrentTicket(null);
    } catch {}
  };

  const loadQueueStatus = async () => {
    try {
      const { data } = await axios.get(`/api/queue/status`);
      setQueueStatus(data);
    } catch {}
  };

  const callNext = async () => {
    setActivating(true);
    try {
      const { data } = await axios.post(`/api/queue/call/next`, { deskId });
      setCurrentTicket(data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao chamar');
    }
    setActivating(false);
  };

  const finish = async () => {
    if (!currentTicket) return;
    try {
      await axios.post(`/api/queue/${currentTicket.id}/finish`);
      setCurrentTicket(null);
    } catch {}
  };

  const noShow = async () => {
    if (!currentTicket) return;
    try {
      await axios.post(`/api/queue/${currentTicket.id}/no-show`);
      setCurrentTicket(null);
    } catch {}
  };

  const recall = async () => {
    if (!currentTicket) return;
    try {
      await axios.post(`/api/queue/call/recall`, { ticketId: currentTicket.id });
    } catch {}
  };

  const togglePause = async () => {
    try {
      const { data } = await axios.post(`/api/queue/desks/${deskId}/pause`);
      setDesk(data);
    } catch {}
  };

  // Desk Selector Screen
  if (showSelector) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-white text-center mb-8">Selecione seu Guichê</h1>
          <div className="space-y-3">
            {desks.map((d) => (
              <button key={d.id} onClick={() => selectDesk(d)}
                className="w-full p-6 rounded-2xl text-left transition-all hover:scale-[1.02]"
                style={{ background: d.isPaused ? '#1a1a1a' : '#FF004411', border: `2px solid ${d.isPaused ? '#333' : '#FF004444'}` }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">Guichê {d.number}</h2>
                    <p className="text-sm text-gray-400">{d.name}</p>
                  </div>
                  {d.isPaused && <span className="text-yellow-500 text-sm">Pausado</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Main Desk Panel
  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col" style={{ background: 'radial-gradient(ellipse at center, #1a1a1a 0%, #0a0a0a 100%)' }}>
      
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">
            <span style={{ color: '#FFFFFF' }}>Signa</span>
            <span style={{ color: '#FF0044' }}>Mais</span>
          </h1>
          <span className="text-sm text-gray-500">|</span>
          <span className="text-sm text-gray-400">Guichê {desk?.number} — {desk?.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={togglePause}
            className={`px-4 py-2 rounded-lg text-sm ${desk?.isPaused ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'}`}>
            {desk?.isPaused ? <Play size={16} className="inline mr-1" /> : <Pause size={16} className="inline mr-1" />}
            {desk?.isPaused ? 'Retomar' : 'Pausar'}
          </button>
          <button onClick={() => setShowSelector(true)}
            className="text-gray-500 hover:text-white text-sm">Trocar Guichê</button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-lg w-full">
          
          {/* Current ticket display */}
          {currentTicket ? (
            <div className="mb-12">
              <p className="text-sm text-gray-500 mb-4">EM ATENDIMENTO</p>
              <div className="text-8xl font-bold tracking-widest mb-4"
                   style={{ color: currentTicket.service?.color || '#FF0044' }}>
                {currentTicket.displayNumber}
              </div>
              <p className="text-lg text-gray-400">{currentTicket.service?.name}</p>
              
              {/* Action buttons */}
              <div className="flex items-center justify-center gap-4 mt-8">
                <button onClick={recall}
                  className="flex items-center gap-2 px-6 py-4 bg-blue-600 rounded-xl text-white font-medium text-lg hover:bg-blue-700 transition-all">
                  <Repeat size={20} /> Rechamar
                </button>
                <button onClick={noShow}
                  className="flex items-center gap-2 px-6 py-4 bg-gray-700 rounded-xl text-white font-medium text-lg hover:bg-gray-600 transition-all">
                  <SkipForward size={20} /> Não Compareceu
                </button>
                <button onClick={finish}
                  className="flex items-center gap-2 px-8 py-4 bg-green-600 rounded-xl text-white font-medium text-xl hover:bg-green-700 transition-all">
                  <PhoneOff size={20} /> Finalizar
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-12">
              <p className="text-sm text-gray-500 mb-4">AGUARDANDO</p>
              <div className="flex items-center justify-center">
                <button onClick={callNext} disabled={activating}
                  className="flex items-center gap-4 px-12 py-6 bg-[#FF0044] rounded-2xl text-white font-bold text-2xl hover:bg-[#cc0036] transition-all disabled:opacity-50 shadow-lg shadow-[#FF0044]/20">
                  <Phone size={28} />
                  {activating ? 'Chamando...' : 'Chamar Próximo'}
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-4">ou pressione ESPAÇO</p>
            </div>
          )}

          {/* Queue status */}
          {queueStatus && (
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-2xl font-bold text-white">{queueStatus.waiting}</p>
                <p className="text-xs text-gray-500">Aguardando</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-2xl font-bold text-yellow-400">{queueStatus.called}</p>
                <p className="text-xs text-gray-500">Chamadas</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-2xl font-bold text-green-400">{queueStatus.finishedToday}</p>
                <p className="text-xs text-gray-500">Atendidas Hoje</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Keyboard shortcut */}
      <style jsx global>{`
        body { margin: 0; }
      `}</style>
      <script dangerouslySetInnerHTML={{ __html: `
        document.addEventListener('keydown', function(e) {
          if (e.code === 'Space' && !e.repeat) {
            document.querySelector('button:has(svg.lucide-phone)')?.click();
          }
        });
      `}} />
    </div>
  );
}


export default function QueueDeskPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center"><p className="text-gray-500">Carregando...</p></div>}>
      <QueueDeskInner />
    </Suspense>
  );
}
