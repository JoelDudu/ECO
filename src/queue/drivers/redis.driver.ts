import { type Job, Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { webhookLogger } from '../../dashboard/webhook-logger';
import type { QueueDriver, QueueMetrics, WebhookJob } from '../types';

const WEBHOOK_QUEUE = 'eco-webhooks';

/**
 * Driver de fila Redis usando BullMQ.
 *
 * Vantagens sobre o driver memory:
 * - Jobs persistem entre reinicializações do servidor
 * - Dead Letter Queue (DLQ): jobs que falharam ficam auditáveis
 * - Retentativas com backoff exponencial configurável
 * - Painel de monitoramento via Bull-Board (Sprint 4)
 * - Rate limiting anti-ban nativo do BullMQ
 */
export class RedisQueueDriver implements QueueDriver {
  readonly name = 'redis';

  private redis!: Redis;
  private webhookQueue!: Queue;
  private webhookWorker!: Worker;

  async start(): Promise<void> {
    if (!env.REDIS_URL) {
      throw new Error('REDIS_URL is required when QUEUE_DRIVER=redis');
    }

    // Conexão Redis compartilhada para Queue e Worker
    this.redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null, // Obrigatório para BullMQ
      enableReadyCheck: false,
      lazyConnect: true,
    });

    await this.redis.connect();

    this.redis.on('error', (err: Error) => {
      logger.error({ error: err.message }, 'Redis connection error');
    });

    this.redis.on('connect', () => {
      logger.info('✅ Redis connected');
    });

    // ── Fila de Webhooks ──────────────────────────────────────────────────────
    this.webhookQueue = new Queue(WEBHOOK_QUEUE, {
      connection: this.redis,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 5_000, // 5s → 10s → 20s → 40s → 80s
        },
        removeOnComplete: { count: 100 }, // Mantém os últimos 100 jobs completados
        removeOnFail: { count: 500 }, // Mantém os últimos 500 falhos (DLQ auditável)
      },
    });

    // ── Worker de Webhooks ────────────────────────────────────────────────────
    this.webhookWorker = new Worker(
      WEBHOOK_QUEUE,
      async (job: Job<WebhookJob>) => {
        const { url, payload, instance, event } = job.data;

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'ECO-Gateway/0.1.0',
            'x-eco-instance': instance,
            'x-eco-event': event,
            'x-eco-attempt': String((job.attemptsMade ?? 0) + 1),
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10_000),
        });

        if (!res.ok) {
          // Lança erro para o BullMQ acionar a retentativa automática
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        webhookLogger.addLog({
          instance,
          event,
          url,
          status: 'success',
          statusCode: res.status,
          attempt: (job.attemptsMade ?? 0) + 1,
          payload,
        });

        logger.debug(
          { instance, event, jobId: job.id, attempt: job.attemptsMade, status: res.status },
          'Webhook delivered',
        );
      },
      {
        connection: this.redis,
        concurrency: 10, // Processa até 10 webhooks simultaneamente
      },
    );

    this.webhookWorker.on('failed', (job, err) => {
      if (!job) return;
      const isLastAttempt = (job.attemptsMade ?? 0) >= (job.opts.attempts ?? 5);
      if (isLastAttempt) {
        webhookLogger.addLog({
          instance: job.data.instance,
          event: job.data.event,
          url: job.data.url,
          status: 'failed',
          attempt: (job.attemptsMade ?? 0) + 1,
          error: err.message,
          payload: job.data.payload,
        });
        logger.error(
          { instance: job.data.instance, event: job.data.event, jobId: job.id, error: err.message },
          '💀 Webhook in DLQ after all retries',
        );
      } else {
        webhookLogger.addLog({
          instance: job.data.instance,
          event: job.data.event,
          url: job.data.url,
          status: 'retrying',
          attempt: (job.attemptsMade ?? 0) + 1,
          error: err.message,
          payload: job.data.payload,
        });
        logger.warn(
          {
            instance: job.data.instance,
            event: job.data.event,
            jobId: job.id,
            attempt: job.attemptsMade,
            error: err.message,
          },
          'Webhook failed — will retry',
        );
      }
    });

    this.webhookWorker.on('completed', (job) => {
      logger.debug({ jobId: job.id, event: job.data.event }, 'Webhook job completed');
    });

    logger.info(
      { redisUrl: env.REDIS_URL.replace(/:\/\/.*@/, '://***@') },
      'Queue driver: redis (BullMQ)',
    );
  }

  /**
   * Enfileira um webhook para despacho com retentativas automáticas e DLQ.
   */
  async enqueueWebhook(job: WebhookJob): Promise<void> {
    await this.webhookQueue.add(`webhook:${job.event}`, job, {
      // JobId único por evento evita duplicatas em caso de falha antes do ACK
      jobId: `${job.instance}:${job.event}:${job.payload.timestamp}`,
    });
  }

  /**
   * Retorna métricas atuais da fila BullMQ para o Dashboard.
   */
  async getMetrics(): Promise<QueueMetrics> {
    if (!this.webhookQueue) {
      return { driver: 'redis', waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    }
    const counts = await this.webhookQueue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
    );
    return {
      driver: 'redis',
      waiting: counts['waiting'] ?? 0,
      active: counts['active'] ?? 0,
      completed: counts['completed'] ?? 0,
      failed: counts['failed'] ?? 0,
      delayed: counts['delayed'] ?? 0,
    };
  }

  /**
   * Para os workers graciosamente — aguarda jobs em andamento terminarem.
   */
  async stop(): Promise<void> {
    await this.webhookWorker.close();
    await this.webhookQueue.close();
    await this.redis.quit();
    logger.info('Queue driver stopped gracefully');
  }

  /** Retorna a instância do Redis para uso pelo Bull-Board no Dashboard (Sprint 4). */
  getRedis(): Redis {
    return this.redis;
  }

  /** Retorna a fila de webhooks para métricas no Dashboard (Sprint 4). */
  getWebhookQueue(): Queue {
    return this.webhookQueue;
  }
}
