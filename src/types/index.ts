import type { WASocket, proto } from '@whiskeysockets/baileys';

/**
 * Status possíveis de uma instância WhatsApp no ECO.
 */
export type ConnectionStatus = 'connecting' | 'open' | 'close' | 'refused';

/**
 * Eventos padronizados de webhook emitidos pelo ECO.
 */
export type WebhookEvent =
  | 'message.received'
  | 'message.status'
  | 'connection.update'
  | 'connection.open'
  | 'connection.logout'
  | 'qrcode.updated'
  | 'call.received';

/**
 * Configurações de comportamento de uma instância WhatsApp.
 */
export interface InstanceSettings {
  /** Rejeita chamadas de voz e vídeo automaticamente */
  rejectCalls?: boolean | undefined;
  /** Mensagem enviada automaticamente ao rejeitar chamada (se rejectCalls=true) */
  callRejectMessage?: string | undefined;
  /** Ignora mensagens recebidas de grupos (não despacha webhook nem armazena) */
  ignoreGroups?: boolean | undefined;
  /** Mantém a presença da instância sempre como disponível / online */
  alwaysOnline?: boolean | undefined;
  /** Marca automaticamente mensagens recebidas como lidas */
  autoRead?: boolean | undefined;
}

/**
 * Configuração de webhook de uma instância.
 */
export interface WebhookConfig {
  url: string;
  enabled: boolean;
  /** Número máximo de tentativas de reenvio em caso de falha */
  maxRetries?: number | undefined;
  /** Lista de eventos ativos para despacho (se omitido ou vazio, despacha todos) */
  events?: WebhookEvent[] | undefined;
}

/**
 * Opções de criação de uma instância.
 */
export interface CreateInstanceOptions {
  /** Nome único da instância (ex: "minha-empresa", "suporte-vendas") */
  name: string;
  /** Configuração do webhook para receber eventos */
  webhook?: WebhookConfig | undefined;
  /** Configurações de comportamento da instância */
  settings?: InstanceSettings | undefined;
  /** Se true, usa Pairing Code em vez de QR Code para conectar */
  usePairingCode?: boolean | undefined;
  /** Número de telefone (obrigatório se usePairingCode=true) */
  phoneNumber?: string | undefined;
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
  settings: InstanceSettings;
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
 * Mensagem recente do chat para visualização no EcoHub Dashboard.
 */
export interface ChatMessage {
  id: string;
  remoteJid: string;
  fromMe: boolean;
  pushName?: string | null | undefined;
  text: string;
  mediaType?: string | null | undefined;
  timestamp: number;
}

/**
 * Resumo de uma conversa para listagem na barra lateral do Chat.
 */
export interface ChatSummary {
  jid: string;
  name: string;
  lastMessage: string;
  timestamp: number;
}

/**
 * Tipo do socket Baileys para uso interno.
 */
export type BaileysSocket = WASocket;
