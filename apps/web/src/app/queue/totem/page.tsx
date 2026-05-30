'use client'
import { API_URL, WS_URL } from '../../../lib/api-config';;

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Clock, Printer } from 'lucide-react';

interface QueueService {
  id: string;
  name: string;
  prefix: string;
  description?: string;
  color: string;
  isActive: boolean;
}

export default function QueueTotemPage() {
  const [services, setServices] = useState<QueueService[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuedTicket, setIssuedTicket] = useState<any>(null);
  const [issuing, setIssuing] = useState(false);

  useEffect(() => { loadServices(); }, []);

  const loadServices = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/queue/services`);
      setServices(data.filter((s: QueueService) => s.isActive));
    } catch {}
    finally { setLoading(false); }
  };

  const issueTicket = async (serviceId: string) => {
    setIssuing(true);
    try {
      const { data } = await axios.post(`${API_URL}/api/queue/ticket/issue`, { serviceId });
      setIssuedTicket(data);
    } catch {}
    setIssuing(false);
  };

  const reset = () => { setIssuedTicket(null); };

  // Clock
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('pt-BR'));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  if (issuedTicket) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center" style={{ background: 'radial-gradient(ellipse at center, #1a1a1a 0%, #0a0a0a 100%)' }}>
        <div className="text-center px-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl text-gray-400 mb-2">Sua senha</h1>
          <div className="text-8xl font-bold tracking-widest my-8"
               style={{ color: issuedTicket.service?.color || '#FF0044' }}>
            {issuedTicket.displayNumber}
          </div>
          <p className="text-xl text-gray-500 mb-6">{issuedTicket.service?.name}</p>
          <p className="text-sm text-gray-600 mb-8">
            Emitida às {new Date(issuedTicket.issuedAt).toLocaleTimeString('pt-BR')}
          </p>
          <button onClick={reset}
            className="px-8 py-4 bg-white/10 text-white rounded-xl text-lg hover:bg-white/20 transition-all">
            🔄 Nova Senha
          </button>
          <p className="text-xs text-gray-600 mt-8">Aguardando: {services.length > 0 ? 'você será chamado(a) em breve' : ''}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center p-8"
         style={{ background: 'radial-gradient(ellipse at center, #1a1a1a 0%, #0a0a0a 100%)' }}>
      
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mb-4">
          <Clock size={16} /> {time}
        </div>
        <h1 className="text-4xl font-bold">
          <span style={{ color: '#FFFFFF' }}>Signa</span>
          <span style={{ color: '#FF0044' }}>Mais</span>
        </h1>
        <p className="text-gray-500 text-lg mt-2">Selecione o serviço desejado</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-3xl">
        {services.map((s) => (
          <button key={s.id} onClick={() => issueTicket(s.id)} disabled={issuing}
            className="relative overflow-hidden rounded-2xl p-8 text-center transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50"
            style={{ background: `${s.color}22`, border: `2px solid ${s.color}44` }}>
            <div className="text-5xl mb-4">🎫</div>
            <h2 className="text-xl font-bold text-white mb-1">{s.name}</h2>
            <p className="text-sm" style={{ color: s.color }}>
              Senha {s.prefix}...
            </p>
          </button>
        ))}
      </div>

      {loading && <p className="text-gray-600 mt-8">Carregando...</p>}
      {!loading && services.length === 0 && (
        <p className="text-gray-600 mt-8">Nenhum serviço disponível no momento</p>
      )}
    </div>
  );
}
