'use client'
import { API_URL, WS_URL } from '../../lib/api-config';;

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { LayoutDashboard, Plus, Trash2, LogOut, Edit3 } from 'lucide-react';

interface Layout {
  id: string;
  name: string;
  width: number;
  height: number;
  createdAt: string;
}

export default function LayoutsPage() {
  const router = useRouter();
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    const token = getToken();
    const userData = localStorage.getItem('user');
    if (!token) { router.push('/login'); return; }
    if (userData) setUser(JSON.parse(userData));
    loadLayouts();
  }, []);

  const loadLayouts = async () => {
    try {
      const token = getToken();
      const res = await axios.get(`${API_URL}/api/layouts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLayouts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createLayout = async () => {
    try {
      const token = getToken();
      const res = await axios.post(`${API_URL}/api/layouts`,
        { name: `Layout ${layouts.length + 1}`, width: 1920, height: 1080 },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setLayouts((prev) => [...prev, res.data]);
    } catch (err) {
      console.error(err);
    }
  };

  const removeLayout = async (id: string) => {
    try {
      const token = getToken();
      await axios.delete(`${API_URL}/api/layouts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLayouts((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-500">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Layouts</h2>
          <button onClick={createLayout} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={18} /> Novo Layout
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Carregando...</div>
        ) : layouts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <LayoutDashboard size={48} className="mx-auto mb-3 opacity-50" />
            <p>Nenhum layout criado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {layouts.map((layout) => (
              <div key={layout.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">{layout.name}</h3>
                  <button onClick={() => removeLayout(layout.id)}
                          className="text-gray-300 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="bg-gray-800 rounded-lg aspect-video flex items-center justify-center mb-3">
                  <LayoutDashboard size={32} className="text-gray-500" />
                </div>
                <p className="text-xs text-gray-400">
                  {layout.width}×{layout.height} · {new Date(layout.createdAt).toLocaleDateString('pt-BR')}
                </p>
                <button
                  onClick={() => router.push(`/layouts/${layout.id}`)}
                  className="mt-3 w-full py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <Edit3 size={14} /> Editar Layout
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
