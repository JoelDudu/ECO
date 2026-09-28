import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * Rate Limiter anti-ban para envio de mensagens WhatsApp.
 *
 * Estratégia dupla de proteção:
 * 1. Token Bucket: máximo de N mensagens por janela de tempo (SEND_RATE_MAX / SEND_RATE_DURATION_MS)
 * 2. Delay humanizado: delay aleatório entre SEND_MIN_DELAY_MS e SEND_MAX_DELAY_MS
 *    entre cada envio para simular comportamento humano e evitar detecção.
 *
 * Uma instância por sessão WhatsApp para isolamento de rate limits.
 */
export class RateLimiter {
  private readonly instanceName: string;
  private tokens: number;
  private lastRefillAt: number;
  private sendQueue: Array<() => void> = [];
  private isProcessing = false;

  constructor(instanceName: string) {
    this.instanceName = instanceName;
    this.tokens = env.SEND_RATE_MAX;
    this.lastRefillAt = Date.now();
  }

  /**
   * Aguarda até que seja seguro enviar a próxima mensagem.
   * Aplica tanto o token bucket quanto o delay humanizado.
   */
  async waitForSlot(): Promise<void> {
    return new Promise((resolve) => {
      this.sendQueue.push(resolve);
      if (!this.isProcessing) {
        void this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;

    while (this.sendQueue.length > 0) {
      this.refillTokens();

      if (this.tokens > 0) {
        this.tokens--;
        const next = this.sendQueue.shift();
        if (next) {
          // Delay humanizado aleatório entre envios
          const delay = this.randomDelay();
          if (delay > 0) {
            logger.debug(
              { instance: this.instanceName, delayMs: delay, queueSize: this.sendQueue.length },
              'Anti-ban delay applied',
            );
            await sleep(delay);
          }
          next();
        }
      } else {
        // Sem tokens — aguarda a próxima janela de reabastecimento
        const waitMs = this.timeUntilNextRefill();
        logger.debug(
          { instance: this.instanceName, waitMs, queueSize: this.sendQueue.length },
          'Rate limit reached — waiting for token refill',
        );
        await sleep(waitMs);
      }
    }

    this.isProcessing = false;
  }

  private refillTokens(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillAt;

    if (elapsed >= env.SEND_RATE_DURATION_MS) {
      const windows = Math.floor(elapsed / env.SEND_RATE_DURATION_MS);
      this.tokens = Math.min(env.SEND_RATE_MAX, this.tokens + windows * env.SEND_RATE_MAX);
      this.lastRefillAt = now - (elapsed % env.SEND_RATE_DURATION_MS);
    }
  }

  private timeUntilNextRefill(): number {
    const elapsed = Date.now() - this.lastRefillAt;
    return Math.max(0, env.SEND_RATE_DURATION_MS - elapsed);
  }

  private randomDelay(): number {
    const min = env.SEND_MIN_DELAY_MS;
    const max = env.SEND_MAX_DELAY_MS;
    if (min === 0 && max === 0) return 0;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /** Retorna métricas atuais para o Dashboard. */
  getMetrics(): { tokens: number; queueSize: number; instanceName: string } {
    return {
      tokens: this.tokens,
      queueSize: this.sendQueue.length,
      instanceName: this.instanceName,
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
