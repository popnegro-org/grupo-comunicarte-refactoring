import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { allowLoginAttempt } from './src/server/loginRateLimit.ts';
import { initDatabase, pool } from './src/db/index.ts';
import { getAllSupportsFromDB, getSupportByIdFromDB } from './src/server/supportsService.ts';
import { handleMediakitRequest, getAllMediakitRequestsFromDB } from './src/server/mediakitService.ts';
import { saveMediaKit, getMediaKit, getMediaKitBySourceRequestId, listMediaKits, updateMediaKitStatus } from './src/server/mediakitManagementService.ts';
import { handleMediaUpload } from './src/server/multimediaUpload.ts';
import { adminAuthHeader, ADMIN_COOKIE, hasValidAdminMutationOrigin, isAllowedRequestOrigin } from './src/server/adminRequestSecurity.ts';
import {
  authenticateAdmin,
  getPublicSupportMediaAsset,
  verifyAdminToken,
  getAdminStats,
  updateRequestStatusByAdmin,
  listAdminSupports,
  getAdminSupportById,
  createAdminSupport,
  updateSupportByAdmin,
  deactivateSupportByAdmin,
  getSupportMediaByAdmin,
  addSupportMediaByAdmin,
  updateSupportMediaByAdmin,
  removeSupportMediaByAdmin,
  getSupportPricingByAdmin,
  listSupportPricingByAdmin,
  patchSupportPricingByAdmin,
  getSupportRouteByAdmin,
  patchSupportRouteByAdmin,
} from './src/server/adminService.ts';

function clientIp(req: express.Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

const ADMIN_COOKIE_MAX_AGE = 8 * 60 * 60;

export async function createApp() {
  const app = express();
  // Trust only the single Vercel ingress hop; never trust arbitrary client-supplied X-Forwarded-For values.
  app.set('trust proxy', process.env.VERCEL ? 1 : false);

  const configuredOrigins = (process.env.CORS_ORIGINS || 'https://grupocomunicarte.vercel.app,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  // Vercel assigns deployment-specific and branch-stable hostnames to Preview.
  // Trust only these platform-provided hostnames in addition to explicitly configured origins.
  const vercelOrigins = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
    .filter((hostname): hostname is string => Boolean(hostname?.trim()))
    .map((hostname) => `https://${hostname.trim()}`);
  const allowedOrigins = [...new Set([...configuredOrigins, ...vercelOrigins])];

  const isAllowedOrigin = (origin: string | undefined, requestOrigin: string): boolean => {
    if (!origin) return true;
    return isAllowedRequestOrigin(origin, allowedOrigins, requestOrigin);
  };

  app.use((req, res, next) => {
    const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
    const requestOrigin = `${req.protocol}://${req.get('host')}`;
    if (origin && !isAllowedOrigin(origin, requestOrigin) && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return res.status(403).json({ status: 'error', message: 'Origen no permitido.' });
    }

    if (origin && isAllowedOrigin(origin, requestOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    if (req.method === 'OPTIONS') {
      if (isAllowedOrigin(origin, requestOrigin)) {
        return res.sendStatus(204);
      }
      return res.sendStatus(403);
    }

    next();
  });

  app.use(express.json());

  try {
    await initDatabase();
  } catch (err) {
    console.warn('Database initialization warning on startup:', err);
  }

  // R2 remains private; public catalogue media is delivered through short-lived signed GET URLs.
  app.get('/api/media/:mediaId', async (req, res) => {
    try {
      const mediaId = Number(req.params.mediaId);
      const asset = await getPublicSupportMediaAsset(mediaId);
      if (!asset) return res.status(404).json({ status: 'error', message: 'Recurso multimedia no encontrado.' });
      const signedUrl = (await import('./src/server/r2StorageAdapter.ts')).getStorageAdapter().getAssetUrl(asset.storageKey, 300);
      res.setHeader('Cache-Control', 'private, max-age=60');
      res.setHeader('Referrer-Policy', 'no-referrer');
      if (asset.mimeType) res.setHeader('Content-Type', asset.mimeType);
      return res.redirect(302, signedUrl);
    } catch (error) {
      console.error('Error resolving private media asset:', error);
      return res.status(404).json({ status: 'error', message: 'Recurso multimedia no disponible.' });
    }
  });

  app.get('/api/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.status(200).json({ status: 'ok', database: 'connected' });
    } catch (err: any) {
      console.error('Database health check failed:', err);
      res.status(503).json({ status: 'error', database: 'disconnected' });
    }
  });

  app.get('/api/supports', async (_req, res) => {
    try {
      const supports = await getAllSupportsFromDB();
      res.status(200).json({ status: 'success', data: supports });
    } catch (err: any) {
      console.error('Error fetching supports:', err);
      res.status(500).json({ status: 'error', message: 'Error interno al obtener el inventario de soportes.' });
    }
  });

  app.get('/api/supports/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const support = await getSupportByIdFromDB(id);
      if (!support) {
        return res.status(404).json({ status: 'error', message: `Soporte con ID '${id}' no encontrado.` });
      }
      res.status(200).json({ status: 'success', data: support });
    } catch (err: any) {
      console.error(`Error fetching support ${req.params.id}:`, err);
      res.status(500).json({ status: 'error', message: 'Error interno al obtener el soporte.' });
    }
  });

  app.post('/api/mediakit/request', async (req, res) => {
    try {
      const result = await handleMediakitRequest(req.body);
      res.status(result.statusCode).json(result.response);
    } catch (err: any) {
      console.error('Error in /api/mediakit/request:', err);
      res.status(500).json({ status: 'error', message: 'Error interno del servidor.' });
    }
  });

  app.post('/api/admin/login', async (req, res) => {
    try {
      const allowed = await allowLoginAttempt(pool, clientIp(req), process.env.JWT_SECRET || process.env.ADMIN_SECRET || '');
      if (!allowed) {
        return res.status(429).json({
          status: 'error',
          message: 'Demasiados intentos de acceso. Probá de nuevo en unos minutos.',
        });
      }
    } catch (error) {
      console.error('Admin login rate limiter unavailable:', error);
      return res.status(503).json({ status: 'error', message: 'El acceso no está disponible temporalmente.' });
    }
    const { username, password } = req.body || {};
    const result = authenticateAdmin(username, password);
    if (!result.success) {
      return res.status(401).json({ status: 'error', message: result.message });
    }
    const secure = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    res.setHeader(
      'Set-Cookie',
      `${ADMIN_COOKIE}=${encodeURIComponent(result.token!)}; Path=/; Max-Age=${ADMIN_COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`,
    );
    res.status(200).json({ status: 'success', message: 'Autenticación exitosa' });
  });

  app.post('/api/admin/logout', (_req, res) => {
    const secure = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    res.setHeader(
      'Set-Cookie',
      `${ADMIN_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`,
    );
    res.status(200).json({ status: 'success', message: 'Sesión cerrada' });
  });

  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const requestOrigin = `${req.protocol}://${req.get('host')}`;
    if (!hasValidAdminMutationOrigin(req.headers, req.method, allowedOrigins, requestOrigin)) {
      return res.status(403).json({ status: 'error', message: 'Origen no permitido para modificar la sesión administrativa.' });
    }
    const authHeader = adminAuthHeader(req.headers);
    if (!verifyAdminToken(authHeader)) {
      return res.status(401).json({ status: 'error', message: 'No autorizado. Se requiere token de administrador válido.' });
    }
    next();
  };

  app.post(
    '/api/admin/supports/:id/media/upload',
    requireAdmin,
    express.raw({ type: 'multipart/form-data', limit: '10mb' }),
    handleMediaUpload,
  );

  app.get('/api/admin/stats', requireAdmin, async (_req, res) => {
    try {
      const stats = await getAdminStats();
      res.status(200).json({ status: 'success', data: stats });
    } catch (err: any) {
      console.error('Error fetching admin stats:', err);
      res.status(500).json({ status: 'error', message: 'Error interno al obtener estadísticas.' });
    }
  });

  app.get('/api/admin/supports', requireAdmin, async (_req, res) => {
    try {
      const supports = await listAdminSupports();
      res.status(200).json({ status: 'success', data: supports });
    } catch (err: any) {
      console.error('Error fetching admin supports:', err);
      res.status(500).json({ status: 'error', message: 'Error interno al obtener inventario.' });
    }
  });

  app.get('/api/admin/supports/:id', requireAdmin, async (req, res) => {
    try {
      const support = await getAdminSupportById(req.params.id);
      res.status(200).json({ status: 'success', data: support });
    } catch (err: any) {
      console.error(`Error fetching admin support ${req.params.id}:`, err);
      const msg = err.message || '';
      const status = msg.includes('no encontrado') ? 404 : 500;
      res.status(status).json({ status: 'error', message: msg || 'Error al obtener el soporte.' });
    }
  });

  app.post('/api/admin/supports', requireAdmin, async (req, res) => {
    try {
      const created = await createAdminSupport(req.body || {});
      res.status(201).json({ status: 'success', data: created, message: 'Soporte creado exitosamente.' });
    } catch (err: any) {
      console.error('Error creating admin support:', err);
      const msg = err.message || '';
      const status = msg.includes('vacío') || msg.includes('inválida') || msg.includes('desconocida') ? 400 : 500;
      res.status(status).json({ status: 'error', message: msg || 'Error al crear el soporte.' });
    }
  });

  app.patch('/api/admin/supports/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await updateSupportByAdmin(id, req.body);
      res.status(200).json({ status: 'success', data: updated, message: 'Soporte actualizado exitosamente.' });
    } catch (err: any) {
      console.error(`Error updating support ${req.params.id}:`, err);
      const msg = err.message || '';
      const status = msg.includes('no encontrado') ? 404 : msg.includes('inválido') ? 400 : 500;
      res.status(status).json({ status: 'error', message: msg || 'Error al actualizar el soporte.' });
    }
  });

  app.delete('/api/admin/supports/:id', requireAdmin, async (req, res) => {
    try {
      const result = await deactivateSupportByAdmin(req.params.id);
      res.status(200).json({ status: 'success', data: result, message: 'Soporte desactivado exitosamente.' });
    } catch (err: any) {
      console.error(`Error deleting support ${req.params.id}:`, err);
      const msg = err.message || '';
      const status = msg.includes('no encontrado') ? 404 : 500;
      res.status(status).json({ status: 'error', message: msg || 'Error al desactivar el soporte.' });
    }
  });

  app.get('/api/admin/supports/:id/media', requireAdmin, async (req, res) => {
    try {
      const media = await getSupportMediaByAdmin(req.params.id);
      res.status(200).json({ status: 'success', data: media });
    } catch (err: any) {
      console.error(`Error fetching admin support media ${req.params.id}:`, err);
      res.status(500).json({ status: 'error', message: 'Error al obtener media.' });
    }
  });

  app.post('/api/admin/supports/:id/media', requireAdmin, async (req, res) => {
    try {
      const created = await addSupportMediaByAdmin(req.params.id, req.body || {});
      res.status(201).json({ status: 'success', data: created });
    } catch (err: any) {
      console.error(`Error creating support media ${req.params.id}:`, err);
      const msg = err.message || '';
      const status = msg.includes('inválido') ? 400 : 500;
      res.status(status).json({ status: 'error', message: msg || 'Error al crear media.' });
    }
  });

  app.patch('/api/admin/supports/:id/media/:mediaId', requireAdmin, async (req, res) => {
    try {
      const mediaId = Number(req.params.mediaId);
      const updated = await updateSupportMediaByAdmin(req.params.id, mediaId, req.body || {});
      res.status(200).json({ status: 'success', data: updated });
    } catch (err: any) {
      console.error(`Error updating support media ${req.params.id}/${req.params.mediaId}:`, err);
      const msg = err.message || '';
      const status = msg.includes('no encontrada') ? 404 : msg.includes('inválido') ? 400 : 500;
      res.status(status).json({ status: 'error', message: msg || 'Error al actualizar media.' });
    }
  });

  app.delete('/api/admin/supports/:id/media/:mediaId', requireAdmin, async (req, res) => {
    try {
      const mediaId = Number(req.params.mediaId);
      const deleted = await removeSupportMediaByAdmin(req.params.id, mediaId);
      res.status(200).json({ status: 'success', data: deleted });
    } catch (err: any) {
      console.error(`Error deleting support media ${req.params.id}/${req.params.mediaId}:`, err);
      const msg = err.message || '';
      const status = msg.includes('no encontrada') ? 404 : 500;
      res.status(status).json({ status: 'error', message: msg || 'Error al eliminar media.' });
    }
  });

  app.get('/api/admin/support-pricing', requireAdmin, async (_req, res) => {
    try {
      const pricing = await listSupportPricingByAdmin();
      res.status(200).json({ status: 'success', data: pricing });
    } catch (err) {
      console.error('Error fetching admin support pricing catalog:', err);
      res.status(500).json({ status: 'error', message: 'Error al obtener las tarifas internas.' });
    }
  });

  app.get('/api/admin/supports/:id/pricing', requireAdmin, async (req, res) => {
    try {
      const pricing = await getSupportPricingByAdmin(req.params.id);
      res.status(200).json({ status: 'success', data: pricing });
    } catch (err: any) {
      console.error(`Error fetching admin support pricing ${req.params.id}:`, err);
      res.status(500).json({ status: 'error', message: 'Error al obtener pricing.' });
    }
  });

  app.patch('/api/admin/supports/:id/pricing', requireAdmin, async (req, res) => {
    try {
      const pricing = await patchSupportPricingByAdmin(req.params.id, req.body || {});
      res.status(200).json({ status: 'success', data: pricing });
    } catch (err: any) {
      console.error(`Error updating support pricing ${req.params.id}:`, err);
      const msg = err.message || '';
      const status = msg.includes('negativo') || msg.includes('inválido') ? 400 : 500;
      res.status(status).json({ status: 'error', message: msg || 'Error al actualizar el pricing.' });
    }
  });

  app.get('/api/admin/supports/:id/route', requireAdmin, async (req, res) => {
    try {
      const route = await getSupportRouteByAdmin(req.params.id);
      res.status(200).json({ status: 'success', data: route });
    } catch (err: any) {
      console.error(`Error fetching admin support route ${req.params.id}:`, err);
      res.status(500).json({ status: 'error', message: 'Error al obtener la ruta.' });
    }
  });

  app.patch('/api/admin/supports/:id/route', requireAdmin, async (req, res) => {
    try {
      const route = await patchSupportRouteByAdmin(req.params.id, req.body || {});
      res.status(200).json({ status: 'success', data: route });
    } catch (err: any) {
      console.error(`Error updating admin support route ${req.params.id}:`, err);
      const msg = err.message || '';
      const status = msg.includes('inválido') ? 400 : 500;
      res.status(status).json({ status: 'error', message: msg || 'Error al actualizar la ruta.' });
    }
  });

  app.get('/api/admin/mediakits', requireAdmin, async (_req, res) => {
    try {
      const kits = await listMediaKits();
      res.status(200).json({ status: 'success', data: kits });
    } catch (err: any) {
      console.error('Error fetching media kits:', err);
      res.status(500).json({ status: 'error', message: 'Error interno al obtener Media Kits.' });
    }
  });

  app.get('/api/admin/mediakits/by-request/:requestId', requireAdmin, async (req, res) => {
    try {
      const kit = await getMediaKitBySourceRequestId(req.params.requestId);
      if (!kit) return res.status(404).json({ status: 'error', message: 'Media Kit asociado no encontrado.' });
      res.status(200).json({ status: 'success', data: kit });
    } catch (err: any) {
      console.error(`Error fetching Media Kit for request ${req.params.requestId}:`, err);
      res.status(500).json({ status: 'error', message: 'Error interno al obtener el Media Kit asociado.' });
    }
  });

  app.get('/api/admin/mediakits/:kitId', requireAdmin, async (req, res) => {
    try {
      const kit = await getMediaKit(req.params.kitId);
      if (!kit) return res.status(404).json({ status: 'error', message: 'Media Kit no encontrado.' });
      res.status(200).json({ status: 'success', data: kit });
    } catch (err: any) {
      console.error(`Error fetching media kit ${req.params.kitId}:`, err);
      res.status(500).json({ status: 'error', message: 'Error interno al obtener el Media Kit.' });
    }
  });

  app.post('/api/admin/mediakits', requireAdmin, async (req, res) => {
    try {
      const kit = await saveMediaKit(req.body || {});
      res.status(201).json({ status: 'success', data: kit, message: 'Media Kit guardado.' });
    } catch (err: any) {
      console.error('Error saving media kit:', err);
      const msg = err.message || 'Error al guardar el Media Kit.';
      res.status(msg.includes('obligatorio') || msg.includes('requiere') ? 400 : 500).json({ status: 'error', message: msg });
    }
  });

  app.patch('/api/admin/mediakits/:kitId/status', requireAdmin, async (req, res) => {
    try {
      const kit = await updateMediaKitStatus(req.params.kitId, req.body?.status);
      if (!kit) return res.status(404).json({ status: 'error', message: 'Media Kit no encontrado.' });
      res.status(200).json({ status: 'success', data: kit, message: 'Estado del Media Kit actualizado.' });
    } catch (err: any) {
      console.error(`Error updating media kit ${req.params.kitId}:`, err);
      res.status(400).json({ status: 'error', message: err.message || 'Error al actualizar el Media Kit.' });
    }
  });

  app.get('/api/admin/requests', requireAdmin, async (_req, res) => {
    try {
      const requests = await getAllMediakitRequestsFromDB();
      res.status(200).json({ status: 'success', data: requests });
    } catch (err: any) {
      console.error('Error fetching admin requests:', err);
      res.status(500).json({ status: 'error', message: 'Error interno al obtener solicitudes.' });
    }
  });

  app.patch('/api/admin/requests/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body || {};
      const updated = await updateRequestStatusByAdmin(id, status);
      res.status(200).json({ status: 'success', data: updated, message: 'Estado de solicitud actualizado.' });
    } catch (err: any) {
      console.error(`Error updating request ${req.params.id}:`, err);
      const msg = err.message || '';
      const statusCode = msg.includes('no encontrada') ? 404 : msg.includes('inválido') ? 400 : msg.includes('no puede avanzar comercialmente') ? 409 : 500;
      res.status(statusCode).json({ status: 'error', message: msg || 'Error al actualizar la solicitud.' });
    }
  });

  if (process.env.VERCEL) {
    return app;
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

if (!process.env.VERCEL) {
  createApp()
    .then((app) => {
      const PORT = 3000;
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://0.0.0.0:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
}
