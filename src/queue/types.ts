/**
 * Interface contratual que todos os drivers de fila devem implementar.
 * Permite trocar memory <-> redis apenas via QUEUE_DRIVER no .env.
 */

/** Job de despacho de webhook para o sistema do cliente. */
export interface WebhookJob {
  instance: string;
  event: string;
  url: string;
  payload: {
    event: string;
    instance: string;
    sender: string | null;
    data: unknown;
    timestamp: number;
  };
  attempt?: number;
}

/** Job de envio de mensagem via WhatsApp com rate limiting. */
export interface SendJob {
  instance: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'sticker' | 'reaction';
  jid: string;
  payload: Record<string, unknown>;
}

/** Contrato comum para todos os drivers de fila do ECO. */
export interface QueueDriver {
  /** Enfileira um webhook para despacho com retentativas automáticas. */
  enqueueWebhook(job: WebhookJob): Promise<void>;

  /** Inicia os workers da fila (chamado no bootstrap do servidor). */
  start(): Promise<void>;

  /** Para todos os workers graciosamente. */
  stop(): Promise<void>;

  /** Nome do driver ativo. */
  readonly name: string;
}
