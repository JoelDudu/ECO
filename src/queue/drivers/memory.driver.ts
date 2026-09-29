import { logger } from '../../config/logger';
import { webhookLogger } from '../../dashboard/webhook-logger';
import type { QueueDriver, QueueMetrics, WebhookJob } from '../types';

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
  private activeJobs = 0;
  private totalCompleted = 0;
  private totalFailed = 0;
  private totalRetrying = 0;

  async enqueueWebhook(job: WebhookJob): Promise<void> {
    // Despacha de forma assíncrona — não bloqueia o socket do Baileys
    setImmediate(() => void this.processWebhook(job));
  }

  private async processWebhook(job: WebhookJob, attempt = 1): Promise<void> {
    this.activeJobs++;
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

      this.activeJobs = Math.max(0, this.activeJobs - 1);
      this.totalCompleted++;

      webhookLogger.addLog({
        instance: job.instance,
        event: job.event,
        url: job.url,
        status: 'success',
        statusCode: res.status,
        attempt,
        payload: job.payload,
      });

      logger.debug(
        { instance: job.instance, event: job.event, attempt, status: res.status },
        'Webhook delivered',
      );
    } catch (err) {
      this.activeJobs = Math.max(0, this.activeJobs - 1);
      const error = (err as Error).message;

      if (attempt < MAX_RETRIES) {
        this.totalRetrying++;
        const delay = RETRY_DELAYS_MS[attempt - 1] ?? 120_000;

        webhookLogger.addLog({
          instance: job.instance,
          event: job.event,
          url: job.url,
          status: 'retrying',
          attempt,
          error,
          payload: job.payload,
        });

        logger.warn(
          { instance: job.instance, event: job.event, attempt, nextInMs: delay, error },
          `Webhook failed — retrying in ${delay / 1000}s`,
        );
        setTimeout(() => {
          this.totalRetrying = Math.max(0, this.totalRetrying - 1);
          void this.processWebhook(job, attempt + 1);
        }, delay);
      } else {
        this.totalFailed++;

        webhookLogger.addLog({
          instance: job.instance,
          event: job.event,
          url: job.url,
          status: 'failed',
          attempt,
          error,
          payload: job.payload,
        });

        logger.error(
          { instance: job.instance, event: job.event, attempts: attempt, error },
          'Webhook failed after all retries — dropped (use QUEUE_DRIVER=redis for DLQ)',
        );
      }
    }
  }

  async getMetrics(): Promise<QueueMetrics> {
    return {
      driver: 'memory',
      waiting: 0,
      active: this.activeJobs,
      completed: this.totalCompleted,
      failed: this.totalFailed,
      delayed: this.totalRetrying,
    };
  }

  async start(): Promise<void> {
    this.isRunning = true;
    logger.info('Queue driver: memory (dev mode — jobs lost on restart)');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
  }
}
