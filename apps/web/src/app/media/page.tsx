'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Upload, Image, Trash2, Search, LogOut } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface MediaItem {
  id: string;
  name: string;
  fileName: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export default function MediaPage() {
  const router = useRouter();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [preview, setPreview] = useState<MediaItem | null>(null);

  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    const token = getToken();
    const userData = localStorage.getItem('user');
    if (!token) { router.push('/login'); return; }
    if (userData) setUser(JSON.parse(userData));
    loadMedia();
  }, []);

  const loadMedia = async (q?: string) => {
    try {
      const token = getToken();
      const res = await axios.get(`/api/media${q ? `?search=${q}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMedia(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const token = getToken();
    setUploading(true);
    for (const file of acceptedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        await axios.post(`/api/media/upload`, formData, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        });
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }
    setUploading(false);
    loadMedia(search);
  }, [search]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'], 'video/*': ['.mp4', '.webm', '.mov'] },
  });

  const removeMedia = async (id: string) => {
    const token = getToken();
    try {
      await axios.delete(`/api/media/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMedia((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (mime: string) => mime.startsWith('image/');
  const getThumbUrl = (item: MediaItem) =>
    `/api/media/${item.id}/download`;

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
          <h2 className="text-xl font-semibold">Biblioteca de Mídias</h2>
          <span className="text-sm text-gray-500">{media.length} arquivos</span>
        </div>

        {/* Upload zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 mb-6 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-[#FF0044] bg-red-50' : 'border-gray-300 hover:border-[#FF0044]'
          }`}
        >
          <input {...getInputProps()} />
          <Upload size={32} className="mx-auto mb-2 text-gray-400" />
          <p className="text-gray-600 font-medium">
            {uploading ? 'Enviando...' : isDragActive ? 'Solte os arquivos aqui' : 'Arraste arquivos ou clique para selecionar'}
          </p>
          <p className="text-sm text-gray-400 mt-1">PNG, JPG, GIF, WebP, MP4, WebM, MOV — até 500MB</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); loadMedia(e.target.value); }}
            placeholder="Buscar mídia..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF0044] focus:border-transparent outline-none"
          />
        </div>

        {/* Media grid */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Carregando...</div>
        ) : media.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Image size={48} className="mx-auto mb-3 opacity-50" />
            <p>Nenhuma mídia encontrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {media.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group"
              >
                <div className="aspect-video bg-gray-100 relative overflow-hidden cursor-pointer"
                     onClick={() => setPreview(item)}>
                  {isImage(item.mimeType) ? (
                    <img src={getThumbUrl(item)} alt={item.name}
                         className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-3xl">🎬</span>
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeMedia(item.id); }}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-gray-400">{formatSize(item.size)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
             onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl overflow-hidden max-w-2xl w-full"
               onClick={(e) => e.stopPropagation()}>
            {isImage(preview.mimeType) ? (
              <img src={`/api/media/${preview.id}/download`}
                   alt={preview.name} className="w-full max-h-[70vh] object-contain bg-gray-900" />
            ) : (
              <video src={`/api/media/${preview.id}/download`}
                     controls className="w-full max-h-[70vh]" />
            )}
            <div className="p-4">
              <h3 className="font-semibold">{preview.name}</h3>
              <p className="text-sm text-gray-500">{formatSize(preview.size)} · {preview.mimeType}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
