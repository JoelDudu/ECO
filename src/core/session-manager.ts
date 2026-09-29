import fs from 'fs';
import path from 'path';
import { logger } from '../config/logger';
import type { CreateInstanceOptions, InstanceState } from '../types';
import { InstanceSession } from './instance-session';

/**
 * Pool dinâmico multi-tenant de instâncias WhatsApp.
 * Responsável por criar, recuperar, listar e deletar instâncias em tempo real.
 * Singleton — use `SessionManager.getInstance()` para obter a instância global.
 */
export class SessionManager {
  private static _instance: SessionManager;
  private sessions = new Map<string, InstanceSession>();
  private readonly sessionsDir: string;

  private constructor() {
    this.sessionsDir = path.resolve(process.cwd(), 'sessions');
  }

  /** Retorna a instância singleton do SessionManager. */
  static getInstance(): SessionManager {
    if (!SessionManager._instance) {
      SessionManager._instance = new SessionManager();
    }
    return SessionManager._instance;
  }

  /**
   * Restaura e reconecta automaticamente todas as sessões persistidas no banco
   * ao iniciar o servidor. Garante reconexão sem pedir novo QR Code.
   */
  async restoreAllSessions(): Promise<void> {
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
      logger.info('Sessions directory created');
      return;
    }

    // Cada arquivo .db na pasta sessions/ é uma instância
    const dbFiles = fs
      .readdirSync(this.sessionsDir)
      .filter((f) => f.endsWith('.db'))
      .map((f) => path.basename(f, '.db'));

    if (dbFiles.length === 0) {
      logger.info('No saved sessions found — starting fresh');
      return;
    }

    logger.info({ count: dbFiles.length }, 'Restoring saved sessions...');

    const reconnectPromises = dbFiles.map(async (name) => {
      try {
        const session = this.getOrCreate(name);
        await session.connect();
        logger.info({ instance: name }, 'Session restored and reconnecting...');
      } catch (err) {
        logger.error(
          { instance: name, error: (err as Error).message },
          'Failed to restore session',
        );
      }
    });

    await Promise.allSettled(reconnectPromises);
  }

  /**
   * Cria uma nova instância ou retorna a existente.
   */
  getOrCreate(name: string): InstanceSession {
    const cleanName = this.sanitizeName(name);
    if (this.sessions.has(cleanName)) {
      return this.sessions.get(cleanName)!;
    }
    const session = new InstanceSession(cleanName);
    this.sessions.set(cleanName, session);
    logger.debug({ instance: cleanName }, 'Session instance created');
    return session;
  }

  /**
   * Retorna uma instância existente ou undefined se não existir.
   */
  get(name: string): InstanceSession | undefined {
    return this.sessions.get(this.sanitizeName(name));
  }

  /**
   * Verifica se uma instância existe (em memória ou no banco).
   */
  has(name: string): boolean {
    const cleanName = this.sanitizeName(name);
    if (this.sessions.has(cleanName)) return true;
    // Verifica se existe banco salvo para esta instância
    const dbPath = path.join(this.sessionsDir, `${cleanName}.db`);
    return fs.existsSync(dbPath);
  }

  /**
   * Cria e conecta uma nova instância a partir das opções fornecidas pela API.
   */
  async createAndConnect(options: CreateInstanceOptions): Promise<InstanceSession> {
    const cleanName = this.sanitizeName(options.name);

    if (this.sessions.has(cleanName) && this.sessions.get(cleanName)!.isConnected) {
      throw new Error(`Instance '${cleanName}' is already connected`);
    }

    const session = this.getOrCreate(cleanName);
    await session.connect(options.webhook);

    // Se solicitou Pairing Code, gera após connect()
    if (options.usePairingCode && options.phoneNumber) {
      // Aguarda o socket inicializar brevemente antes de requisitar o code
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await session.requestPairingCode(options.phoneNumber);
    }

    return session;
  }

  /**
   * Desconecta e remove uma instância.
   * @param clearSession - Se true, remove também os dados do banco SQLite.
   */
  async delete(name: string, clearSession = true): Promise<boolean> {
    const cleanName = this.sanitizeName(name);
    const session = this.sessions.get(cleanName);

    if (!session) {
      // Instância não está em memória, mas pode ter banco salvo
      if (clearSession) {
        const dbPath = path.join(this.sessionsDir, `${cleanName}.db`);
        if (fs.existsSync(dbPath)) {
          fs.unlinkSync(dbPath);
          // Remove arquivos WAL se existirem
          [`${dbPath}-shm`, `${dbPath}-wal`].forEach((f) => {
            if (fs.existsSync(f)) fs.unlinkSync(f);
          });
          logger.info({ instance: cleanName }, 'Session database removed');
          return true;
        }
      }
      return false;
    }

    await session.disconnect(clearSession);
    this.sessions.delete(cleanName);
    logger.info({ instance: cleanName, clearSession }, 'Instance deleted');
    return true;
  }

  /**
   * Retorna o estado de todas as instâncias ativas em memória.
   */
  listAll(): InstanceState[] {
    return Array.from(this.sessions.values()).map((s) => s.toState());
  }

  /**
   * Retorna o número total de instâncias ativas.
   */
  get count(): number {
    return this.sessions.size;
  }

  /**
   * Normaliza o nome de uma instância: lowercase, sem espaços, alfanumérico + hífen.
   */
  private sanitizeName(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 64);
  }
}
