'use client'
import { API_URL, WS_URL } from '../../lib/api-config';;

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Layers, Plus, Trash2, GripVertical, LogOut, ArrowUp, ArrowDown } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  items: CampaignItem[];
}

interface CampaignItem {
  id: string;
  campaignId: string;
  layoutId: string;
  displayOrder: number;
  duration: number;
  layout: any;
}

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [layouts, setLayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [addItemForm, setAddItemForm] = useState({ layoutId: '', duration: 10 });

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
      const [campRes, layRes] = await Promise.all([
        axios.get(`${API_URL}/api/campaigns`, { headers }),
        axios.get(`${API_URL}/api/layouts`, { headers }),
      ]);
      setCampaigns(campRes.data);
      setLayouts(layRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const createCampaign = async () => {
    if (!form.name) return;
    try {
      const token = getToken();
      await axios.post(`${API_URL}/api/campaigns`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowForm(false);
      setForm({ name: '', description: '' });
      loadAll();
    } catch (err) { console.error(err); }
  };

  const removeCampaign = async (id: string) => {
    try {
      const token = getToken();
      await axios.delete(`${API_URL}/api/campaigns/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      loadAll();
    } catch (err) { console.error(err); }
  };

  const addItem = async (campaignId: string) => {
    if (!addItemForm.layoutId) return;
    try {
      const token = getToken();
      const campaign = campaigns.find(c => c.id === campaignId);
      const nextOrder = campaign ? campaign.items.length : 0;
      await axios.post(`${API_URL}/api/campaigns/${campaignId}/items`, {
        ...addItemForm,
        displayOrder: nextOrder,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setAddItemForm({ layoutId: '', duration: 10 });
      loadAll();
    } catch (err) { console.error(err); }
  };

  const removeItem = async (itemId: string) => {
    try {
      const token = getToken();
      await axios.delete(`${API_URL}/api/campaigns/items/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      loadAll();
    } catch (err) { console.error(err); }
  };

  const moveItem = async (itemId: string, newOrder: number) => {
    try {
      const token = getToken();
      await axios.put(`${API_URL}/api/campaigns/items/${itemId}`,
        { displayOrder: newOrder },
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
              <span style={{ color: '#FF0044' }}>Mais</span>
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
          <h2 className="text-xl font-semibold">Campanhas</h2>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={18} /> Nova Campanha
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
            <h3 className="font-semibold mb-4">Nova Campanha</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input type="text" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none"
                  placeholder="Minha Campanha" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input type="text" value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none"
                  placeholder="Descrição opcional" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={createCampaign} className="btn-primary text-sm px-6">Salvar</button>
              <button onClick={() => setShowForm(false)} className="text-sm text-gray-500">Cancelar</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">Carregando...</div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Layers size={48} className="mx-auto mb-3 opacity-50" />
            <p>Nenhuma campanha criada</p>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((camp) => (
              <div key={camp.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="p-5 flex items-center justify-between border-b border-gray-50"
                     onClick={() => setSelectedCampaign(selectedCampaign === camp.id ? null : camp.id)}
                     style={{ cursor: 'pointer' }}>
                  <div>
                    <h3 className="font-medium">{camp.name}</h3>
                    <p className="text-sm text-gray-500">
                      {camp.description && `${camp.description} · `}
                      {camp.items.length} layout{camp.items.length !== 1 ? 's' : ''} na sequência
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {camp.items.reduce((acc, i) => acc + (i.duration || 10), 0)}s total
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); removeCampaign(camp.id); }}
                            className="text-gray-300 hover:text-red-500 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {selectedCampaign === camp.id && (
                  <div className="p-5 bg-gray-50">
                    {/* Items list */}
                    <div className="space-y-2 mb-4">
                      {camp.items.map((item, idx) => (
                        <div key={item.id}
                             className="flex items-center gap-3 bg-white rounded-lg border border-gray-100 p-3">
                          <span className="text-gray-300 text-sm font-mono w-6 text-center">{idx + 1}</span>
                          <div className="w-12 h-8 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                            {item.layout?.regions && (() => {
                              try {
                                const regions = JSON.parse(item.layout.regions);
                                const mediaRegion = regions.find((r: any) => r.type === 'media' && r.mediaId);
                                return mediaRegion
                                  ? <img src={`${API_URL}/api/media/${mediaRegion.mediaId}/download`}
                                         className="w-full h-full object-cover" />
                                  : <Layers size={14} className="text-gray-300" />;
                              } catch {
                                return <Layers size={14} className="text-gray-300" />;
                              }
                            })()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.layout?.name || 'Layout'}</p>
                            <p className="text-xs text-gray-400">{item.duration || 10}s de exibição</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => moveItem(item.id, Math.max(0, item.displayOrder - 1))}
                                    disabled={idx === 0}
                                    className="p-1 text-gray-300 hover:text-[#002B5C] disabled:opacity-20">
                              <ArrowUp size={14} />
                            </button>
                            <button onClick={() => moveItem(item.id, item.displayOrder + 1)}
                                    disabled={idx === camp.items.length - 1}
                                    className="p-1 text-gray-300 hover:text-[#002B5C] disabled:opacity-20">
                              <ArrowDown size={14} />
                            </button>
                            <button onClick={() => removeItem(item.id)}
                                    className="p-1 text-gray-300 hover:text-red-500 ml-2">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add item */}
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-dashed border-gray-200">
                      <select value={addItemForm.layoutId}
                        onChange={(e) => setAddItemForm({ ...addItemForm, layoutId: e.target.value })}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
                        <option value="">Adicionar layout...</option>
                        {layouts.filter(l => !camp.items.find(i => i.layoutId === l.id)).map(l => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-400">Duração (s)</label>
                        <input type="number" min={3} max={300} value={addItemForm.duration}
                          onChange={(e) => setAddItemForm({ ...addItemForm, duration: Number(e.target.value) })}
                          className="w-16 border border-gray-200 rounded-lg px-2 py-2 text-sm outline-none text-center" />
                      </div>
                      <button onClick={() => addItem(camp.id)}
                              className="px-3 py-2 bg-[#002B5C] text-white text-sm rounded-lg hover:bg-[#001f42]">
                        + Adicionar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
