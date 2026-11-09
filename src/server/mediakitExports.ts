import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import {
  attachMediaKitExport,
  getMediaKit,
  getMediaKitExportStorageKey,
  removeMediaKitExport,
  type MediaKitExportFormat,
} from './mediakitManagementService';
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_UPLOAD_BYTES,
  createMediaKitAssetKey,
  getStorageAdapter,
} from './r2StorageAdapter';

const MIME_BY_FORMAT: Record<MediaKitExportFormat, string> = {
  pdf: 'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

function parseFormat(value: string | undefined): MediaKitExportFormat | null {
  return value === 'pdf' || value === 'pptx' ? value : null;
}

function safeKitSegment(kitId: string): string {
  return kitId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 100);
}

export function isValidMediaKitExportPayload(format: MediaKitExportFormat, body: Buffer): boolean {
  if (format === 'pdf') return body.subarray(0, 5).toString('ascii') === '%PDF-';
  return body.length >= 4 && body[0] === 0x50 && body[1] === 0x4b && body[2] === 0x03 && body[3] === 0x04;
}

export async function handleMediaKitExportUpload(req: Request, res: Response) {
  let uploadedKey: string | null = null;
  try {
    const kitId = String(req.params.kitId || '').trim();
    const format = parseFormat(req.params.format);
    if (!kitId || !format) {
      return res.status(400).json({ status: 'error', message: 'Media Kit y formato PDF/PPTX requeridos.' });
    }

    const contentType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (!ALLOWED_DOCUMENT_MIME_TYPES.has(contentType) || contentType !== MIME_BY_FORMAT[format]) {
      return res.status(415).json({ status: 'error', message: 'El MIME no coincide con el formato solicitado.' });
    }

    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (body.length === 0) return res.status(400).json({ status: 'error', message: 'El archivo está vacío.' });
    if (body.length > MAX_DOCUMENT_UPLOAD_BYTES) {
      return res.status(413).json({ status: 'error', message: 'El documento supera el límite de 4 MB.' });
    }
    if (!isValidMediaKitExportPayload(format, body)) {
      return res.status(415).json({ status: 'error', message: 'El contenido del archivo no coincide con el formato declarado.' });
    }

    const kit = await getMediaKit(kitId);
    if (!kit) return res.status(404).json({ status: 'error', message: 'Media Kit no encontrado.' });
    if (kit.status !== 'ready') {
      return res.status(409).json({ status: 'error', message: 'Guardá el Media Kit como listo antes de persistir sus documentos.' });
    }

    const key = createMediaKitAssetKey(kitId, format);
    const uploaded = await getStorageAdapter().upload({ key, body, contentType });
    uploadedKey = uploaded.key;
    const sha256 = crypto.createHash('sha256').update(body).digest('hex');
    const saved = await attachMediaKitExport(kitId, format, uploaded.key, contentType, body.length, sha256);
    if (!saved) {
      await getStorageAdapter().delete(uploaded.key);
      uploadedKey = null;
      return res.status(404).json({ status: 'error', message: 'No se pudo asociar el documento al Media Kit.' });
    }

    if (saved.previousStorageKey && saved.previousStorageKey !== uploaded.key) {
      try {
        await getStorageAdapter().delete(saved.previousStorageKey);
      } catch (cleanupError) {
        console.error('Could not remove previous Media Kit export object:', cleanupError);
      }
    }
    uploadedKey = null;
    return res.status(201).json({
      status: 'success',
      data: {
        format,
        url: saved.url,
        size: body.length,
        sha256,
      },
    });
  } catch (error: any) {
    if (uploadedKey) {
      try { await getStorageAdapter().delete(uploadedKey); } catch (cleanupError) {
        console.error('Could not clean up failed Media Kit export upload:', cleanupError);
      }
    }
    console.error('Error persisting Media Kit export:', error);
    return res.status(503).json({ status: 'error', message: 'No se pudo persistir el documento del Media Kit.' });
  }
}

export async function handleMediaKitExportDownload(req: Request, res: Response) {
  try {
    const kitId = String(req.params.kitId || '').trim();
    const format = parseFormat(req.params.format);
    if (!kitId || !format) return res.status(400).json({ status: 'error', message: 'Formato PDF/PPTX inválido.' });

    const key = await getMediaKitExportStorageKey(kitId, format);
    const expectedPrefix = `mediakit/${safeKitSegment(kitId)}/exports/`;
    if (!key || !key.startsWith(expectedPrefix) || key.split('/').some((segment) => !segment || segment === '.' || segment === '..' || segment.includes('\\\\'))) {
      return res.status(404).json({ status: 'error', message: 'Documento del Media Kit no encontrado.' });
    }

    const signedUrl = getStorageAdapter().getAssetUrl(key, 300);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    return res.redirect(302, signedUrl);
  } catch (error) {
    console.error('Error resolving Media Kit export:', error);
    return res.status(404).json({ status: 'error', message: 'Documento del Media Kit no disponible.' });
  }
}

export async function handleMediaKitExportDelete(req: Request, res: Response) {
  try {
    const kitId = String(req.params.kitId || '').trim();
    const format = parseFormat(req.params.format);
    if (!kitId || !format) return res.status(400).json({ status: 'error', message: 'Formato PDF/PPTX inválido.' });

    const existingKey = await getMediaKitExportStorageKey(kitId, format);
    if (!existingKey) return res.status(404).json({ status: 'error', message: 'Documento del Media Kit no encontrado.' });
    if (!existingKey.startsWith(`mediakit/${safeKitSegment(kitId)}/exports/`)) {
      return res.status(409).json({ status: 'error', message: 'La referencia de almacenamiento no pertenece al Media Kit.' });
    }
    const key = await removeMediaKitExport(kitId, format);
    if (!key) return res.status(409).json({ status: 'error', message: 'No se pudo liberar la referencia del documento.' });
    await getStorageAdapter().delete(key);
    return res.status(200).json({ status: 'success', data: { format, removed: true } });
  } catch (error) {
    console.error('Error deleting Media Kit export:', error);
    return res.status(503).json({ status: 'error', message: 'No se pudo eliminar el documento del Media Kit.' });
  }
}
