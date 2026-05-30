'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { LayoutDashboard, Image, Monitor, Calendar, LogOut, RefreshCw, Layers, Users } from 'lucide-react';
import { useWebSocket, usePlayerStatus } from '../../lib/websocket';

interface User { id: string; name: string; email: string; role: string; }

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({ media: 0, layouts: 0, players: 0, playersOnline: 0 });
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket, connected } = useWebSocket(user?.id);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token) { router.push('/login'); return; }
    if (userData) setUser(JSON.parse(userData));
  }, []);

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [media, layouts, playersRes] = await Promise.all([
        axios.get(`/api/media`, { headers }),
        axios.get(`/api/layouts`, { headers }),
        axios.get(`/api/players`, { headers }),
      ]);
      const p = playersRes.data;
      setPlayers(p);
      setStats({
        media: media.data.length,
        layouts: layouts.data.length,
        players: p.length,
        playersOnline: p.filter((pl: any) => pl.status === 'online').length,
      });
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { if (user) loadStats(); }, [user]);

  // Listen for player status updates via WebSocket
  useEffect(() => {
    if (!socket.current) return;
    const handler = (data: { playerId: string; status: string }) => {
      setPlayers(prev => prev.map(p => p.id === data.playerId ? { ...p, status: data.status } : p));
      setStats(prev => {
        const online = players.filter(p => p.status === 'online').length;
        return { ...prev, playersOnline: online };
      });
    };
    socket.current.on('player:status', handler);
    return () => { socket.current?.off('player:status', handler); };
  }, [socket.current, players]);

  const handleLogout = () => {
    localStorage.removeItem('token'); localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a', color: '#888' }}>Carregando...</div>;

  const menuItems = [
    { name: 'Mídias', icon: Image, href: '/media', count: stats.media, color: '#FF0044' },
    { name: 'Layouts', icon: LayoutDashboard, href: '/layouts', count: stats.layouts, color: '#00E85C' },
    { name: 'Players', icon: Monitor, href: '/players', count: stats.players, sub: `${stats.playersOnline} online`, color: '#0055FF' },
    { name: 'Agenda', icon: Calendar, href: '/schedules', count: null, color: '#FF6B00' },
    { name: 'Campanhas', icon: Layers, href: '/campaigns', count: null, color: '#FF6B00' },
    { name: 'Grupos', icon: Users, href: '/display-groups', count: null, color: '#0055FF' },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', color: 'white' }}>
      <header style={{ background: '#1a1a1a', borderBottom: '1px solid #2a2a2a', padding: '0.75rem 2rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 700 }}>
              Signa<span style={{ color: '#FF0044' }}>Mais</span>
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: connected ? '#00E85C' : '#555' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? '#00E85C' : '#555' }} />
              {connected ? 'Conectado' : 'Desconectado'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={loadStats} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}>
              <RefreshCw size={16} />
            </button>
            <span style={{ fontSize: '0.85rem', color: '#666' }}>{user?.name}</span>
            <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer' }}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1.5rem' }}>Dashboard</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {menuItems.map(item => (
            <a key={item.name} href={item.href}
               style={{
                 background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12,
                 padding: '1.5rem', textDecoration: 'none', color: 'white',
                 transition: 'all 0.2s', display: 'block',
               }}
               onMouseEnter={e => { e.currentTarget.style.borderColor = item.color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
               onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.transform = 'none'; }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: `${item.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <item.icon size={22} style={{ color: item.color }} />
                </div>
                {item.count !== null && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{item.count}</div>
                    {item.sub && <div style={{ fontSize: '0.75rem', color: '#888' }}>{item.sub}</div>}
                  </div>
                )}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#aaa' }}>{item.name}</div>
            </a>
          ))}
        </div>

        {/* Players online status */}
        <div style={{ marginTop: '2rem', background: '#1a1a1a', borderRadius: 12, border: '1px solid #2a2a2a', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem' }}>📡 Players Online</h3>
          {players.length === 0 ? (
            <p style={{ color: '#555', fontSize: '0.85rem' }}>Nenhum player registrado</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {players.slice(0, 10).map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.5rem 0', borderBottom: '1px solid #222' }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: p.status === 'online' ? '#00E85C' : '#444',
                    boxShadow: p.status === 'online' ? '0 0 8px #00E85C88' : 'none',
                  }} />
                  <span style={{ fontSize: '0.85rem' }}>{p.name}</span>
                  <span style={{ fontSize: '0.7rem', color: '#666', marginLeft: 'auto' }}>
                    {p.status === 'online' ? 'Online' : 'Offline'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
