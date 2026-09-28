import pino from 'pino';
import { env } from './env';

/**
 * Logger estruturado do ECO usando Pino.
 * Em desenvolvimento: saída colorida e legível (pretty).
 * Em produção: JSON puro para sistemas de log (ELK, Datadog, etc).
 * NUNCA logar credenciais, tokens ou chaves de criptografia.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  ...(env.LOG_FORMAT === 'pretty'
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss',
            ignore: 'pid,hostname',
            messageFormat: '[ECO] {msg}',
          },
        },
      }
    : {}),
  redact: {
    // Garante que campos sensíveis nunca apareçam nos logs
    paths: ['*.apiKey', '*.api_key', '*.password', '*.token', '*.secret', '*.key', '*.creds'],
    censor: '[REDACTED]',
  },
});

export type Logger = typeof logger;
