import type { Request, Response } from 'express';

const CONTACT_TO = 'comercial@grupocomunicarte.com.ar';
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const requestsByIp = new Map<string, { count: number; resetAt: number }>();

function clientIp(req: Request): string {
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) return realIp.trim();

  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();

  return req.socket.remoteAddress || 'unknown';
}

function allowRequest(ip: string): boolean {
  const now = Date.now();

  for (const [key, entry] of requestsByIp) {
    if (now > entry.resetAt) requestsByIp.delete(key);
  }

  const current = requestsByIp.get(ip);
  if (!current || now > current.resetAt) {
    requestsByIp.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (current.count >= RATE_LIMIT_MAX) return false;
  current.count += 1;
  return true;
}

function text(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return value.replace(/[&<>"']/g, (character) => entities[character] || character);
}

export async function handleContactSubmission(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Método no permitido.' });
  }

  const ip = clientIp(req);
  if (!allowRequest(ip)) {
    return res.status(429).json({
      status: 'error',
      message: 'Recibimos demasiadas consultas desde esta conexión. Probá nuevamente más tarde.',
    });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  // Honeypot: acknowledge automated submissions without sending email.
  if (text(body.website, 200)) {
    return res.status(200).json({ status: 'success', message: 'Consulta recibida.' });
  }

  const name = text(body.name, 120);
  const company = text(body.company, 160);
  const email = text(body.email, 254).toLowerCase();
  const phone = text(body.phone, 50);
  const message = text(body.message, 3000);

  if (!name || !email || !message) {
    return res.status(400).json({ status: 'error', message: 'Completá nombre, email y mensaje.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ status: 'error', message: 'Ingresá un email válido.' });
  }

  if (name.length < 2 || message.length < 10) {
    return res.status(400).json({ status: 'error', message: 'Revisá el nombre y escribí un mensaje de al menos 10 caracteres.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM;

  if (!apiKey || !from) {
    console.error('Contact email is not configured: RESEND_API_KEY or CONTACT_FROM is missing.');
    return res.status(503).json({
      status: 'error',
      message: 'El formulario todavía no está configurado. Escribinos directamente por email o WhatsApp.',
    });
  }

  const rows = [
    ['Nombre y apellido', name],
    ['Empresa', company || 'No especificada'],
    ['Email', email],
    ['Teléfono', phone || 'No especificado'],
    ['Mensaje', message],
  ];

  const html = rows.map(([label, value]) =>
    `<p><strong>${escapeHtml(label)}:</strong><br />${escapeHtml(value).replace(/\n/g, '<br />')}</p>`,
  ).join('');

  let response: Response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [CONTACT_TO],
        reply_to: email,
        subject: 'Nueva consulta comercial — Grupo Comunicarte',
        html: `<h2>Nueva consulta desde el sitio web</h2>${html}`,
        text: rows.map(([label, value]) => `${label}:\n${value}`).join('\n\n'),
      }),
    });
  } catch (error) {
    console.error('Resend request failed:', error instanceof Error ? error.message : 'Unknown network error');
    return res.status(502).json({
      status: 'error',
      message: 'No pudimos conectar con el servicio de correo. Probá nuevamente o contactanos por email.',
    });
  }

  if (!response.ok) {
    const providerError = await response.text().catch(() => '');
    console.error('Resend rejected contact email:', response.status, providerError.slice(0, 500));
    return res.status(502).json({
      status: 'error',
      message: 'No pudimos enviar tu consulta en este momento. Probá nuevamente o contactanos por email.',
    });
  }

  return res.status(200).json({
    status: 'success',
    message: 'Tu consulta fue enviada. Nos pondremos en contacto a la brevedad.',
  });
}
