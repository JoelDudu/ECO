import { type Request, type Response, Router } from 'express';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { SessionManager } from '../core/session-manager';
import { getQueue } from '../queue';
import type { QueueMetrics } from '../queue/types';
import type { CreateInstanceOptions } from '../types';
import { webhookLogger } from './webhook-logger';

export const dashboardApiRouter = Router();

// Helper para obter instância ou responder 404
function getSessionOr404(name: string, res: Response) {
  const session = SessionManager.getInstance().get(name);
  if (!session) {
    res.status(404).json({ success: false, error: `Instance '${name}' not found` });
    return null;
  }
  return session;
}

// ── Status do Sistema ────────────────────────────────────────────────────────
dashboardApiRouter.get('/status', async (_req: Request, res: Response) => {
  const manager = SessionManager.getInstance();
  const queue = getQueue();
  let queueMetrics: QueueMetrics = {
    driver: env.QUEUE_DRIVER,
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
  };
  try {
    queueMetrics = await queue.getMetrics();
  } catch {
    // Fila pode não estar pronta
  }

  res.json({
    success: true,
    version: '0.1.0',
    uptime: Math.floor(process.uptime()),
    instancesCount: manager.count,
    apiPort: env.PORT,
    dashboardPort: env.DASHBOARD_PORT,
    queueDriver: env.QUEUE_DRIVER,
    queueMetrics,
    authRequired: Boolean(env.DASHBOARD_SECRET && env.DASHBOARD_SECRET.trim().length > 0),
  });
});

// ── Instâncias ───────────────────────────────────────────────────────────────
dashboardApiRouter.get('/instances', (_req: Request, res: Response) => {
  const manager = SessionManager.getInstance();
  const instances = manager.listAll().map((state) => {
    const session = manager.get(state.name);
    return {
      ...state,
      isConnected: session?.isConnected ?? false,
      hasQr: Boolean(session?.qrCode),
      rateLimiter: session?.rateLimiterMetrics ?? {
        tokens: 0,
        queueSize: 0,
        instanceName: state.name,
      },
    };
  });

  res.json({ success: true, instances });
});

dashboardApiRouter.post('/instances', async (req: Request, res: Response) => {
  const { name, webhookUrl, usePairingCode, phoneNumber } = req.body;
  if (!name || typeof name !== 'string') {
    res.status(400).json({ success: false, error: 'Instance name is required' });
    return;
  }

  try {
    const manager = SessionManager.getInstance();
    const options: CreateInstanceOptions = {
      name,
      ...(webhookUrl ? { webhook: { url: String(webhookUrl), enabled: true } } : {}),
      ...(usePairingCode ? { usePairingCode: true } : {}),
      ...(phoneNumber ? { phoneNumber: String(phoneNumber) } : {}),
    };

    const session = await manager.createAndConnect(options);

    res.status(201).json({
      success: true,
      instance: session.toState(),
      qr: session.qrCode,
    });
  } catch (err) {
    logger.error({ error: (err as Error).message }, 'Failed to create instance in dashboard');
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

dashboardApiRouter.get('/instances/:name/qr', async (req: Request, res: Response) => {
  const { name } = req.params as { name: string };
  const session = getSessionOr404(name, res);
  if (!session) return;

  if (session.status === 'close') {
    void session.connect();
  }

  for (let i = 0; i < 6; i++) {
    if (session.qrCode || session.status === 'open') break;
    await new Promise((r) => setTimeout(r, 500));
  }

  res.json({
    success: true,
    qr: session.qrCode,
    status: session.status,
    phone: session.phone,
  });
});

dashboardApiRouter.post('/instances/:name/connect', async (req: Request, res: Response) => {
  const { name } = req.params as { name: string };
  const session = getSessionOr404(name, res);
  if (!session) return;

  try {
    await session.connect();
    res.json({ success: true, message: 'Connecting...', status: session.status });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

dashboardApiRouter.post('/instances/:name/disconnect', async (req: Request, res: Response) => {
  const { name } = req.params as { name: string };
  const session = getSessionOr404(name, res);
  if (!session) return;

  try {
    await session.disconnect(false);
    res.json({ success: true, message: 'Disconnected', status: session.status });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

dashboardApiRouter.delete('/instances/:name', async (req: Request, res: Response) => {
  const { name } = req.params as { name: string };
  const { clearSession } = req.query as { clearSession?: string };
  const shouldClear = clearSession !== 'false';

  try {
    const success = await SessionManager.getInstance().delete(name, shouldClear);
    res.json({ success, message: success ? `Instance '${name}' deleted` : 'Not found' });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

dashboardApiRouter.post('/instances/:name/pairing-code', async (req: Request, res: Response) => {
  const { name } = req.params as { name: string };
  const session = getSessionOr404(name, res);
  if (!session) return;

  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    res.status(400).json({ success: false, error: 'phoneNumber is required' });
    return;
  }

  try {
    const code = await session.requestPairingCode(String(phoneNumber));
    res.json({ success: true, pairingCode: code });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

dashboardApiRouter.post('/instances/:name/webhook', (req: Request, res: Response) => {
  const { name } = req.params as { name: string };
  const session = getSessionOr404(name, res);
  if (!session) return;

  const { url, enabled } = req.body;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ success: false, error: 'Webhook URL is required' });
    return;
  }

  session.setWebhook({
    url,
    enabled: enabled !== false,
  });

  res.json({ success: true, webhook: session.webhook });
});

// ── Envio de Mensagens de Teste ──────────────────────────────────────────────
dashboardApiRouter.post('/instances/:name/send/text', async (req: Request, res: Response) => {
  const { name } = req.params as { name: string };
  const session = getSessionOr404(name, res);
  if (!session) return;

  const { phone, message } = req.body;
  if (!phone || !message) {
    res.status(400).json({ success: false, error: 'phone and message are required' });
    return;
  }

  try {
    const jid = await session.resolveJid(String(phone));
    const result = await session.sendText(jid, String(message));
    res.json({
      success: true,
      messageId: result?.key?.id,
      timestamp: result?.messageTimestamp,
      status: 'sent',
    });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

dashboardApiRouter.post('/instances/:name/send/media', async (req: Request, res: Response) => {
  const { name } = req.params as { name: string };
  const session = getSessionOr404(name, res);
  if (!session) return;

  const { phone, type, url, caption, filename, ptt } = req.body;
  if (!phone || !url || !type) {
    res.status(400).json({ success: false, error: 'phone, type and url are required' });
    return;
  }

  try {
    const jid = await session.resolveJid(String(phone));
    let result: unknown = null;

    if (type === 'audio') {
      result = await session.sendAudio(jid, String(url), ptt !== false);
    } else {
      result = await session.sendMedia(jid, {
        type: type as 'image' | 'video' | 'document' | 'sticker',
        url: String(url),
        ...(caption ? { caption: String(caption) } : {}),
        ...(filename ? { filename: String(filename) } : {}),
      });
    }

    const resRecord = result as { key?: { id?: string }; messageTimestamp?: number } | null;
    res.json({
      success: true,
      messageId: resRecord?.key?.id,
      timestamp: resRecord?.messageTimestamp,
      status: 'sent',
    });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

dashboardApiRouter.post('/instances/:name/send/reaction', async (req: Request, res: Response) => {
  const { name } = req.params as { name: string };
  const session = getSessionOr404(name, res);
  if (!session) return;

  const { phone, messageId, emoji } = req.body;
  if (!phone || !messageId || !emoji) {
    res.status(400).json({ success: false, error: 'phone, messageId and emoji are required' });
    return;
  }

  try {
    const jid = await session.resolveJid(String(phone));
    const result = await session.sendReaction(jid, String(messageId), String(emoji));
    res.json({ success: true, messageId: result?.key?.id, status: 'sent' });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

// ── Webhooks & Logs ──────────────────────────────────────────────────────────
dashboardApiRouter.get('/webhooks/logs', (req: Request, res: Response) => {
  const { limit } = req.query as { limit?: string };
  const parsedLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  res.json({ success: true, logs: webhookLogger.getLogs(parsedLimit) });
});

dashboardApiRouter.delete('/webhooks/logs', (_req: Request, res: Response) => {
  webhookLogger.clear();
  res.json({ success: true, message: 'Logs cleared' });
});

// ── Métricas ─────────────────────────────────────────────────────────────────
dashboardApiRouter.get('/metrics', async (_req: Request, res: Response) => {
  const manager = SessionManager.getInstance();
  const queue = getQueue();
  let queueMetrics: QueueMetrics = {
    driver: env.QUEUE_DRIVER,
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
  };
  try {
    queueMetrics = await queue.getMetrics();
  } catch {
    // Silencia se erro
  }

  const rateLimiters = manager.listAll().map((s) => {
    const session = manager.get(s.name);
    return session?.rateLimiterMetrics ?? { tokens: 0, queueSize: 0, instanceName: s.name };
  });

  res.json({
    success: true,
    queue: queueMetrics,
    rateLimiters,
    antiBanConfig: {
      sendRateMax: env.SEND_RATE_MAX,
      sendRateDurationMs: env.SEND_RATE_DURATION_MS,
      sendMinDelayMs: env.SEND_MIN_DELAY_MS,
      sendMaxDelayMs: env.SEND_MAX_DELAY_MS,
    },
  });
});

// ── SSE Unificado para Dashboard ─────────────────────────────────────────────
dashboardApiRouter.get('/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Envia snapshot inicial
  const manager = SessionManager.getInstance();
  sendEvent('init', {
    instancesCount: manager.count,
    uptime: Math.floor(process.uptime()),
  });

  // Ouve novos logs de webhook
  const onWebhookLog = (log: unknown) => {
    sendEvent('webhook.log', log);
  };
  webhookLogger.on('log', onWebhookLog);

  // Heartbeat a cada 3s com estado atualizado das instâncias
  const interval = setInterval(async () => {
    try {
      const instances = manager.listAll().map((state) => {
        const session = manager.get(state.name);
        return {
          ...state,
          isConnected: session?.isConnected ?? false,
          qrCode: session?.qrCode ?? null,
          rateLimiter: session?.rateLimiterMetrics,
        };
      });

      sendEvent('heartbeat', {
        uptime: Math.floor(process.uptime()),
        instances,
      });
    } catch {
      // Ignora erro de serialização
    }
  }, 3000);

  req.on('close', () => {
    clearInterval(interval);
    webhookLogger.off('log', onWebhookLog);
  });
});
