'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Monitor, Copy, Check, LogOut, Plus, Trash2, Camera, RefreshCw, Power } from 'lucide-react';
import { useWebSocket, sendCommand } from '../../lib/websocket';

interface Player {
  id: string;
  name: string;
  pairingCode: string | null;
  status: string;
  lastSeenAt: string | null;
  version: string | null;
  createdAt: string;
}

export default function PlayersPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCode, setShowCode] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

  const getToken = () => localStorage.getItem('token');
  const { socket, connected } = useWebSocket(user?.id);

  useEffect(() => {
    const token = getToken();
    const userData = localStorage.getItem('user');
    if (!token) { router.push('/login'); return; }
    if (userData) setUser(JSON.parse(userData));
    loadPlayers();
  }, []);

  // Real-time status updates via WebSocket
  useEffect(() => {
    if (!socket.current) return;
    const handler = (data: { playerId: string; status: string }) => {
      setPlayers(prev => prev.map(p => p.id === data.playerId ? { ...p, status: data.status } : p));
    };
    socket.current.on('player:status', handler);
    return () => { socket.current?.off('player:status', handler); };
  }, [socket.current]);

  const loadPlayers = async () => {
    try {
      const res = await axios.get(`/api/players`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setPlayers(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const createPlayer = async () => {
    try {
      const res = await axios.post(`/api/players`, {}, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setPlayers(prev => [res.data, ...prev]);
      setShowCode(res.data.pairingCode);
    } catch (err) { console.error(err); }
  };

  const removePlayer = async (id: string) => {
    try {
      await axios.delete(`/api/players/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setPlayers(prev => prev.filter(p => p.id !== id));
    } catch (err) { console.error(err); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCommand = (playerId: string, command: string) => {
    sendCommand(socket.current, playerId, command);
  };

  const handleScreenshot = async (playerId: string) => {
    handleCommand(playerId, 'screenshot');
    // Poll for screenshot
    alert(`📸 Comando de screenshot enviado para o player`);
  };

  const handleLogout = () => {
    localStorage.removeItem('token'); localStorage.removeItem('user');
    router.push('/login');
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'online': return '#00E85C';
      case 'offline': return '#444';
      case 'error': return '#FF0044';
      default: return '#444';
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: 'white' }}>
      <header style={{ background: '#1a1a1a', borderBottom: '1px solid #2a2a2a', padding: '0.75rem 2rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href="/dashboard" style={{ color: '#888', fontSize: '0.85rem' }}>← Dashboard</a>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              Signa<span style={{ color: '#FF0044' }}>Mais</span>
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: connected ? '#00E85C' : '#555' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? '#00E85C' : '#555' }} />
              {connected ? 'Tempo real' : 'Offline'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.85rem', color: '#666' }}>{user?.name}</span>
            <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer' }}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Players</h2>
          <button onClick={createPlayer} style={{
            padding: '0.5rem 1.2rem', borderRadius: 8, border: 'none',
            background: '#FF0044', color: 'white', fontWeight: 600, fontSize: '0.85rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Plus size={16} /> Novo Player
          </button>
        </div>

        {showCode && (
          <div style={{ marginBottom: '1rem', background: '#002200', border: '1px solid #00E85C44', borderRadius: 12, padding: '1.5rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.85rem', color: '#00E85C', fontWeight: 600, marginBottom: 4 }}>🎉 Player criado!</p>
            <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: 8 }}>Código de pareamento:</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#111', border: '1px solid #333', borderRadius: 8, padding: '0.5rem 1rem' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: 4, color: '#00E85C' }}>{showCode}</span>
              <button onClick={() => copyCode(showCode)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
                {copiedId === showCode ? <Check size={18} style={{ color: '#00E85C' }} /> : <Copy size={18} />}
              </button>
            </div>
            <button onClick={() => setShowCode(null)} style={{ display: 'block', margin: '0.5rem auto 0', background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.8rem' }}>
              Fechar
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#555' }}>Carregando...</div>
        ) : players.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#444' }}>
            <Monitor size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p>Nenhum player registrado</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {players.map(player => (
              <div key={player.id} style={{
                background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '1rem',
                transition: 'all 0.2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 12, height: 12, borderRadius: '50%',
                      background: statusColor(player.status),
                      boxShadow: player.status === 'online' ? `0 0 12px ${statusColor(player.status)}66` : 'none',
                      transition: 'all 0.3s',
                    }} />
                    <div>
                      <div style={{ fontWeight: 500 }}>{player.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#666' }}>
                        {player.status === 'online' ? 'Online' : 'Offline'}
                        {player.lastSeenAt && player.status === 'offline' && ` · ${new Date(player.lastSeenAt).toLocaleString('pt-BR')}`}
                        {player.version && ` · v${player.version}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {player.pairingCode && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#111', borderRadius: 6, padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}>
                        <span style={{ fontFamily: 'monospace', color: '#00E85C' }}>{player.pairingCode}</span>
                        <button onClick={() => copyCode(player.pairingCode!)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555' }}>
                          {copiedId === player.pairingCode ? <Check size={14} style={{ color: '#00E85C' }} /> : <Copy size={14} />}
                        </button>
                      </div>
                    )}
                    {player.status === 'online' && (
                      <>
                        <button onClick={() => handleScreenshot(player.id)} title="Screenshot"
                          style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 4 }}>
                          <Camera size={15} />
                        </button>
                        <button onClick={() => handleCommand(player.id, 'restart')} title="Reiniciar Player"
                          style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 4 }}>
                          <RefreshCw size={15} />
                        </button>
                      </>
                    )}
                    <button onClick={() => removePlayer(player.id)} title="Remover"
                      style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: 4 }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {screenshotUrl && (
          <div onClick={() => setScreenshotUrl(null)}
               style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <img src={screenshotUrl} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8 }} />
          </div>
        )}
      </main>
    </div>
  );
}
