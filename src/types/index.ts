import type { proto, WASocket } from '@whiskeysockets/baileys';

/**
 * Status possíveis de uma instância WhatsApp no ECO.
 */
export type ConnectionStatus = 'connecting' | 'open' | 'close' | 'refused';

/**
 * Configuração de webhook de uma instância.
 */
export interface WebhookConfig {
  url: string;
  enabled: boolean;
  /** Número máximo de tentativas de reenvio em caso de falha */
  maxRetries?: number;
}

/**
 * Opções de criação de uma instância.
 */
export interface CreateInstanceOptions {
  /** Nome único da instância (ex: "minha-empresa", "suporte-vendas") */
  name: string;
  /** Configuração do webhook para receber eventos */
  webhook?: WebhookConfig;
  /** Se true, usa Pairing Code em vez de QR Code para conectar */
  usePairingCode?: boolean;
  /** Número de telefone (obrigatório se usePairingCode=true) */
  phoneNumber?: string;
}

/**
 * Estado completo de uma instância retornado pela API.
 */
export interface InstanceState {
  name: string;
  status: ConnectionStatus;
  /** Número de telefone conectado (disponível apenas quando status='open') */
  phone: string | null;
  webhook: WebhookConfig | null;
  createdAt: string;
  connectedAt: string | null;
}

/**
 * Payload padrão de webhook enviado ao sistema do cliente.
 */
export interface WebhookPayload {
  event: string;
  instance: string;
  sender: string | null;
  data: unknown;
  timestamp: number;
}

/**
 * Referência interna de uma mensagem armazenada no store.
 */
export interface StoredMessage {
  key: proto.IMessageKey;
  message: proto.IMessage | null | undefined;
  timestamp: number;
}

/**
 * Tipo do socket Baileys para uso interno.
 */
export type BaileysSocket = WASocket;
