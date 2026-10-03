import { env } from '../config/env';
import { logger } from '../config/logger';
import { MemoryQueueDriver } from './drivers/memory.driver';
import { RedisQueueDriver } from './drivers/redis.driver';
import type { QueueDriver } from './types';

export type { QueueDriver, WebhookJob, SendJob } from './types';

let _driver: QueueDriver | null = null;

/**
 * Retorna o driver de fila singleton.
 * Inicializado no bootstrap pelo `startQueue()`.
 */
export function getQueue(): QueueDriver {
  if (!_driver) {
    throw new Error('Queue not initialized — call startQueue() first');
  }
  return _driver;
}

/**
 * Inicializa o driver de fila baseado em QUEUE_DRIVER no .env.
 * Chamado uma única vez no bootstrap do servidor.
 */
export async function startQueue(): Promise<QueueDriver> {
  if (_driver) return _driver;

  switch (env.QUEUE_DRIVER) {
    case 'redis':
      _driver = new RedisQueueDriver();
      break;
    default:
      _driver = new MemoryQueueDriver();
      break;
  }

  await _driver.start();
  logger.info({ driver: _driver.name }, '📬 Queue system started');
  return _driver;
}

/**
 * Para o driver de fila graciosamente.
 * Chamado no shutdown do servidor.
 */
export async function stopQueue(): Promise<void> {
  if (_driver) {
    await _driver.stop();
    _driver = null;
  }
}
