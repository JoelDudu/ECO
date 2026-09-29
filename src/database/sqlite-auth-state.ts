import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { AuthenticationState, SignalDataTypeMap } from '@whiskeysockets/baileys';
import { initAuthCreds, proto } from '@whiskeysockets/baileys';
import Database from 'better-sqlite3';
import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * Criptografa um valor usando AES-256-GCM se APP_ENCRYPTION_KEY estiver configurada.
 * Garante que credenciais do WhatsApp no banco sejam ilegíveis sem a chave mestra.
 */
function encrypt(value: string): string {
  if (!env.APP_ENCRYPTION_KEY) return value;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    Buffer.from(env.APP_ENCRYPTION_KEY, 'utf-8'),
    iv,
  );

  const encrypted = Buffer.concat([cipher.update(value, 'utf-8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `enc:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Descriptografa um valor previamente criptografado com encrypt().
 */
function decrypt(value: string): string {
  if (!env.APP_ENCRYPTION_KEY || !value.startsWith('enc:')) return value;

  const [, ivHex, tagHex, dataHex] = value.split(':');
  if (!ivHex || !tagHex || !dataHex) return value;

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(env.APP_ENCRYPTION_KEY, 'utf-8'),
    Buffer.from(ivHex, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

  return decipher.update(Buffer.from(dataHex, 'hex')).toString('utf-8') + decipher.final('utf-8');
}

/**
 * Garante que o diretório do banco de dados existe.
 */
function ensureDbDir(dbPath: string): void {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Cria ou abre o banco SQLite em modo WAL para uma instância.
 * WAL (Write-Ahead Logging) elimina corrupção de dados em caso de
 * reinicialização brusca ou falha de energia.
 */
function openDatabase(instanceName: string): Database.Database {
  const dbPath = path.resolve(process.cwd(), 'sessions', `${instanceName}.db`);
  ensureDbDir(dbPath);

  const db = new Database(dbPath);

  // Ativa WAL mode — proteção contra corrupção, performance superior
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  // Cria tabelas necessárias para o Auth State do Baileys
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_creds (
      id    TEXT PRIMARY KEY DEFAULT 'default',
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS auth_keys (
      type  TEXT NOT NULL,
      id    TEXT NOT NULL,
      value TEXT NOT NULL,
      PRIMARY KEY (type, id)
    );
  `);

  logger.debug({ instanceName, dbPath }, 'SQLite WAL database opened');
  return db;
}

/**
 * Implementação do Auth State do Baileys usando SQLite (WAL mode).
 *
 * Substitui o `useMultiFileAuthState` padrão do Baileys, que salva
 * arquivos JSON soltos susceptíveis a corrupção.
 *
 * Vantagens:
 * - Transações atômicas: ou salva 100% ou faz rollback — sem estado parcial
 * - WAL mode: sem corrupção mesmo em reinicializações bruscas
 * - Criptografia opcional: credenciais ilegíveis sem APP_ENCRYPTION_KEY
 * - Reconexão automática: credenciais persistem entre reinícios do servidor
 */
export async function useSQLiteAuthState(instanceName: string): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  clearAuth: () => void;
}> {
  const db = openDatabase(instanceName);

  // Statements preparados — performance otimizada e safe against SQL injection
  const getCreds = db.prepare<[], { value: string }>('SELECT value FROM auth_creds WHERE id = ?');
  const upsertCreds = db.prepare(
    'INSERT OR REPLACE INTO auth_creds (id, value, updated_at) VALUES (?, ?, unixepoch())',
  );
  const getKey = db.prepare<[string, string], { value: string }>(
    'SELECT value FROM auth_keys WHERE type = ? AND id = ?',
  );
  const upsertKey = db.prepare(
    'INSERT OR REPLACE INTO auth_keys (type, id, value) VALUES (?, ?, ?)',
  );
  const deleteKeys = db.prepare('DELETE FROM auth_keys WHERE type = ? AND id = ?');

  // Carrega as credenciais salvas ou cria novas
  const rawCreds = (getCreds.get as (id: string) => { value: string } | undefined)('default');
  const creds: AuthenticationState['creds'] = rawCreds
    ? (JSON.parse(decrypt(rawCreds.value)) as AuthenticationState['creds'])
    : initAuthCreds();

  /**
   * Interface de chaves do Signal Protocol exigida pelo Baileys.
   * Cada operação de leitura/escrita é uma transação atômica SQLite.
   */
  const keys: AuthenticationState['keys'] = {
    get<T extends keyof SignalDataTypeMap>(
      type: T,
      ids: string[],
    ): Promise<{ [id: string]: SignalDataTypeMap[T] }> {
      const result: { [id: string]: SignalDataTypeMap[T] } = {};

      for (const id of ids) {
        const row = (getKey.get as (type: string, id: string) => { value: string } | undefined)(
          type,
          id,
        );
        if (row) {
          let value = JSON.parse(decrypt(row.value)) as unknown as SignalDataTypeMap[T];

          // O Baileys exige que pre-keys sejam objetos proto.Message
          if (type === 'pre-key') {
            value = proto.Message.decode(
              Buffer.from(value as unknown as string, 'base64'),
            ) as unknown as SignalDataTypeMap[T];
          }

          result[id] = value;
        }
      }

      return Promise.resolve(result);
    },

    set(
      data: { [T in keyof SignalDataTypeMap]?: { [id: string]: SignalDataTypeMap[T] | null } },
    ): Promise<void> {
      // Transação atômica: todas as chaves salvas juntas ou nenhuma
      const transaction = db.transaction(() => {
        for (const [type, ids] of Object.entries(data)) {
          for (const [id, value] of Object.entries(ids ?? {})) {
            if (value === null || value === undefined) {
              (deleteKeys.run as (type: string, id: string) => void)(type, id);
            } else {
              let serialized: string;

              if (type === 'pre-key') {
                serialized = Buffer.from(
                  proto.Message.encode(value as proto.IMessage).finish(),
                ).toString('base64');
              } else {
                serialized = JSON.stringify(value);
              }

              (upsertKey.run as (type: string, id: string, value: string) => void)(
                type,
                id,
                encrypt(serialized),
              );
            }
          }
        }
      });

      transaction();
      return Promise.resolve();
    },
  };

  /**
   * Persiste as credenciais atualizadas no banco.
   * Chamado automaticamente pelo Baileys via `sock.ev.on('creds.update', saveCreds)`.
   */
  async function saveCreds(): Promise<void> {
    const serialized = encrypt(JSON.stringify(creds));
    (upsertCreds.run as (id: string, value: string) => void)('default', serialized);
    logger.debug({ instanceName }, 'Credentials saved to SQLite');
  }

  /**
   * Remove todas as credenciais e chaves desta instância do banco.
   * Chamado ao fazer logout ou deletar uma instância.
   */
  function clearAuth(): void {
    const clear = db.transaction(() => {
      db.prepare('DELETE FROM auth_creds').run();
      db.prepare('DELETE FROM auth_keys').run();
    });
    clear();
    logger.info({ instanceName }, 'Auth state cleared from SQLite');
  }

  return { state: { creds, keys }, saveCreds, clearAuth };
}
