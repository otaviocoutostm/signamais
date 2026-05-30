'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Monitor, Plus, Trash2, LogOut, Users } from 'lucide-react';

interface DisplayGroup {
  id: string;
  name: string;
  description?: string;
  members: { id: string; groupId: string; playerId: string; player: any }[];
}

export default function DisplayGroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<DisplayGroup[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    const token = getToken();
    const userData = localStorage.getItem('user');
    if (!token) { router.push('/login'); return; }
    if (userData) setUser(JSON.parse(userData));
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const token = getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [grpRes, playRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/display-groups`, { headers }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/players`, { headers }),
      ]);
      setGroups(grpRes.data);
      setPlayers(playRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const createGroup = async () => {
    if (!form.name) return;
    try {
      const token = getToken();
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/display-groups`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowForm(false);
      setForm({ name: '', description: '' });
      loadAll();
    } catch (err) { console.error(err); }
  };

  const removeGroup = async (id: string) => {
    try {
      const token = getToken();
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/display-groups/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      loadAll();
    } catch (err) { console.error(err); }
  };

  const addMember = async (groupId: string, playerId: string) => {
    if (!playerId) return;
    try {
      const token = getToken();
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/display-groups/${groupId}/members`,
        { playerId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadAll();
    } catch (err) { console.error(err); }
  };

  const removeMember = async (groupId: string, playerId: string) => {
    try {
      const token = getToken();
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/display-groups/${groupId}/members/${playerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      loadAll();
    } catch (err) { console.error(err); }
  };

  const handleLogout = () => {
    localStorage.removeItem('token'); localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-gray-400 hover:text-gray-600">← Dashboard</a>
            <h1 className="text-xl font-bold">
              <span style={{ color: '#002B5C' }}>Signa</span>
              <span style={{ color: '#FF0044' }}>Signa</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user?.name}</span>
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-500"><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Grupos de Displays</h2>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={18} /> Novo Grupo
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
            <h3 className="font-semibold mb-4">Novo Grupo</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input type="text" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none"
                  placeholder="Ex: Lojas Centro" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input type="text" value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none"
                  placeholder="Opcional" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={createGroup} className="btn-primary text-sm px-6">Salvar</button>
              <button onClick={() => setShowForm(false)} className="text-sm text-gray-500">Cancelar</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">Carregando...</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Users size={48} className="mx-auto mb-3 opacity-50" />
            <p>Nenhum grupo criado</p>
            <p className="text-sm mt-2">Crie grupos para agendar conteúdos em múltiplos displays de uma vez</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {groups.map((group) => {
              const availablePlayers = players.filter(
                (p) => !group.members.find((m) => m.playerId === p.id)
              );
              return (
                <div key={group.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{group.name}</h3>
                      <p className="text-sm text-gray-500">
                        {group.description && `${group.description} · `}
                        {group.members.length} display{group.members.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <button onClick={() => removeGroup(group.id)}
                            className="text-gray-300 hover:text-red-500 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="p-4">
                    {/* Members */}
                    <div className="space-y-2 mb-4">
                      {group.members.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-3">Nenhum display no grupo ainda</p>
                      )}
                      {group.members.map((m) => (
                        <div key={m.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-2.5">
                          <Monitor size={16} className="text-gray-300" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{m.player?.name || 'Display sem nome'}</p>
                            <p className="text-xs text-gray-400">
                              {m.player?.status || 'offline'}
                              {m.player?.lastSeenAt && ` · ${new Date(m.player.lastSeenAt).toLocaleDateString('pt-BR')}`}
                            </p>
                          </div>
                          <button onClick={() => removeMember(group.id, m.playerId)}
                                  className="text-gray-300 hover:text-red-500 p-1">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add member */}
                    {availablePlayers.length > 0 && (
                      <div className="flex items-center gap-2">
                        <select onChange={(e) => e.target.value && addMember(group.id, e.target.value)}
                                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
                          <option value="">Adicionar display...</option>
                          {availablePlayers.map((p) => (
                            <option key={p.id} value={p.id}>{p.name || 'Display sem nome'}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
