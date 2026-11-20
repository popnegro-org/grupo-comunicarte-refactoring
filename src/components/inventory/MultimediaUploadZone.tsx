import React, { useRef, useState } from 'react';
import { UploadCloud, Loader2, Trash2, Video, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { apiFetch } from '../../lib/api';

interface MultimediaUploadZoneProps {
  canonicalId?: string;
  url: string;
  kind: 'image' | 'video';
  label: string;
  description: string;
  onUrlChange: (url: string, kind: 'image' | 'video') => void;
  onClear: () => void;
}
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']);
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export function MultimediaUploadZone({ canonicalId, url, kind, label, description, onUrlChange, onClear }: MultimediaUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const validateAndUploadFile = async (file: File) => {
    setError(null);
    if (!canonicalId || canonicalId === 'preview') return setError('Guardá el soporte primero para poder subir archivos a R2.');
    if (!ALLOWED_MIME_TYPES.has(file.type)) return setError('Formato no permitido. Subí JPG, PNG, WebP o videos MP4, WebM, MOV.');
    if (file.size > MAX_SIZE_BYTES) return setError(`El archivo supera el límite de ${MAX_SIZE_MB}MB.`);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiFetch(`/api/admin/supports/${encodeURIComponent(canonicalId)}/media/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const resJson = await response.json();
      if (!response.ok || resJson.status !== 'success') throw new Error(resJson.message || 'Error en el servidor al subir.');
      onUrlChange(resJson.data.url, file.type.startsWith('video/') ? 'video' : 'image');
    } catch (err: any) {
      setError(err?.message || 'Error al conectar con el servidor.');
    } finally {
      setUploading(false);
    }
  };
  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true); else if (e.type === 'dragleave') setDragActive(false); };
  const handleDrop = async (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files?.[0]) await validateAndUploadFile(e.dataTransfer.files[0]); };
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) await validateAndUploadFile(e.target.files[0]); };
  const handleButtonClick = () => fileInputRef.current?.click();
  const isR2Ready = Boolean(canonicalId && canonicalId !== 'preview');
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs">
      <div className="flex items-center justify-between"><div><span className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</span><p className="mt-0.5 text-xs text-gray-500">{description}</p></div>{kind === 'video' ? <Video className="h-5 w-5 text-gray-600" /> : <ImageIcon className="h-5 w-5 text-gray-600" />}</div>
      <div className="mt-3">{url ? <div className="relative overflow-hidden rounded-lg border border-gray-100 bg-gray-50 p-2"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3">{kind === 'video' ? <div className="relative flex aspect-video w-24 items-center justify-center overflow-hidden rounded border border-gray-200 bg-black"><video src={url} className="h-full w-full object-cover" muted playsInline /><div className="absolute inset-0 flex items-center justify-center bg-black/20"><Video className="h-4 w-4 text-white" /></div></div> : <div className="aspect-video w-24 overflow-hidden rounded border border-gray-200 bg-white"><img src={url} alt="Previsualización" className="h-full w-full object-cover" referrerPolicy="no-referrer" /></div>}<div className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-gray-700">{url}</span><span className="mt-0.5 block text-[10px] font-bold uppercase text-gray-600">{kind === 'video' ? 'Video' : 'Imagen'} cargada</span></div></div><div className="flex items-center gap-2 self-end sm:self-center">{isR2Ready && <button type="button" onClick={handleButtonClick} disabled={uploading} className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-gray-900 sm:min-h-[32px]">Reemplazar</button>}<button type="button" onClick={onClear} className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 sm:min-h-[32px]" aria-label="Eliminar"><Trash2 className="h-4 w-4" /></button></div></div></div> : <div onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop} className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition ${dragActive ? 'border-emerald-500 bg-emerald-50/30' : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50'}`}>{uploading ? <div className="flex flex-col items-center py-2"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /><span className="mt-2 text-xs font-semibold text-gray-700">Subiendo archivo a R2...</span><span className="mt-0.5 text-[10px] text-gray-600">Por favor no cierres el editor</span></div> : <div className="flex flex-col items-center"><div className="rounded-full border border-gray-100 bg-white p-2.5 shadow-3xs"><UploadCloud className="h-5 w-5 text-gray-600" /></div>{isR2Ready ? <><p className="mt-3 text-xs font-bold text-gray-700">Arrastrá tu archivo o <button type="button" onClick={handleButtonClick} className="text-emerald-700 hover:underline">buscalo en tu equipo</button></p><p className="mt-1 text-[10px] text-gray-600">Formatos: JPG, PNG, WebP, MP4, WebM (Máx. 10MB)</p></> : <><p className="mt-3 text-xs font-bold text-gray-500">Uploader R2 inactivo en modo creación</p><p className="mt-1 max-w-[280px] mx-auto text-[10px] font-semibold text-amber-600">Guardá el soporte primero para habilitar el upload directo a R2.</p></>}</div>}</div>}</div>
      <input ref={fileInputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" onChange={handleFileChange} disabled={uploading || !isR2Ready} />
      {error && <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-2.5 text-xs text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" /><span className="font-semibold">{error}</span></div>}
      <div className="mt-3 border-t border-gray-100 pt-3"><label htmlFor={`media-url-${kind}`} className="text-[10px] font-bold uppercase tracking-wider text-gray-600">URL Manual (Compatibilidad)</label><input id={`media-url-${kind}`} type="text" placeholder="Ingresá o editá la URL del recurso manualmente..." className="mt-1 h-8 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-xs text-gray-700 outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10" value={url} onChange={(e) => { const val=e.target.value; onUrlChange(val, /\.(mp4|webm|mov)(\?|$)/i.test(val) ? 'video' : 'image'); }} /></div>
    </div>
  );
}