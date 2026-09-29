import type { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../config/logger';
import { SessionManager } from '../core/session-manager';

const manager = SessionManager.getInstance();

// ── Schemas de Validação ──────────────────────────────────────────────────────

const CreateInstanceSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, 'name must be alphanumeric with hyphens/underscores only'),
  webhook: z
    .object({
      url: z.string().url('webhook.url must be a valid URL'),
      enabled: z.boolean().default(true),
      maxRetries: z.number().int().min(0).max(10).default(3),
    })
    .optional(),
  usePairingCode: z.boolean().default(false),
  phoneNumber: z.string().optional(),
});

const WebhookSchema = z.object({
  url: z.string().url('url must be a valid URL'),
  enabled: z.boolean().default(true),
  maxRetries: z.number().int().min(0).max(10).default(3),
});

const PairingCodeSchema = z.object({
  phone: z
    .string()
    .min(8)
    .transform((v) => v.replace(/\D/g, '')),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function validateBody<T>(schema: z.ZodSchema<T>, body: unknown, res: Response): T | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
    return null;
  }
  return result.data;
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * GET /instances
 * Lista todas as instâncias ativas com seus estados.
 */
export function listInstances(req: Request, res: Response): void {
  const instances = manager.listAll();
  res.json({
    success: true,
    count: instances.length,
    instances,
  });
}

/**
 * POST /instances
 * Cria e conecta uma nova instância WhatsApp.
 */
export async function createInstance(req: Request, res: Response): Promise<void> {
  const body = validateBody(CreateInstanceSchema, req.body, res);
  if (!body) return;

  if (body.usePairingCode && !body.phoneNumber) {
    res.status(400).json({
      success: false,
      error: 'phoneNumber is required when usePairingCode is true',
    });
    return;
  }

  try {
    const session = await manager.createAndConnect({
      name: body.name,
      ...(body.webhook !== undefined && {
        webhook: {
          url: body.webhook.url,
          enabled: body.webhook.enabled ?? true,
          maxRetries: body.webhook.maxRetries ?? 3,
        },
      }),
      usePairingCode: body.usePairingCode ?? false,
      ...(body.phoneNumber !== undefined && { phoneNumber: body.phoneNumber }),
    });

    res.status(201).json({
      success: true,
      message: body.usePairingCode
        ? 'Instance created — check the pairing code response'
        : 'Instance created — scan the QR code at GET /instances/:name/qr',
      instance: session.toState(),
    });
  } catch (err) {
    const message = (err as Error).message;
    logger.warn({ name: body.name, error: message }, 'Failed to create instance');
    res.status(409).json({ success: false, error: message });
  }
}

/**
 * GET /instances/:name
 * Retorna o estado detalhado de uma instância.
 */
export function getInstance(req: Request, res: Response): void {
  const { name } = req.params as { name: string };
  const session = manager.get(name);

  if (!session) {
    res.status(404).json({ success: false, error: `Instance '${name}' not found` });
    return;
  }

  res.json({ success: true, instance: session.toState() });
}

/**
 * POST /instances/:name/connect
 * Conecta uma instância existente que esteja desconectada.
 */
export async function connectInstance(req: Request, res: Response): Promise<void> {
  const { name } = req.params as { name: string };

  if (!manager.has(name)) {
    res.status(404).json({ success: false, error: `Instance '${name}' not found` });
    return;
  }

  try {
    const session = manager.getOrCreate(name);
    await session.connect();
    res.json({ success: true, message: 'Connecting...', instance: session.toState() });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/**
 * DELETE /instances/:name
 * Desconecta e remove uma instância. Limpa a sessão do banco por padrão.
 */
export async function deleteInstance(req: Request, res: Response): Promise<void> {
  const { name } = req.params as { name: string };
  const clearSession = req.query['clearSession'] !== 'false';

  const deleted = await manager.delete(name, clearSession);

  if (!deleted) {
    res.status(404).json({ success: false, error: `Instance '${name}' not found` });
    return;
  }

  res.json({
    success: true,
    message: `Instance '${name}' deleted${clearSession ? ' and session cleared' : ''}`,
  });
}

/**
 * POST /instances/:name/disconnect
 * Desconecta a instância sem apagar a sessão (reconecta sem QR Code depois).
 */
export async function disconnectInstance(req: Request, res: Response): Promise<void> {
  const { name } = req.params as { name: string };
  const session = manager.get(name);

  if (!session) {
    res.status(404).json({ success: false, error: `Instance '${name}' not found` });
    return;
  }

  await session.disconnect(false);
  res.json({ success: true, message: `Instance '${name}' disconnected` });
}

/**
 * GET /instances/:name/qr
 * Página HTML interativa com QR Code e auto-refresh a cada 30 segundos.
 */
export function getQrPage(req: Request, res: Response): void {
  const { name } = req.params as { name: string };
  const session = manager.get(name);

  if (!session) {
    res.status(404).send(`<h1>Instance '${name}' not found</h1>`);
    return;
  }

  const qr = session.qrCode;
  const status = session.status;
  const phone = session.phone;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="30">
  <title>ECO — QR Code · ${name}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #070d1a;
      color: #f1f5f9;
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      background: #0f172a;
      border: 1px solid #1e2d4a;
      border-radius: 20px;
      padding: 40px;
      text-align: center;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 4px 40px rgba(0,0,0,.5);
    }
    .logo { font-size: 2.5rem; margin-bottom: 8px; }
    .instance { color: #22c55e; font-size: .85rem; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 24px; }
    .qr-wrap { background: #fff; border-radius: 12px; padding: 16px; display: inline-block; margin: 16px 0; }
    .qr-wrap img { display: block; width: 220px; height: 220px; }
    .status { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 999px; font-size: .8rem; font-weight: 600; margin-top: 16px; }
    .status.open { background: rgba(34,197,94,.15); color: #22c55e; }
    .status.connecting { background: rgba(234,179,8,.15); color: #eab308; }
    .status.close { background: rgba(239,68,68,.15); color: #ef4444; }
    .hint { color: #64748b; font-size: .8rem; margin-top: 16px; line-height: 1.5; }
    .phone { color: #22c55e; font-size: 1.1rem; font-weight: 700; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🔊</div>
    <div class="instance">${name}</div>
    ${
      status === 'open'
        ? `<div class="phone">✅ Connected<br>${phone ?? ''}</div>`
        : qr
          ? `<div class="qr-wrap"><img src="${qr}" alt="WhatsApp QR Code"></div>
           <div class="hint">Open WhatsApp → Linked Devices → Link a Device<br>Scan the QR code above</div>`
          : `<div class="hint">⏳ Generating QR Code...<br>This page refreshes automatically.</div>`
    }
    <div class="status ${status}">${status}</div>
    <div class="hint" style="margin-top:24px">
      Page refreshes every 30 seconds.<br>
      <a href="qr" style="color:#3b82f6">Refresh now</a>
    </div>
  </div>
</body>
</html>`);
}

/**
 * GET /instances/:name/qr-json
 * Retorna o QR Code em Base64 PNG para integração com frontends customizados.
 */
export function getQrJson(req: Request, res: Response): void {
  const { name } = req.params as { name: string };
  const session = manager.get(name);

  if (!session) {
    res.status(404).json({ success: false, error: `Instance '${name}' not found` });
    return;
  }

  if (session.status === 'open') {
    res.json({ success: true, status: 'open', phone: session.phone, qr: null });
    return;
  }

  if (!session.qrCode) {
    res.json({
      success: true,
      status: session.status,
      qr: null,
      message: 'QR not yet available — retry in a few seconds',
    });
    return;
  }

  res.json({
    success: true,
    status: session.status,
    instance: name,
    qr: session.qrCode,
  });
}

/**
 * POST /instances/:name/pairing-code
 * Gera um código de pareamento de 8 dígitos como alternativa ao QR Code.
 * Útil para ambientes sem câmera ou para automações remotas.
 */
export async function requestPairingCode(req: Request, res: Response): Promise<void> {
  const { name } = req.params as { name: string };
  const session = manager.get(name);

  if (!session) {
    res.status(404).json({ success: false, error: `Instance '${name}' not found` });
    return;
  }

  if (session.status === 'open') {
    res.status(409).json({ success: false, error: `Instance '${name}' is already connected` });
    return;
  }

  const body = validateBody(PairingCodeSchema, req.body, res);
  if (!body) return;

  try {
    const code = await session.requestPairingCode(body.phone);
    res.json({
      success: true,
      instance: name,
      phone: body.phone,
      code,
      message: 'Open WhatsApp → Settings → Linked Devices → Link a Device → Link with phone number',
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/**
 * POST /instances/:name/webhook
 * Atualiza a configuração de webhook em tempo real sem reiniciar a instância.
 */
export function setWebhook(req: Request, res: Response): void {
  const { name } = req.params as { name: string };
  const session = manager.get(name);

  if (!session) {
    res.status(404).json({ success: false, error: `Instance '${name}' not found` });
    return;
  }

  const body = validateBody(WebhookSchema, req.body, res);
  if (!body) return;

  session.setWebhook({
    url: body.url,
    enabled: body.enabled ?? true,
    maxRetries: body.maxRetries ?? 3,
  });
  res.json({ success: true, message: 'Webhook updated', webhook: body });
}

/**
 * GET /instances/:name/events
 * Server-Sent Events (SSE) — stream de eventos em tempo real para o Dashboard.
 * Mantém a conexão aberta e envia eventos conforme ocorrem (QR, connect, disconnect).
 */
export function streamEvents(req: Request, res: Response): void {
  const { name } = req.params as { name: string };
  const session = manager.get(name);

  if (!session) {
    res.status(404).json({ success: false, error: `Instance '${name}' not found` });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Desativa buffer no Nginx
  res.flushHeaders();

  const send = (data: string) => res.write(`data: ${data}\n\n`);

  // Heartbeat a cada 30s para manter conexão viva
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 30_000);

  const unsubscribe = session.addSSEClient(send);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
}
