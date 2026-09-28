import { logger } from '../../config/logger';
import type { QueueDriver, WebhookJob } from '../types';

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [5_000, 30_000, 120_000]; // 5s, 30s, 2min

/**
 * Driver de fila em memória — zero dependências externas.
 *
 * Ideal para desenvolvimento local e testes.
 * ATENÇÃO: jobs em memória são perdidos ao reiniciar o servidor.
 * Para produção com retentativas persistentes, use QUEUE_DRIVER=redis.
 */
export class MemoryQueueDriver implements QueueDriver {
  readonly name = 'memory';
  private isRunning = false;

  async enqueueWebhook(job: WebhookJob): Promise<void> {
    // Despacha de forma assíncrona — não bloqueia o socket do Baileys
    setImmediate(() => void this.processWebhook(job));
  }

  private async processWebhook(job: WebhookJob, attempt = 1): Promise<void> {
    try {
      const res = await fetch(job.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ECO-Gateway/0.1.0',
          'x-eco-instance': job.instance,
          'x-eco-event': job.event,
          'x-eco-attempt': String(attempt),
        },
        body: JSON.stringify(job.payload),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      logger.debug(
        { instance: job.instance, event: job.event, attempt, status: res.status },
        'Webhook delivered',
      );
    } catch (err) {
      const error = (err as Error).message;

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS_MS[attempt - 1] ?? 120_000;
        logger.warn(
          { instance: job.instance, event: job.event, attempt, nextInMs: delay, error },
          `Webhook failed — retrying in ${delay / 1000}s`,
        );
        setTimeout(() => void this.processWebhook(job, attempt + 1), delay);
      } else {
        logger.error(
          { instance: job.instance, event: job.event, attempts: attempt, error },
          'Webhook failed after all retries — dropped (use QUEUE_DRIVER=redis for DLQ)',
        );
      }
    }
  }

  async start(): Promise<void> {
    this.isRunning = true;
    logger.info('Queue driver: memory (dev mode — jobs lost on restart)');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
  }
}
