import type { AnyMessageContent, WAMessage, WAMessageKey } from '@whiskeysockets/baileys';
import {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  isJidBroadcast,
  isJidGroup,
  makeCacheableSignalKeyStore,
  makeWASocket,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import { logger } from '../config/logger';
import { useSQLiteAuthState } from '../database/sqlite-auth-state';
import { getQueue } from '../queue';
import { RateLimiter } from '../queue/rate-limiter';
import type {
  BaileysSocket,
  ConnectionStatus,
  InstanceState,
  StoredMessage,
  WebhookConfig,
} from '../types';

const RECONNECT_DELAYS_MS = [1_000, 5_000, 30_000, 300_000]; // 1s, 5s, 30s, 5min

/**
 * Gerencia o ciclo de vida completo de uma sessão WhatsApp isolada.
 * Cada instância possui seu próprio socket Baileys, banco SQLite e configuração de webhook.
 */
export class InstanceSession {
  readonly name: string;
  readonly createdAt: Date;

  private socket: BaileysSocket | null = null;
  private clearAuth: (() => void) | null = null;
  private saveCreds: (() => Promise<void>) | null = null;

  private _status: ConnectionStatus = 'close';
  private _phone: string | null = null;
  private _qrCode: string | null = null;
  private _qrRaw: string | null = null;
  private _connectedAt: Date | null = null;
  private _webhook: WebhookConfig | null = null;
  private _isDisconnecting = false;
  private _reconnectAttempt = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;

  /** Rate limiter anti-ban — 1 por instância para isolamento */
  private readonly rateLimiter: RateLimiter;

  /** Store em memória para lookup de mensagens (necessário para reações e replies) */
  private messageStore = new Map<string, StoredMessage>();

  /** Listeners SSE para streaming de status em tempo real para o Dashboard */
  private sseClients = new Set<(data: string) => void>();

  constructor(name: string) {
    this.name = name;
    this.createdAt = new Date();
    this.rateLimiter = new RateLimiter(name);
  }

  // ── Getters públicos ────────────────────────────────────────────────────────

  get status(): ConnectionStatus {
    return this._status;
  }
  get phone(): string | null {
    return this._phone;
  }
  get qrCode(): string | null {
    return this._qrCode;
  }
  get qrRaw(): string | null {
    return this._qrRaw;
  }
  get webhook(): WebhookConfig | null {
    return this._webhook;
  }
  get isConnected(): boolean {
    return this._status === 'open' && this.socket !== null;
  }
  get rateLimiterMetrics() {
    return this.rateLimiter.getMetrics();
  }

  /** Retorna o estado completo da instância para a API REST */
  toState(): InstanceState {
    return {
      name: this.name,
      status: this._status,
      phone: this._phone,
      webhook: this._webhook,
      createdAt: this.createdAt.toISOString(),
      connectedAt: this._connectedAt?.toISOString() ?? null,
    };
  }

  // ── Conexão ─────────────────────────────────────────────────────────────────

  /**
   * Inicia ou reconecta o socket Baileys para esta instância.
   * Ao reiniciar o servidor, restaura a sessão do SQLite sem pedir novo QR Code.
   */
  async connect(webhook?: WebhookConfig): Promise<void> {
    if (this._isDisconnecting) return;
    if (this._status === 'open' && this.socket) return;
    if (this._status === 'connecting' && this.socket) return;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this._reconnectAttempt = 0;

    if (this.socket) {
      const oldSocket = this.socket;
      this.socket = null;
      try {
        oldSocket.ev.removeAllListeners('connection.update');
        oldSocket.end(undefined);
      } catch {
        // Silencia erro ao encerrar socket prévio
      }
    }

    if (webhook) this._webhook = webhook;

    const { state, saveCreds, clearAuth } = await useSQLiteAuthState(this.name);
    this.saveCreds = saveCreds;
    this.clearAuth = clearAuth;

    const { version } = await fetchLatestBaileysVersion();
    const silentLogger = pino({ level: 'silent' });

    this.socket = makeWASocket({
      version,
      logger: silentLogger,
      printQRInTerminal: false,
      syncFullHistory: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, silentLogger),
      },
      getMessage: async (key: WAMessageKey) => {
        const stored = this.messageStore.get(key.id ?? '');
        return stored?.message ?? undefined;
      },
      browser: Browsers.ubuntu('Chrome'),
    });

    this.bindEvents();
    logger.info({ instance: this.name, version }, 'Connecting to WhatsApp...');
  }

  /**
   * Gera um Pairing Code de 8 dígitos como alternativa ao QR Code.
   * @param phoneNumber - Número no formato internacional (ex: "5511999999999")
   */
  async requestPairingCode(phoneNumber: string): Promise<string> {
    if (!this.socket) {
      throw new Error(`Instance '${this.name}' not initialized. Call connect() first.`);
    }
    const digits = phoneNumber.replace(/\D/g, '');
    const code = await this.socket.requestPairingCode(digits);
    logger.info({ instance: this.name, phoneNumber: digits }, 'Pairing code generated');
    return code;
  }

  /**
   * Desconecta graciosamente e opcionalmente limpa a sessão do banco.
   */
  async disconnect(clearSession = false): Promise<void> {
    this._isDisconnecting = true;
    this._status = 'close';
    this._reconnectAttempt = 0;
    this._qrCode = null;
    this._qrRaw = null;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      await this.socket.logout().catch(() => undefined);
      this.socket.end(undefined);
      this.socket = null;
    }

    if (clearSession && this.clearAuth) {
      this.clearAuth();
      logger.info({ instance: this.name }, 'Session cleared from database');
    }

    this._isDisconnecting = false;
    this.broadcastSSE({ event: 'connection.update', status: 'close' });
    logger.info({ instance: this.name }, 'Instance disconnected');
  }

  // ── Envio de Mensagens ──────────────────────────────────────────────────────

  /** Envia uma mensagem de texto simples. */
  async sendText(jid: string, text: string): Promise<WAMessage | undefined> {
    this.assertConnected();
    await this.rateLimiter.waitForSlot();
    const result = await this.socket!.sendMessage(jid, { text });
    if (result?.key.id) this.storeMessage(result);
    return result;
  }

  /**
   * Envia uma mídia (imagem, vídeo, documento, sticker) a partir de uma URL.
   * Cada tipo tem seu payload tipado corretamente pelo Baileys.
   */
  async sendMedia(
    jid: string,
    options: {
      type: 'image' | 'video' | 'document' | 'sticker';
      url: string;
      caption?: string;
      filename?: string;
      mimetype?: string;
    },
  ): Promise<WAMessage | undefined> {
    this.assertConnected();

    // Monta o payload correto por tipo — necessário pelo sistema de tipos discriminados do Baileys
    let content: AnyMessageContent;

    switch (options.type) {
      case 'image':
        content = {
          image: { url: options.url },
          ...(options.caption !== undefined && { caption: options.caption }),
        };
        break;
      case 'video':
        content = {
          video: { url: options.url },
          ...(options.caption !== undefined && { caption: options.caption }),
        };
        break;
      case 'document':
        content = {
          document: { url: options.url },
          fileName: options.filename ?? 'file',
          mimetype: options.mimetype ?? 'application/octet-stream',
        };
        break;
      case 'sticker':
        content = { sticker: { url: options.url } };
        break;
    }

    await this.rateLimiter.waitForSlot();
    const result = await this.socket!.sendMessage(jid, content);
    if (result?.key.id) this.storeMessage(result);
    return result;
  }

  /**
   * Envia um áudio como Voice Note PTT (microfone azul).
   */
  async sendAudio(jid: string, url: string, ptt = true): Promise<WAMessage | undefined> {
    this.assertConnected();
    await this.rateLimiter.waitForSlot();
    const result = await this.socket!.sendMessage(jid, {
      audio: { url },
      mimetype: 'audio/mp4',
      ptt,
    });
    if (result?.key.id) this.storeMessage(result);
    return result;
  }

  /** Envia uma localização geográfica. */
  async sendLocation(
    jid: string,
    latitude: number,
    longitude: number,
    name?: string,
  ): Promise<WAMessage | undefined> {
    this.assertConnected();
    await this.rateLimiter.waitForSlot();
    const result = await this.socket!.sendMessage(jid, {
      location: { degreesLatitude: latitude, degreesLongitude: longitude, name: name ?? '' },
    });
    if (result?.key.id) this.storeMessage(result);
    return result;
  }

  /** Envia uma reação (emoji) a uma mensagem existente. */
  async sendReaction(
    jid: string,
    messageId: string,
    emoji: string,
  ): Promise<WAMessage | undefined> {
    this.assertConnected();
    const result = await this.socket!.sendMessage(jid, {
      react: { text: emoji, key: { id: messageId, remoteJid: jid } },
    });
    return result;
  }

  /** Marca mensagens como lidas. */
  async markAsRead(jid: string, messageIds: string[]): Promise<void> {
    this.assertConnected();
    await this.socket!.readMessages(
      messageIds.map((id) => ({ id, remoteJid: jid, fromMe: false })),
    );
  }

  /**
   * Resolve o JID correto do WhatsApp para um número de telefone.
   * Trata variações de 8/9 dígitos no Brasil automaticamente.
   */
  async resolveJid(phone: string): Promise<string> {
    this.assertConnected();
    let digits = phone.replace(/\D/g, '').replace(/@s\.whatsapp\.net/, '');

    if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
      digits = `55${digits}`;
    }

    if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
      const ddd = digits.slice(2, 4);
      const with9 = digits.length === 13 ? digits : `55${ddd}9${digits.slice(4)}`;
      const without9 = digits.length === 13 ? `55${ddd}${digits.slice(5)}` : digits;

      try {
        const results = await this.socket!.onWhatsApp(
          `${with9}@s.whatsapp.net`,
          `${without9}@s.whatsapp.net`,
        );
        // Fix TS18048: results pode ser undefined
        const valid = (results ?? []).find((r) => r.exists);
        if (valid?.jid) return valid.jid;
      } catch {
        // Silencia e retorna JID padrão
      }
    }

    return `${digits}@s.whatsapp.net`;
  }

  // ── Webhook ─────────────────────────────────────────────────────────────────

  /** Atualiza a configuração de webhook em tempo real sem reiniciar a instância. */
  setWebhook(config: WebhookConfig): void {
    this._webhook = config;
    logger.info(
      { instance: this.name, url: config.url, enabled: config.enabled },
      'Webhook updated',
    );
  }

  // ── SSE (Server-Sent Events) para Dashboard ──────────────────────────────────

  /** Registra um cliente SSE para streaming de eventos em tempo real. */
  addSSEClient(send: (data: string) => void): () => void {
    this.sseClients.add(send);
    send(JSON.stringify({ event: 'connection.update', status: this._status, phone: this._phone }));
    return () => this.sseClients.delete(send);
  }

  // ── Privados ────────────────────────────────────────────────────────────────

  private assertConnected(): void {
    if (!this.isConnected) {
      throw new Error(`Instance '${this.name}' is not connected (status: ${this._status})`);
    }
  }

  private storeMessage(msg: WAMessage): void {
    if (msg.key.id) {
      this.messageStore.set(msg.key.id, {
        key: msg.key,
        message: msg.message,
        timestamp: Date.now(),
      });
      if (this.messageStore.size > 500) {
        const firstKey = this.messageStore.keys().next().value;
        if (firstKey) this.messageStore.delete(firstKey);
      }
    }
  }

  private broadcastSSE(data: Record<string, unknown>): void {
    const payload = JSON.stringify(data);
    this.sseClients.forEach((send) => {
      try {
        send(payload);
      } catch {
        /* cliente desconectado */
      }
    });
  }

  /** Vincula todos os eventos do socket Baileys ao ciclo de vida da instância. */
  private bindEvents(): void {
    if (!this.socket) return;
    const currentSocket = this.socket;

    currentSocket.ev.on('creds.update', async () => {
      if (this.saveCreds) await this.saveCreds();
    });

    currentSocket.ev.on('connection.update', async (update) => {
      if (this.socket !== currentSocket) return;

      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this._qrRaw = qr;
        this._qrCode = await QRCode.toDataURL(qr);
        this._status = 'connecting';
        this.broadcastSSE({ event: 'qr.update', qr: this._qrCode, instance: this.name });
        logger.info({ instance: this.name }, 'QR Code generated — waiting for scan');
      }

      if (connection === 'open') {
        this._status = 'open';
        this._qrCode = null;
        this._qrRaw = null;
        this._reconnectAttempt = 0;
        this._connectedAt = new Date();
        this._phone = this.socket?.user?.id?.split(':')[0] ?? null;
        this.broadcastSSE({ event: 'connection.update', status: 'open', phone: this._phone });
        logger.info({ instance: this.name, phone: this._phone }, '✅ WhatsApp connected');
        await this.dispatchWebhook('connection.open', { phone: this._phone });
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output
          ?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        this._status = 'close';
        this._qrCode = null;
        this._qrRaw = null;
        this.broadcastSSE({ event: 'connection.update', status: 'close', statusCode });

        if (shouldReconnect && !this._isDisconnecting) {
          let delay: number;

          if (statusCode === DisconnectReason.restartRequired) {
            // Handshake pós-leitura de QR Code ou rotação de chaves — reconexão imediata
            delay = 500;
            this._reconnectAttempt = 0;
            logger.info(
              { instance: this.name },
              'Restart required by WhatsApp — completing handshake immediately',
            );
          } else if (this._phone) {
            delay =
              RECONNECT_DELAYS_MS[
                Math.min(this._reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)
              ] ?? 300_000;
            this._reconnectAttempt++;
          } else {
            delay = 5_000;
            this._reconnectAttempt++;
          }

          logger.warn(
            { instance: this.name, attempt: this._reconnectAttempt, delayMs: delay, statusCode },
            `Connection closed. Reconnecting in ${delay / 1000}s...`,
          );
          if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => void this.connect(), delay);
        } else if (statusCode === DisconnectReason.loggedOut) {
          logger.warn({ instance: this.name }, 'Logged out — session cleared');
          if (this.clearAuth) this.clearAuth();
          await this.dispatchWebhook('connection.logout', {});
        }
      }
    });

    this.socket.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (!msg.message) continue;
        const msgType = Object.keys(msg.message)[0] ?? '';
        if (
          [
            'protocolMessage',
            'senderKeyDistributionMessage',
            'keyTransparencyUpdateMessage',
          ].includes(msgType)
        )
          continue;
        if (isJidBroadcast(msg.key.remoteJid ?? '')) continue;

        this.storeMessage(msg);
        const isGroup = isJidGroup(msg.key.remoteJid ?? '');
        await this.dispatchWebhook('message.received', {
          key: msg.key,
          message: msg.message,
          pushName: msg.pushName,
          isGroup,
          timestamp: msg.messageTimestamp,
        });
      }
    });

    this.socket.ev.on('messages.update', async (updates) => {
      for (const update of updates) {
        if (update.update.status !== undefined) {
          await this.dispatchWebhook('message.status', {
            key: update.key,
            status: update.update.status,
          });
        }
      }
    });
  }

  /**
   * Enfileira um evento de webhook para despacho com retentativas automáticas.
   * O queue driver (memory/redis) garante entrega confiável ao sistema do cliente.
   */
  private async dispatchWebhook(event: string, data: unknown): Promise<void> {
    if (!this._webhook?.enabled || !this._webhook.url) return;

    const payload = {
      event,
      instance: this.name,
      sender: this._phone,
      data,
      timestamp: Math.floor(Date.now() / 1000),
    };

    try {
      await getQueue().enqueueWebhook({
        instance: this.name,
        event,
        url: this._webhook.url,
        payload,
      });
      logger.debug({ instance: this.name, event }, 'Webhook enqueued');
    } catch (err) {
      // Fallback direto se a fila falhar (ex: Redis indisponível)
      logger.warn(
        { instance: this.name, event, error: (err as Error).message },
        'Queue unavailable — dispatching webhook directly',
      );
      void fetch(this._webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'ECO-Gateway/0.1.0' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      }).catch(() => undefined);
    }
  }
}
