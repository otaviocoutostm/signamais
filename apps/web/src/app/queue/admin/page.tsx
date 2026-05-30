'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Plus, Trash2, Monitor, Pause, Play, BarChart, LogOut } from 'lucide-react';

interface QueueService {
  id: string; name: string; prefix: string; description?: string; color: string; priority: number; isActive: boolean;
}

interface QueueDesk {
  id: string; name: string; number: number; location?: string; isActive: boolean; isPaused: boolean;
}

export default function QueueAdminPage() {
  const router = useRouter();
  const [services, setServices] = useState<QueueService[]>([]);
  const [desks, setDesks] = useState<QueueDesk[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'services' | 'desks' | 'stats'>('services');
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [showDeskForm, setShowDeskForm] = useState(false);
  const [serviceForm, setServiceForm] = useState({ name: '', prefix: 'N', color: '#0055FF', priority: 0, description: '' });
  const [deskForm, setDeskForm] = useState({ name: '', number: 1, location: '' });

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
      const headers = { Authorization: `Bearer ${getToken()}` };
      const [serRes, deskRes, statRes, statusRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/queue/services`, { headers }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/queue/desks`, { headers }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/queue/stats`, { headers }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/queue/status`, { headers }),
      ]);
      setServices(serRes.data);
      setDesks(deskRes.data);
      setStats(statRes.data);
      setStatus(statusRes.data);
    } catch {}
    finally { setLoading(false); }
  };

  // Service CRUD
  const createService = async () => {
    if (!serviceForm.name) return;
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/queue/services`, serviceForm, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setShowServiceForm(false);
      setServiceForm({ name: '', prefix: 'N', color: '#0055FF', priority: 0, description: '' });
      loadAll();
    } catch {}
  };

  const removeService = async (id: string) => {
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/queue/services/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      loadAll();
    } catch {}
  };

  // Desk CRUD
  const createDesk = async () => {
    if (!deskForm.name) return;
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/queue/desks`, deskForm, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setShowDeskForm(false);
      setDeskForm({ name: '', number: desks.length + 1, location: '' });
      loadAll();
    } catch {}
  };

  const removeDesk = async (id: string) => {
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/queue/desks/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      loadAll();
    } catch {}
  };

  const toggleDeskPause = async (id: string) => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/queue/desks/${id}/pause`, {}, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      loadAll();
    } catch {}
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
              <span style={{ color: '#FF0044' }}>Mais</span>
              <span className="text-sm text-gray-400 ml-2">Gerenciamento de Fila</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <a href="/queue/tv" target="_blank" className="text-sm text-gray-500 hover:text-[#FF0044]">📺 Painel TV</a>
            <span className="text-sm text-gray-500">{user?.name}</span>
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-500"><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'services' as const, label: 'Serviços' },
            { key: 'desks' as const, label: 'Guichês' },
            { key: 'stats' as const, label: 'Estatísticas' },
          ].map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                activeTab === t.key ? 'bg-[#002B5C] text-white' : 'bg-white text-gray-600 border border-gray-200'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Quick Status */}
        {status && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">{status.waiting}</p>
              <p className="text-xs text-gray-500">Aguardando</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{status.called}</p>
              <p className="text-xs text-gray-500">Chamadas</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{status.inProgress}</p>
              <p className="text-xs text-gray-500">Em Atendimento</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{status.finishedToday}</p>
              <p className="text-xs text-gray-500">Atendidos Hoje</p>
            </div>
          </div>
        )}

        {/* Services Tab */}
        {activeTab === 'services' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Serviços</h3>
              <button onClick={() => setShowServiceForm(!showServiceForm)}
                className="btn-primary flex items-center gap-2 text-sm">
                <Plus size={16} /> Novo Serviço
              </button>
            </div>

            {showServiceForm && (
              <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <input type="text" placeholder="Nome (ex: Prioritário)" value={serviceForm.name}
                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
                  <div className="flex gap-2">
                    <input type="text" placeholder="Prefixo" value={serviceForm.prefix} maxLength={2}
                      onChange={(e) => setServiceForm({ ...serviceForm, prefix: e.target.value.toUpperCase() })}
                      className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none text-center uppercase" />
                    <input type="color" value={serviceForm.color}
                      onChange={(e) => setServiceForm({ ...serviceForm, color: e.target.value })}
                      className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                    <input type="number" placeholder="Prioridade" value={serviceForm.priority}
                      onChange={(e) => setServiceForm({ ...serviceForm, priority: Number(e.target.value) })}
                      className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none text-center" />
                  </div>
                  <input type="text" placeholder="Descrição (opcional)" value={serviceForm.description}
                    onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
                <button onClick={createService} className="btn-primary text-sm px-6">Salvar</button>
              </div>
            )}

            <div className="space-y-2">
              {services.map((s) => (
                <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                         style={{ background: s.color }}>
                      {s.prefix}
                    </div>
                    <div>
                      <h4 className="font-medium">{s.name}</h4>
                      <p className="text-xs text-gray-400">
                        {s.description && `${s.description} · `}
                        Prioridade {s.priority}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${s.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                      {s.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                    <button onClick={() => removeService(s.id)}
                      className="text-gray-300 hover:text-red-500 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {services.length === 0 && <p className="text-gray-400 text-center py-8">Nenhum serviço cadastrado</p>}
            </div>
          </div>
        )}

        {/* Desks Tab */}
        {activeTab === 'desks' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Guichês</h3>
              <button onClick={() => setShowDeskForm(!showDeskForm)}
                className="btn-primary flex items-center gap-2 text-sm">
                <Plus size={16} /> Novo Guichê
              </button>
            </div>

            {showDeskForm && (
              <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <input type="text" placeholder="Nome (ex: Guichê 1)" value={deskForm.name}
                    onChange={(e) => setDeskForm({ ...deskForm, name: e.target.value })}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
                  <input type="number" placeholder="Número" value={deskForm.number}
                    onChange={(e) => setDeskForm({ ...deskForm, number: Number(e.target.value) })}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
                  <input type="text" placeholder="Localização (opcional)" value={deskForm.location}
                    onChange={(e) => setDeskForm({ ...deskForm, location: e.target.value })}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
                <button onClick={createDesk} className="btn-primary text-sm px-6">Salvar</button>
              </div>
            )}

            <div className="space-y-2">
              {desks.map((d) => (
                <div key={d.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      d.isPaused ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'
                    }`}>
                      <Monitor size={18} />
                    </div>
                    <div>
                      <h4 className="font-medium">Guichê {d.number} — {d.name}</h4>
                      <p className="text-xs text-gray-400">
                        {d.location && `${d.location} · `}
                        {d.isPaused ? '⏸️ Pausado' : '✅ Disponível'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleDeskPause(d.id)}
                      className={`p-2 rounded-lg ${d.isPaused ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>
                      {d.isPaused ? <Play size={16} /> : <Pause size={16} />}
                    </button>
                    <a href={`/queue/desk?deskId=${d.id}`} target="_blank"
                      className="px-3 py-1.5 bg-[#002B5C] text-white text-xs rounded-lg hover:bg-[#001f42]">
                      Abrir Painel
                    </a>
                    <button onClick={() => removeDesk(d.id)}
                      className="text-gray-300 hover:text-red-500 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {desks.length === 0 && <p className="text-gray-400 text-center py-8">Nenhum guichê cadastrado</p>}
            </div>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && stats && (
          <div>
            <h3 className="font-semibold mb-4">Estatísticas do Dia</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
                <p className="text-sm text-gray-500">Total de senhas</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <p className="text-3xl font-bold text-green-600">{stats.finished}</p>
                <p className="text-sm text-gray-500">Atendidas</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <p className="text-3xl font-bold text-red-500">{stats.noShow}</p>
                <p className="text-sm text-gray-500">Não compareceram</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <p className="text-3xl font-bold text-blue-600">{stats.avgWaitTime}</p>
                <p className="text-sm text-gray-500">Tempo médio (min)</p>
              </div>
            </div>

            <h4 className="font-medium mb-3">Por Serviço</h4>
            <div className="space-y-2">
              {stats.serviceStats?.map((s: any) => (
                <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                           style={{ background: s.color || '#0055FF' }}>
                        {s.prefix}
                      </div>
                      <span className="font-medium">{s.name}</span>
                    </div>
                    <span className="text-lg font-bold">{s.tickets?.length || 0} senhas</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <a href="/queue/totem" target="_blank"
            className="bg-white rounded-xl border border-gray-100 p-5 text-center hover:border-[#FF0044] transition-all">
            <div className="text-2xl mb-1">🎫</div>
            <p className="text-sm font-medium">Totem de Senha</p>
            <p className="text-xs text-gray-400">Abrir totem touch</p>
          </a>
          <a href="/queue/tv" target="_blank"
            className="bg-white rounded-xl border border-gray-100 p-5 text-center hover:border-[#FF0044] transition-all">
            <div className="text-2xl mb-1">📺</div>
            <p className="text-sm font-medium">Painel TV</p>
            <p className="text-xs text-gray-400">Tela da fila</p>
          </a>
          <a href={`/queue/desk?deskId=${desks[0]?.id || ''}`} target="_blank"
            className="bg-white rounded-xl border border-gray-100 p-5 text-center hover:border-[#FF0044] transition-all">
            <div className="text-2xl mb-1">👩‍💼</div>
            <p className="text-sm font-medium">Painel Atendente</p>
            <p className="text-xs text-gray-400">Abrir guichê</p>
          </a>
        </div>
      </main>
    </div>
  );
}
