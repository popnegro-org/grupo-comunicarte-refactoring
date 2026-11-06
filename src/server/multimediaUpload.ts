import type { Request, Response } from 'express';
import { addSupportMediaByAdmin, getSupportMediaByAdmin, removeSupportMediaByAdmin, updateSupportMediaByAdmin } from './adminService';
import { ALLOWED_MEDIA_MIME_TYPES, createAssetKey, getStorageAdapter, MAX_UPLOAD_BYTES } from './r2StorageAdapter';
import { matchesMediaSignature } from './mediaSignature';

interface MultipartMedia { filename: string; contentType: string; data: Buffer; }

function parseContentDisposition(value: string): { name?: string; filename?: string } {
  const name = /(?:^|;)\s*name="([^"]*)"/i.exec(value)?.[1];
  const filename = /(?:^|;)\s*filename="([^"]*)"/i.exec(value)?.[1];
  return { name, filename };
}

function parseMultipartMedia(body: Buffer, contentTypeHeader: string): MultipartMedia {
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentTypeHeader);
  if (!boundaryMatch) throw new Error('Multipart inválido: falta boundary.');
  const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`);
  const separator = Buffer.from('\r\n\r\n');
  let cursor = 0;

  while (cursor < body.length) {
    const start = body.indexOf(boundary, cursor);
    if (start === -1) break;
    const partStart = start + boundary.length;
    if (body.slice(partStart, partStart + 2).equals(Buffer.from('--'))) break;
    const headerStart = body.slice(partStart, partStart + 2).equals(Buffer.from('\r\n')) ? partStart + 2 : partStart;
    const headerEnd = body.indexOf(separator, headerStart);
    if (headerEnd === -1) throw new Error('Multipart inválido: headers incompletos.');

    const headerMap = new Map<string, string>();
    for (const line of body.slice(headerStart, headerEnd).toString('utf8').split('\r\n')) {
      const colon = line.indexOf(':');
      if (colon > 0) headerMap.set(line.slice(0, colon).trim().toLowerCase(), line.slice(colon + 1).trim());
    }
    const disposition = parseContentDisposition(headerMap.get('content-disposition') || '');
    const dataStart = headerEnd + separator.length;
    const nextBoundary = body.indexOf(boundary, dataStart);
    if (nextBoundary === -1) throw new Error('Multipart inválido: boundary final ausente.');
    const dataEnd = nextBoundary >= 2 && body.slice(nextBoundary - 2, nextBoundary).equals(Buffer.from('\r\n')) ? nextBoundary - 2 : nextBoundary;

    if (disposition.filename && disposition.name && ['file', 'media', 'image'].includes(disposition.name)) {
      return {
        filename: disposition.filename,
        contentType: headerMap.get('content-type') || 'application/octet-stream',
        data: body.slice(dataStart, dataEnd),
      };
    }
    cursor = nextBoundary;
  }
  throw new Error('No se encontró un recurso multimedia en el campo multipart file/media/image.');
}

export async function handleMediaUpload(req: Request, res: Response) {
  try {
    const canonicalId = req.params.id?.trim();
    if (!canonicalId) return res.status(400).json({ status: 'error', message: 'canonical_id requerido.' });
    const contentTypeHeader = req.headers['content-type'];
    if (!contentTypeHeader || !contentTypeHeader.toLowerCase().startsWith('multipart/form-data')) {
      return res.status(415).json({ status: 'error', message: 'Se requiere multipart/form-data.' });
    }
    const body = Buffer.isBuffer(req.body) ? req.body : null;
    if (!body || body.length === 0) return res.status(400).json({ status: 'error', message: 'El upload está vacío.' });
    if (body.length > MAX_UPLOAD_BYTES + 4096) return res.status(413).json({ status: 'error', message: 'El archivo excede el límite máximo permitido.' });

    const media = parseMultipartMedia(body, contentTypeHeader);
    const mimeType = media.contentType.toLowerCase();
    if (!ALLOWED_MEDIA_MIME_TYPES.has(mimeType)) return res.status(415).json({ status: 'error', message: `MIME no permitido: ${mimeType}.` });
    if (media.data.length === 0) return res.status(400).json({ status: 'error', message: 'El archivo está vacío.' });
    if (media.data.length > MAX_UPLOAD_BYTES) return res.status(413).json({ status: 'error', message: 'El archivo excede el límite máximo permitido.' });
    if (!matchesMediaSignature(media.data, mimeType)) return res.status(415).json({ status: 'error', message: 'El contenido del archivo no coincide con el MIME declarado.' });

    const existing = await getSupportMediaByAdmin(canonicalId);
    const sortOrder = existing.reduce((max: number, item: any) => Math.max(max, Number(item.sort_order ?? item.sortOrder ?? 0)), -1) + 1;
    const role = sortOrder === 0 ? 'cover' : 'gallery';
    const key = createAssetKey(canonicalId, mimeType, role);
    const uploaded = await getStorageAdapter().upload({ key, body: media.data, contentType: mimeType });

    let createdMediaId: number | undefined;
    try {
      const created = await addSupportMediaByAdmin(canonicalId, {
        media_type: mimeType.startsWith('video/') ? 'video' : 'image',
        url: uploaded.url,
        mime_type: mimeType,
        sort_order: sortOrder,
        title: media.filename.replace(/\.[^.]+$/, ''),
        alt: media.filename.replace(/\.[^.]+$/, ''),
        metadata: { storage_key: uploaded.key, original_filename: media.filename, role },
        active: true,
      });
      createdMediaId = created.id;
      const publicRoute = `/api/media/${created.id}`;
      const persisted = await updateSupportMediaByAdmin(canonicalId, created.id, {
        url: publicRoute,
        metadata: { storage_key: uploaded.key, original_filename: media.filename, role },
      });
      return res.status(201).json({ status: 'success', data: persisted });
    } catch (dbError) {
      if (createdMediaId) {
        try { await removeSupportMediaByAdmin(canonicalId, createdMediaId); } catch (cleanupError) { console.error('Support media cleanup after URL persistence failure:', cleanupError); }
      }
      try { await getStorageAdapter().delete(uploaded.key); } catch (cleanupError) { console.error('R2 cleanup after support_media failure failed:', cleanupError); }
      throw dbError;
    }
  } catch (error: any) {
    console.error('Error uploading support media:', error);
    const message = error?.message || 'Error interno al subir el recurso multimedia.';
    const status = /no encontrado/i.test(message) ? 404 : /MIME|Multipart|archivo|canonical_id/i.test(message) ? 400 : 500;
    return res.status(status).json({ status: 'error', message });
  }
}

export const handleImageUpload = handleMediaUpload;
