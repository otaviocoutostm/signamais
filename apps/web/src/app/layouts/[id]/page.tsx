'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import { Save, Plus, Trash2, Image, Type, Clock, Globe } from 'lucide-react';

interface Region {
  id: string;
  name: string;
  x: number; y: number;
  width: number; height: number;
  type: 'media' | 'text' | 'clock' | 'web';
  mediaId?: string;
  content?: string;
  fontSize?: number;
  color?: string;
  url?: string;
}

const REGION_TYPES = [
  { type: 'media' as const,  label: 'Mídia',  icon: Image,  color: '#FF0044' },
  { type: 'text' as const,   label: 'Texto',  icon: Type,   color: '#0055FF' },
  { type: 'clock' as const,  label: 'Relógio', icon: Clock, color: '#00E85C' },
  { type: 'web' as const,    label: 'Web',    icon: Globe,  color: '#FF6B00' },
];

export default function LayoutEditorPage() {
  const router = useRouter();
  const params = useParams();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [layout, setLayout] = useState<any>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [resizing, setResizing] = useState<{ id: string; edge: string; startX: number; startY: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const getToken = () => localStorage.getItem('token');
  const LW = 1920, LH = 1080, SCALE = 0.55;

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/login'); return; }
    const ud = localStorage.getItem('user');
    if (ud) setUser(JSON.parse(ud));
    loadLayout(); loadMedia();
  }, []);

  const loadLayout = async () => {
    try {
      const { data } = await axios.get(
        `/api/layouts/${params.id}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      setLayout(data);
      const r = typeof data.regions === 'string' ? JSON.parse(data.regions) : data.regions || [];
      setRegions(r.length ? r : [{ id: '1', name: 'Região 1', x: 0, y: 0, width: LW, height: LH, type: 'media' }]);
    } catch {}
  };

  const loadMedia = async () => {
    try {
      const { data } = await axios.get(
        `/api/media`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      setMedia(data.filter((m: any) => m.mimeType.startsWith('image/')));
    } catch {}
  };

  const save = async () => {
    setSaving(true);
    try {
      await axios.put(
        `/api/layouts/${params.id}`,
        { regions: JSON.stringify(regions) },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
    } catch {}
    setSaving(false);
  };

  const addRegion = (type: Region['type']) => {
    const id = crypto.randomUUID();
    setRegions(p => [...p, {
      id, name: `${REGION_TYPES.find(t => t.type === type)?.label} ${p.length + 1}`,
      x: 60, y: 60, width: 600, height: 400, type, color: '#ffffff', fontSize: 48,
    }]);
    setSelectedId(id);
  };

  const updateRegion = (id: string, patch: Partial<Region>) =>
    setRegions(p => p.map(r => r.id === id ? { ...r, ...patch } : r));

  const removeRegion = (id: string) => {
    setRegions(p => p.filter(r => r.id !== id));
    setSelectedId(null);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.region-el')) return;
    setSelectedId(null);
  };

  const handleRegionMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const r = regions.find(x => x.id === id);
    if (!r) return;
    setSelectedId(id);
    setDragging({ id, startX: e.clientX, startY: e.clientY, origX: r.x, origY: r.y });
  };

  const handleResizeStart = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setResizing({ id, edge: 'se', startX: e.clientX, startY: e.clientY });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragging) {
      const dx = (e.clientX - dragging.startX) / SCALE;
      const dy = (e.clientY - dragging.startY) / SCALE;
      setRegions(p => p.map(r =>
        r.id === dragging.id ? {
          ...r,
          x: Math.max(0, Math.min(LW - r.width, dragging.origX + dx)),
          y: Math.max(0, Math.min(LH - r.height, dragging.origY + dy)),
        } : r
      ));
    }
    if (resizing) {
      const r = regions.find(x => x.id === resizing.id);
      if (!r) return;
      const dx = (e.clientX - resizing.startX) / SCALE;
      const dy = (e.clientY - resizing.startY) / SCALE;
      setRegions(p => p.map(reg =>
        reg.id === resizing.id ? {
          ...reg,
          width: Math.max(100, r.width + dx),
          height: Math.max(60, r.height + dy),
        } : reg
      ));
      setResizing({ ...resizing, startX: e.clientX, startY: e.clientY });
    }
  }, [dragging, resizing, regions]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setResizing(null);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [handleMouseMove, handleMouseUp]);

  const selected = regions.find(r => r.id === selectedId);

  const typeIcon = (t: string) => {
    const found = REGION_TYPES.find(x => x.type === t);
    return found ? <found.icon size={16} /> : null;
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0f0f0f', color: 'white' }}>
      {/* Toolbar */}
      <header style={{ background: '#1a1a1a', borderBottom: '1px solid #2a2a2a', padding: '0.5rem 1.5rem' }}>
        <div className="flex items-center justify-between" style={{ maxWidth: '100%' }}>
          <div className="flex items-center gap-4">
            <a href="/layouts" style={{ color: '#888', fontSize: '0.85rem' }}>← Layouts</a>
            <span style={{ fontWeight: 600, fontSize: '1rem' }}>{layout?.name || '...'}</span>
            <span style={{ color: '#555', fontSize: '0.75rem' }}>{LW}×{LH}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPreviewMode(!previewMode)}
                    style={{ padding: '0.4rem 1rem', borderRadius: 6, border: '1px solid #444', background: 'transparent', color: '#ccc', fontSize: '0.8rem', cursor: 'pointer' }}>
              {previewMode ? '✏️ Editar' : '👁️ Preview'}
            </button>
            <button onClick={save} disabled={saving}
                    style={{ padding: '0.4rem 1.2rem', borderRadius: 6, border: 'none', background: '#FF0044', color: 'white', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Save size={14} /> {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <main className="flex-1 flex items-start justify-center p-6 overflow-auto"
              onMouseDown={handleCanvasMouseDown}
              ref={canvasRef}>
          {!previewMode ? (
            <div style={{
              position: 'relative',
              width: LW * SCALE, height: LH * SCALE,
              background: '#111',
              border: '1px solid #2a2a2a',
              borderRadius: 8,
              overflow: 'hidden',
              boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
              flexShrink: 0,
            }}>
              {/* Grid background */}
              <div style={{ position: 'absolute', inset: 0, opacity: 0.06,
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '20px 20px' }} />

              {regions.map(r => {
                const isSelected = selectedId === r.id;
                return (
                  <div key={r.id} className="region-el"
                    onMouseDown={(e) => handleRegionMouseDown(e, r.id)}
                    style={{
                      position: 'absolute',
                      left: r.x * SCALE, top: r.y * SCALE,
                      width: r.width * SCALE, height: r.height * SCALE,
                      border: isSelected ? '2px solid #FF0044' : '2px dashed rgba(255,255,255,0.15)',
                      borderRadius: 4,
                      background: isSelected ? 'rgba(255,0,68,0.08)' : 'rgba(255,255,255,0.03)',
                      cursor: 'move',
                      transition: dragging?.id === r.id ? 'none' : 'none',
                      zIndex: isSelected ? 10 : 1,
                    }}>
                    {/* Header */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '3px 6px', fontSize: '0.65rem',
                      color: isSelected ? '#FF0044' : '#888',
                      fontWeight: isSelected ? 600 : 400,
                      userSelect: 'none',
                    }}>
                      {typeIcon(r.type)}
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                      <span onClick={(e) => { e.stopPropagation(); removeRegion(r.id); }}
                            style={{ cursor: 'pointer', opacity: 0.4 }}>✕</span>
                    </div>

                    {/* Content preview */}
                    {r.type === 'clock' && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100% - 22px)', fontSize: `${Math.min(36, r.height * SCALE * 0.15)}px`, color: '#555', fontFamily: 'monospace' }}>
                        🕐 12:00
                      </div>
                    )}
                    {r.type === 'text' && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100% - 22px)', fontSize: `${Math.min(18, r.height * SCALE * 0.08)}px`, color: '#555', padding: 8, textAlign: 'center', overflow: 'hidden' }}>
                        {r.content || 'Texto aqui'}
                      </div>
                    )}
                    {r.type === 'media' && r.mediaId && (
                      <div style={{ height: 'calc(100% - 22px)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <img src={`/api/media/${r.mediaId}/download`}
                             style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      </div>
                    )}

                    {/* Resize handle */}
                    <div onMouseDown={(e) => handleResizeStart(e, r.id)}
                         style={{
                           position: 'absolute', bottom: 0, right: 0,
                           width: 16, height: 16,
                           cursor: 'se-resize',
                           opacity: isSelected ? 1 : 0,
                           background: 'linear-gradient(135deg, transparent 50%, #FF0044 50%)',
                           borderBottomRightRadius: 3,
                         }} />
                  </div>
                );
              })}

              {regions.length === 0 && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: '0.9rem' }}>
                  Adicione regiões no painel ao lado
                </div>
              )}
            </div>
          ) : (
            /* Preview mode - fullscreen simulation */
            <div style={{
              position: 'relative',
              width: LW * SCALE, height: LH * SCALE,
              background: '#000',
              borderRadius: 8,
              overflow: 'hidden',
              boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
              flexShrink: 0,
            }}>
              {regions.map(r => (
                <div key={r.id} style={{
                  position: 'absolute',
                  left: r.x * SCALE, top: r.y * SCALE,
                  width: r.width * SCALE, height: r.height * SCALE,
                  overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {r.type === 'clock' && (
                    <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'monospace', color: '#FF0044' }}>
                      {new Date().toLocaleTimeString('pt-BR')}
                    </div>
                  )}
                  {r.type === 'text' && (
                    <div style={{ fontSize: '1.2rem', color: r.color || '#fff', padding: 10, textAlign: 'center' }}>
                      {r.content || 'Seu texto aqui'}
                    </div>
                  )}
                  {r.type === 'media' && r.mediaId && (
                    <img src={`/api/media/${r.mediaId}/download`}
                         style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Right sidebar */}
        <aside style={{ width: 280, background: '#1a1a1a', borderLeft: '1px solid #2a2a2a', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'auto', flexShrink: 0 }}>
          {/* Add region */}
          <div>
            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: 1 }}>Adicionar Região</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {REGION_TYPES.map(t => (
                <button key={t.type} onClick={() => addRegion(t.type)}
                  style={{ padding: '0.6rem 0.3rem', borderRadius: 6, border: `1px solid ${t.color}33`, background: `${t.color}11`, color: t.color, cursor: 'pointer', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <t.icon size={18} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Properties */}
          {selected && !previewMode && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                Propriedades
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input value={selected.name}
                  onChange={e => updateRegion(selected.id, { name: e.target.value })}
                  style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid #333', background: '#111', color: 'white', fontSize: '0.8rem' }}
                  placeholder="Nome da região" />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <div>
                    <label style={{ fontSize: '0.65rem', color: '#666', display: 'block', marginBottom: 2 }}>X</label>
                    <input type="number" value={Math.round(selected.x)}
                      onChange={e => updateRegion(selected.id, { x: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.4rem', borderRadius: 4, border: '1px solid #333', background: '#111', color: 'white', fontSize: '0.75rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.65rem', color: '#666', display: 'block', marginBottom: 2 }}>Y</label>
                    <input type="number" value={Math.round(selected.y)}
                      onChange={e => updateRegion(selected.id, { y: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.4rem', borderRadius: 4, border: '1px solid #333', background: '#111', color: 'white', fontSize: '0.75rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.65rem', color: '#666', display: 'block', marginBottom: 2 }}>Largura</label>
                    <input type="number" value={Math.round(selected.width)}
                      onChange={e => updateRegion(selected.id, { width: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.4rem', borderRadius: 4, border: '1px solid #333', background: '#111', color: 'white', fontSize: '0.75rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.65rem', color: '#666', display: 'block', marginBottom: 2 }}>Altura</label>
                    <input type="number" value={Math.round(selected.height)}
                      onChange={e => updateRegion(selected.id, { height: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.4rem', borderRadius: 4, border: '1px solid #333', background: '#111', color: 'white', fontSize: '0.75rem' }} />
                  </div>
                </div>

                {/* Type-specific settings */}
                {selected.type === 'text' && (
                  <>
                    <textarea value={selected.content || ''}
                      onChange={e => updateRegion(selected.id, { content: e.target.value })}
                      style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid #333', background: '#111', color: 'white', fontSize: '0.8rem', minHeight: 60, resize: 'vertical' }}
                      placeholder="Digite o texto..." />
                    <input type="color" value={selected.color || '#ffffff'}
                      onChange={e => updateRegion(selected.id, { color: e.target.value })}
                      style={{ width: '100%', height: 36, borderRadius: 6, border: '1px solid #333', background: '#111', cursor: 'pointer', padding: 2 }} />
                  </>
                )}

                {selected.type === 'media' && (
                  <div style={{ maxHeight: 200, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {media.length === 0 && <span style={{ color: '#555', fontSize: '0.75rem' }}>Nenhuma mídia. Faça upload primeiro.</span>}
                    {media.map(m => (
                      <div key={m.id} onClick={() => updateRegion(selected.id, { mediaId: m.id })}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: 6,
                          borderRadius: 6, cursor: 'pointer',
                          background: selected.mediaId === m.id ? 'rgba(255,0,68,0.15)' : 'transparent',
                          border: selected.mediaId === m.id ? '1px solid #FF0044' : '1px solid transparent',
                        }}>
                        <img src={`/api/media/${m.id}/download`}
                             style={{ width: 40, height: 28, borderRadius: 4, objectFit: 'cover' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                          <div style={{ fontSize: '0.6rem', color: '#555' }}>{m.width}×{m.height}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selected.type === 'web' && (
                  <input value={selected.url || ''}
                    onChange={e => updateRegion(selected.id, { url: e.target.value })}
                    style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid #333', background: '#111', color: 'white', fontSize: '0.8rem' }}
                    placeholder="https://..." />
                )}
              </div>
            </div>
          )}

          {!selected && !previewMode && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: '0.8rem' }}>
              Selecione uma região para editar
            </div>
          )}

          {/* Region list */}
          <div>
            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: 1 }}>
              Regiões ({regions.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {regions.map(r => (
                <div key={r.id} onClick={() => setSelectedId(r.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '0.3rem 0.5rem',
                    borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem',
                    background: selectedId === r.id ? 'rgba(255,0,68,0.12)' : 'transparent',
                    color: selectedId === r.id ? '#FF0044' : '#999',
                  }}>
                  {typeIcon(r.type)}
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                  <span style={{ color: '#555', fontSize: '0.65rem' }}>{Math.round(r.width)}×{Math.round(r.height)}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
