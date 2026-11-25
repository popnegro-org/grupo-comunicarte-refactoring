import test from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import { handleContactSubmission } from '../../src/server/contact.ts';

let requestSequence = 0;

function createRequest(body: Record<string, unknown>): Request {
  requestSequence += 1;
  return {
    method: 'POST',
    body,
    headers: { 'x-real-ip': `contact-test-${requestSequence}` },
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as Request;
}

function createResponse() {
  const result: { statusCode: number; body?: unknown } = { statusCode: 200 };
  const response = {
    status(code: number) {
      result.statusCode = code;
      return response;
    },
    json(body: unknown) {
      result.body = body;
      return response;
    },
  } as unknown as Response;
  return { response, result };
}

test('contact rejects missing required fields', async () => {
  const { response, result } = createResponse();
  await handleContactSubmission(createRequest({ name: 'María' }), response);
  assert.equal(result.statusCode, 400);
  assert.match(String((result.body as { message: string }).message), /nombre, email y mensaje/i);
});

test('contact acknowledges honeypot submissions without sending email', async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    return new Response(null, { status: 200 });
  }) as typeof fetch;
  try {
    const { response, result } = createResponse();
    await handleContactSubmission(createRequest({ website: 'bot-filled-field' }), response);
    assert.equal(result.statusCode, 200);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('contact validates email before calling Resend', async () => {
  const { response, result } = createResponse();
  await handleContactSubmission(createRequest({
    name: 'María Pérez',
    email: 'not-an-email',
    message: 'Consulta comercial de prueba',
  }), response);
  assert.equal(result.statusCode, 400);
  assert.match(String((result.body as { message: string }).message), /email válido/i);
});

test('contact sends escaped content to the configured commercial recipient', async () => {
  const previousApiKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.CONTACT_FROM;
  const originalFetch = globalThis.fetch;
  let sentPayload: Record<string, unknown> | undefined;

  process.env.RESEND_API_KEY = 'test-resend-key';
  process.env.CONTACT_FROM = 'Grupo Comunicarte <contacto@example.com>';
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    sentPayload = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({ id: 'test-email-id' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const { response, result } = createResponse();
    await handleContactSubmission(createRequest({
      name: '<script>alert(1)</script>',
      company: 'Agencia Ejemplo',
      email: 'CLIENTE@EXAMPLE.COM',
      phone: '+54 261 555 0101',
      message: 'Quiero una campaña de publicidad exterior.',
    }), response);

    assert.equal(result.statusCode, 200);
    assert.equal((result.body as { status: string }).status, 'success');
    assert.ok(sentPayload);
    assert.deepEqual(sentPayload.to, ['comercial@grupocomunicarte.com.ar']);
    assert.equal(sentPayload.reply_to, 'cliente@example.com');
    assert.match(String(sentPayload.html), /&lt;script&gt;/);
    assert.doesNotMatch(String(sentPayload.html), /<script>/);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousApiKey;
    if (previousFrom === undefined) delete process.env.CONTACT_FROM;
    else process.env.CONTACT_FROM = previousFrom;
  }
});
