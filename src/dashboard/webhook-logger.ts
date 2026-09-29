import { EventEmitter } from 'events';

export interface WebhookLog {
  id: string;
  timestamp: string;
  instance: string;
  event: string;
  url: string;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  statusCode?: number;
  attempt: number;
  error?: string;
  payload?: unknown;
}

/**
 * Ring buffer em memória para armazenar os últimos N logs de despacho de webhook.
 * Permite que o EcoHub Dashboard exiba eventos em tempo real via SSE.
 */
class WebhookLogger extends EventEmitter {
  private logs: WebhookLog[] = [];
  private readonly maxLogs = 100;

  addLog(entry: Omit<WebhookLog, 'id' | 'timestamp'>): WebhookLog {
    const log: WebhookLog = {
      ...entry,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
    };

    this.logs.unshift(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    this.emit('log', log);
    return log;
  }

  getLogs(limit = 50): WebhookLog[] {
    return this.logs.slice(0, limit);
  }

  clear(): void {
    this.logs = [];
    this.emit('cleared');
  }
}

export const webhookLogger = new WebhookLogger();
