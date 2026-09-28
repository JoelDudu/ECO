import 'dotenv/config';
import express from 'express';
import { env } from './config/env';
import { logger } from './config/logger';
import { SessionManager } from './core/session-manager';
import { authMiddleware } from './middleware/auth';
import { startQueue, stopQueue } from './queue';
import { instancesRouter } from './routes/instances';

/**
 * Bootstrap principal do ECO.
 * Inicializa dois servidores Express em portas independentes:
 *   - API REST (PORT): gerenciamento de instâncias e envio de mensagens
 *   - Dashboard (DASHBOARD_PORT): painel visual EcoHub (Sprint 4)
 */
async function bootstrap(): Promise<void> {
  logger.info('🔊 Starting ECO WhatsApp Gateway...');
  logger.info({ version: '0.1.0', node: process.version }, 'Runtime info');

  // ── API Server ─────────────────────────────────────────────────────────────
  const api = express();
  api.use(express.json({ limit: '10mb' }));
  api.use(express.urlencoded({ extended: true }));

  // Headers de segurança básicos
  api.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Powered-By', 'ECO Gateway');
    next();
  });

  // Middleware de autenticação global
  api.use(authMiddleware);

  // Health Check — público, sem autenticação
  api.get('/health', (_req, res) => {
    res.json({
      success: true,
      status: 'ok',
      version: '0.1.0',
      instances: SessionManager.getInstance().count,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    });
  });

  // ── Rotas ──────────────────────────────────────────────────────────────────
  api.use('/instances', instancesRouter);

  // TODO Sprint 5: documentação interativa Swagger
  // api.use('/docs', docsRouter);

  // Fallback 404
  api.use((req, res) => {
    res.status(404).json({
      success: false,
      error: `Route ${req.method} ${req.path} not found`,
    });
  });

  // Error handler global
  api.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ error: err.message, stack: err.stack }, 'Unhandled API error');
    res.status(500).json({ success: false, error: 'Internal server error' });
  });

  // ── Dashboard Server (EcoHub) — Sprint 4 ──────────────────────────────────
  if (env.DASHBOARD_ENABLED) {
    const dashboard = express();
    dashboard.use(express.json());

    dashboard.get('/', (_req, res) => {
      res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>EcoHub — ECO Dashboard</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family:monospace;background:#070d1a;color:#22c55e;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
  <div style="text-align:center">
    <h1 style="font-size:3rem;margin-bottom:8px">🔊 EcoHub</h1>
    <p style="color:#94a3b8;font-size:1.1rem">Dashboard coming in Sprint 4</p>
    <p style="color:#475569;font-size:.9rem;margin-top:24px">
      API running at
      <a href="http://localhost:${env.PORT}/health" style="color:#22c55e">
        localhost:${env.PORT}
      </a>
    </p>
  </div>
</body>
</html>`);
    });

    dashboard.listen(env.DASHBOARD_PORT, () => {
      logger.info({ port: env.DASHBOARD_PORT }, '📊 EcoHub Dashboard running');
    });
  }

  // ── Inicia Sistema de Filas ────────────────────────────────────────────────
  await startQueue();

  // ── Restaura Sessões Salvas no Boot ────────────────────────────────────────
  const manager = SessionManager.getInstance();
  await manager.restoreAllSessions();

  // ── Inicia API ─────────────────────────────────────────────────────────────
  api.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, '🚀 ECO API ready');
    logger.info(`   Health:    http://localhost:${env.PORT}/health`);
    logger.info(`   Instances: http://localhost:${env.PORT}/instances`);
    logger.info(`   Docs:      http://localhost:${env.PORT}/docs (Sprint 5)`);
    if (env.DASHBOARD_ENABLED) {
      logger.info(`   Dashboard: http://localhost:${env.DASHBOARD_PORT}`);
    }
  });

  // ── Graceful Shutdown ──────────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down ECO gracefully...');
    const sessions = SessionManager.getInstance().listAll();
    await Promise.allSettled(
      sessions.map((s) => SessionManager.getInstance().get(s.name)?.disconnect(false)),
    );
    await stopQueue();
    logger.info('All sessions disconnected. Goodbye! 👋');
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    logger.fatal({ error: err.message, stack: err.stack }, 'Uncaught exception');
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });
}

bootstrap().catch((err: unknown) => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});
