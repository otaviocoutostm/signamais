'use client'
import { API_URL, WS_URL } from '../../lib/api-config';;

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Calendar, Plus, Trash2, LogOut, Clock, Layers, Monitor, Users, Eye } from 'lucide-react';

interface Schedule {
  id: string;
  playerId?: string;
  groupId?: string;
  layoutId?: string;
  campaignId?: string;
  startDate: string;
  endDate?: string;
  dayOfWeek?: number[];
  startTime?: string;
  endTime?: string;
  priority: number;
  isDefault: boolean;
  layout?: any;
  campaign?: any;
  player?: any;
  overlays?: any[];
}

export default function SchedulesPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [layouts, setLayouts] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<'list' | 'week'>('list');
  const [weekOffset, setWeekOffset] = useState(0);
  const [form, setForm] = useState({
    playerId: '', groupId: '', layoutId: '', campaignId: '',
    startDate: '', endDate: '', startTime: '08:00', endTime: '18:00',
    dayOfWeek: [] as number[], priority: 0, isDefault: false,
    scheduleType: 'layout' as 'layout' | 'campaign' | 'group',
  });
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [overlayForm, setOverlayForm] = useState({
    layoutId: '', startTime: '08:00', endTime: '18:00',
    dayOfWeek: [] as number[], priority: 0,
  });

  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
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
      const [schRes, playRes, layRes, campRes, grpRes] = await Promise.all([
        axios.get(`${API_URL}/api/schedules`, { headers }),
        axios.get(`${API_URL}/api/players`, { headers }),
        axios.get(`${API_URL}/api/layouts`, { headers }),
        axios.get(`${API_URL}/api/campaigns`, { headers }),
        axios.get(`${API_URL}/api/display-groups`, { headers }),
      ]);
      setSchedules(schRes.data);
      setPlayers(playRes.data);
      setLayouts(layRes.data);
      setCampaigns(campRes.data);
      setGroups(grpRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // Week view: get days for the week
  const weekDays = useMemo(() => {
    const today = new Date();
    today.setDate(today.getDate() + weekOffset * 7);
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekOffset]);

  // Filter schedules for a specific day
  const schedulesForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayNum = date.getDay();
    
    return schedules.filter(s => {
      if (s.isDefault) return false;
      const start = s.startDate ? s.startDate.split('T')[0] : null;
      if (start && start > dateStr) return false;
      
      if (s.endDate) {
        const end = s.endDate.split('T')[0];
        if (end < dateStr) return false;
      }
      
      if (s.dayOfWeek && Array.isArray(s.dayOfWeek)) {
        if (!s.dayOfWeek.includes(dayNum)) return false;
      }
      
      return true;
    });
  };

  // Color per schedule
  const getScheduleColor = (s: Schedule) => {
    if (s.campaignId) return '#FF6B00';
    if (s.groupId) return '#0055FF';
    return '#FF0044';
  };

  const getScheduleLabel = (s: Schedule) => {
    if (s.campaign) return `📋 ${s.campaign.name}`;
    if (s.layout) return s.layout.name;
    if (s.campaignId) return '📋 Campanha';
    return 'Layout';
  };

  const createSchedule = async () => {
    const data: any = {
      startDate: form.startDate ? new Date(form.startDate).toISOString() : new Date().toISOString(),
      dayOfWeek: form.dayOfWeek.length > 0 ? form.dayOfWeek : undefined,
      startTime: form.startTime || undefined,
      endTime: form.endTime || undefined,
      priority: form.priority,
      isDefault: form.isDefault,
    };

    if (form.scheduleType === 'layout') {
      data.layoutId = form.layoutId;
    } else if (form.scheduleType === 'campaign') {
      data.campaignId = form.campaignId;
    }

    if (form.scheduleType === 'group') {
      data.groupId = form.groupId;
      data.layoutId = form.layoutId;
    } else {
      data.playerId = form.playerId;
    }

    if (!data.layoutId && !data.campaignId) return;

    try {
      const token = getToken();
      await axios.post(`${API_URL}/api/schedules`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowForm(false);
      setForm({ playerId: '', groupId: '', layoutId: '', campaignId: '',
        startDate: '', endDate: '', startTime: '08:00', endTime: '18:00',
        dayOfWeek: [], priority: 0, isDefault: false, scheduleType: 'layout' });
      loadAll();
    } catch (err) { console.error(err); }
  };

  const removeSchedule = async (id: string) => {
    try {
      const token = getToken();
      await axios.delete(`${API_URL}/api/schedules/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      setSelectedSchedule(null);
    } catch (err) { console.error(err); }
  };

  const toggleDay = (day: number) => {
    setForm((prev) => ({
      ...prev,
      dayOfWeek: prev.dayOfWeek.includes(day)
        ? prev.dayOfWeek.filter((d) => d !== day)
        : [...prev.dayOfWeek, day],
    }));
  };

  const toggleOverlayDay = (day: number) => {
    setOverlayForm((prev) => ({
      ...prev,
      dayOfWeek: prev.dayOfWeek.includes(day)
        ? prev.dayOfWeek.filter((d) => d !== day)
        : [...prev.dayOfWeek, day],
    }));
  };

  const addOverlay = async () => {
    if (!selectedSchedule || !overlayForm.layoutId) return;
    try {
      const token = getToken();
      await axios.post(
        `${API_URL}/api/schedules/${selectedSchedule.id}/overlays`,
        {
          layoutId: overlayForm.layoutId,
          startDate: new Date().toISOString(),
          startTime: overlayForm.startTime,
          endTime: overlayForm.endTime,
          dayOfWeek: overlayForm.dayOfWeek.length > 0 ? overlayForm.dayOfWeek : undefined,
          priority: overlayForm.priority,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOverlayForm({ layoutId: '', startTime: '08:00', endTime: '18:00', dayOfWeek: [], priority: 0 });
      loadAll();
    } catch (err) { console.error(err); }
  };

  const removeOverlay = async (overlayId: string) => {
    try {
      const token = getToken();
      await axios.delete(`${API_URL}/api/schedules/overlays/${overlayId}`, {
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
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">Agendamento</h2>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setView('list')}
                className={`px-3 py-1.5 text-xs rounded-md ${view === 'list' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}>
                Lista
              </button>
              <button onClick={() => setView('week')}
                className={`px-3 py-1.5 text-xs rounded-md ${view === 'week' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}>
                Semana
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: '#FF0044' }} /> Layout
              <span className="w-2 h-2 rounded-full" style={{ background: '#FF6B00' }} /> Campanha
              <span className="w-2 h-2 rounded-full" style={{ background: '#0055FF' }} /> Grupo
            </span>
            <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={18} /> Novo Agendamento
            </button>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
            <h3 className="font-semibold mb-4">Novo Agendamento</h3>
            
            {/* Schedule type tabs */}
            <div className="flex gap-2 mb-4">
              {[
                { key: 'layout' as const, label: 'Layout', icon: Eye },
                { key: 'campaign' as const, label: 'Campanha', icon: Layers },
                { key: 'group' as const, label: 'Grupo', icon: Users },
              ].map((t) => (
                <button key={t.key} onClick={() => setForm({ ...form, scheduleType: t.key })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border ${
                    form.scheduleType === t.key
                      ? 'bg-[#002B5C] text-white border-[#002B5C]'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}>
                  <t.icon size={16} />
                  {t.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Player selector */}
              {form.scheduleType !== 'group' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Player</label>
                  <select value={form.playerId} onChange={(e) => setForm({ ...form, playerId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none">
                    <option value="">Selecione...</option>
                    {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}

              {/* Group selector */}
              {form.scheduleType === 'group' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grupo</label>
                  <select value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none">
                    <option value="">Selecione...</option>
                    {groups.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.members?.length || 0} displays)</option>)}
                  </select>
                </div>
              )}

              {/* Layout or Campaign */}
              {form.scheduleType !== 'campaign' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Layout</label>
                  <select value={form.layoutId} onChange={(e) => setForm({ ...form, layoutId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none">
                    <option value="">Selecione...</option>
                    {layouts.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              )}

              {form.scheduleType === 'campaign' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campanha</label>
                  <select value={form.campaignId} onChange={(e) => setForm({ ...form, campaignId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none">
                    <option value="">Selecione...</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.items?.length || 0} layouts)</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
                <input type="date" value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim (opcional)</label>
                <input type="date" value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">De</label>
                  <input type="time" value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Até</label>
                  <input type="time" value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
              </div>
            </div>

            {/* Days of week */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Dias da Semana</label>
              <div className="flex gap-2">
                {daysOfWeek.map((day, i) => (
                  <button key={i} onClick={() => toggleDay(i)}
                    className={`px-3 py-1.5 rounded-lg text-sm border ${
                      form.dayOfWeek.includes(i)
                        ? 'bg-[#002B5C] text-white border-[#002B5C]'
                        : 'bg-white text-gray-600 border-gray-300'
                    }`}>
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority + Default */}
            <div className="flex items-center gap-6 mb-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Prioridade:</label>
                <input type="number" min={0} max={100} value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                  className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm outline-none text-center" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="rounded border-gray-300" />
                Layout padrão (fallback)
              </label>
            </div>

            <div className="flex gap-3">
              <button onClick={createSchedule} className="btn-primary text-sm px-6">Salvar</button>
              <button onClick={() => setShowForm(false)} className="text-sm text-gray-500">Cancelar</button>
            </div>
          </div>
        )}

        {/* Week Calendar View */}
        {view === 'week' && (
          <div>
            {/* Week nav */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setWeekOffset(weekOffset - 1)}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1">
                ← Semana anterior
              </button>
              <span className="text-sm font-medium">
                {weekDays[0]?.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })} — {' '}
                {weekDays[6]?.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => setWeekOffset(weekOffset + 1)}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1">
                Próxima semana →
              </button>
            </div>

            {/* Week grid */}
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day, idx) => {
                const daySchedules = schedulesForDay(day);
                const isToday = day.toDateString() === new Date().toDateString();
                return (
                  <div key={idx} className={`bg-white rounded-xl border min-h-[200px] ${
                    isToday ? 'border-[#FF0044] ring-1 ring-[#FF0044]/20' : 'border-gray-100'
                  }`}>
                    <div className={`px-3 py-2 text-center border-b border-gray-50 ${
                      isToday ? 'bg-[#FF0044]/5' : ''
                    }`}>
                      <div className="text-xs text-gray-500 uppercase">{daysOfWeek[idx]}</div>
                      <div className={`text-lg font-bold ${isToday ? 'text-[#FF0044]' : 'text-gray-800'}`}>
                        {day.getDate()}
                      </div>
                    </div>
                    <div className="p-2 space-y-1">
                      {daySchedules.length === 0 && (
                        <p className="text-xs text-gray-300 text-center py-4">Sem agendamento</p>
                      )}
                      {daySchedules.slice(0, 4).map((s) => (
                        <div key={s.id}
                          onClick={() => setSelectedSchedule(s)}
                          className="text-xs p-2 rounded-lg cursor-pointer text-white truncate"
                          style={{ background: getScheduleColor(s) }}>
                          {s.startTime && `${s.startTime} - `}
                          {getScheduleLabel(s)}
                        </div>
                      ))}
                      {daySchedules.length > 4 && (
                        <p className="text-xs text-gray-400 text-center">
                          +{daySchedules.length - 4} mais
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Default schedule */}
            {schedules.filter(s => s.isDefault).map(s => (
              <div key={s.id} className="mt-4 bg-white rounded-xl border border-dashed border-gray-200 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">🔵</span>
                  <span className="text-gray-500">Layout padrão (fallback):</span>
                  <span className="font-medium">{s.layout?.name}</span>
                  <span className="text-gray-400 text-xs">
                    {s.player && `→ ${s.player.name}`}
                    {s.groupId && `→ Grupo`}
                  </span>
                </div>
                <button onClick={() => removeSchedule(s.id)}
                  className="text-gray-300 hover:text-red-500 p-1">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* List View */}
        {view === 'list' && (
          loading ? (
            <div className="text-center py-12 text-gray-500">Carregando...</div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Calendar size={48} className="mx-auto mb-3 opacity-50" />
              <p>Nenhum agendamento criado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {schedules.filter(s => !s.isDefault).map((s) => (
                <div key={s.id}
                  onClick={() => setSelectedSchedule(selectedSchedule?.id === s.id ? null : s)}
                  className={`bg-white rounded-xl border p-5 cursor-pointer transition-all ${
                    selectedSchedule?.id === s.id ? 'border-[#FF0044] ring-1 ring-[#FF0044]/20' : 'border-gray-100 hover:border-gray-200'
                  }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                        style={{ background: getScheduleColor(s) }}>
                        {s.campaign ? <Layers size={18} /> : s.groupId ? <Users size={18} /> : <Eye size={18} />}
                      </div>
                      <div>
                        <h3 className="font-medium flex items-center gap-2">
                          {s.campaign?.name || s.layout?.name || 'Layout'}
                          {s.isDefault && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Padrão</span>}
                        </h3>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                          {s.player ? <><Monitor size={12} /> {s.player.name}</> : s.groupId ? <>📍 Grupo</> : ''}
                          {s.layout && !s.campaign && <> · Layout</>}
                          {s.campaign && <> · Campanha ({s.campaign.items?.length || 0} layouts)</>}
                        </p>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removeSchedule(s.id); }}
                      className="text-gray-300 hover:text-red-500 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                    {s.startDate && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(s.startDate).toLocaleDateString('pt-BR')}
                        {s.endDate && ` — ${new Date(s.endDate).toLocaleDateString('pt-BR')}`}
                      </span>
                    )}
                    {s.startTime && (
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {s.startTime} às {s.endTime}
                      </span>
                    )}
                    {s.dayOfWeek && s.dayOfWeek.length > 0 && (
                      <span>{s.dayOfWeek.map((d: number) => daysOfWeek[d]).join(', ')}</span>
                    )}
                    <span>Prioridade: {s.priority}</span>
                  </div>

                  {/* Overlays */}
                  {s.overlays && s.overlays.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-50">
                      <p className="text-xs text-gray-400 mb-2">
                        Overlays ({s.overlays.length}):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {s.overlays.map((o) => (
                          <span key={o.id}
                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-50 text-purple-600 rounded-md text-xs">
                            {o.layout?.name}
                            {o.startTime && ` ${o.startTime}-${o.endTime}`}
                            <button onClick={(e) => { e.stopPropagation(); removeOverlay(o.id); }}
                              className="hover:text-red-500 ml-1">
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Default schedule card */}
              {schedules.filter(s => s.isDefault).map(s => (
                <div key={s.id} className="bg-white rounded-xl border border-dashed border-blue-200 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                        🔵
                      </div>
                      <div>
                        <h3 className="font-medium">Layout Padrão (Fallback)</h3>
                        <p className="text-sm text-gray-500">{s.layout?.name}</p>
                      </div>
                    </div>
                    <button onClick={() => removeSchedule(s.id)}
                      className="text-gray-300 hover:text-red-500 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Overlay panel (when schedule is selected) */}
        {selectedSchedule && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 p-4"
               style={{ maxHeight: '40vh', overflow: 'auto' }}>
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">
                  Gerenciar: {selectedSchedule.campaign?.name || selectedSchedule.layout?.name}
                  {selectedSchedule.player && ` → ${selectedSchedule.player.name}`}
                </h3>
                <button onClick={() => setSelectedSchedule(null)}
                  className="text-gray-400 hover:text-gray-600 text-sm">✕ Fechar</button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Overlays list */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Overlays ativos</p>
                  {(!selectedSchedule.overlays || selectedSchedule.overlays.length === 0) ? (
                    <p className="text-sm text-gray-400">Nenhum overlay. Adicione ao lado.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedSchedule.overlays.map((o) => (
                        <div key={o.id}
                          className="flex items-center justify-between bg-purple-50 rounded-lg px-3 py-2">
                          <div>
                            <p className="text-sm font-medium">{o.layout?.name}</p>
                            <p className="text-xs text-gray-400">
                              {o.startTime && `${o.startTime} às ${o.endTime}`}
                              {o.dayOfWeek && JSON.parse(o.dayOfWeek).length > 0 &&
                                ` · ${JSON.parse(o.dayOfWeek).map((d: number) => daysOfWeek[d]).join(', ')}`}
                            </p>
                          </div>
                          <button onClick={() => removeOverlay(o.id)}
                            className="text-gray-300 hover:text-red-500 p-1">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add overlay */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Adicionar overlay</p>
                  <div className="space-y-2">
                    <select value={overlayForm.layoutId}
                      onChange={(e) => setOverlayForm({ ...overlayForm, layoutId: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
                      <option value="">Selecione o layout overlay...</option>
                      {layouts.filter(l => l.id !== selectedSchedule.layoutId).map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <input type="time" value={overlayForm.startTime}
                        onChange={(e) => setOverlayForm({ ...overlayForm, startTime: e.target.value })}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
                      <input type="time" value={overlayForm.endTime}
                        onChange={(e) => setOverlayForm({ ...overlayForm, endTime: e.target.value })}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
                    </div>
                    <div className="flex gap-1">
                      {daysOfWeek.map((day, i) => (
                        <button key={i} onClick={() => toggleOverlayDay(i)}
                          className={`px-2 py-1 rounded text-xs border ${
                            overlayForm.dayOfWeek.includes(i)
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-white text-gray-500 border-gray-200'
                          }`}>
                          {day}
                        </button>
                      ))}
                    </div>
                    <button onClick={addOverlay}
                      className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700">
                      + Adicionar Overlay
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Height spacing for overlay panel */}
        {selectedSchedule && <div className="h-48" />}
      </main>
    </div>
  );
}
