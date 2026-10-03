import 'dotenv/config';
import { z } from 'zod';

/**
 * Schema de validação de todas as variáveis de ambiente do ECO.
 * Lança um erro claro e detalhado se alguma variável obrigatória estiver faltando ou inválida.
 * NUNCA leia process.env diretamente fora deste arquivo.
 */
const envSchema = z.object({
  // ── Servidor API ──────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // ── Dashboard ─────────────────────────────────────────────
  DASHBOARD_PORT: z.coerce.number().int().positive().default(3001),
  DASHBOARD_ENABLED: z
    .string()
    .transform((v) => v.toLowerCase() === 'true')
    .default('true'),
  DASHBOARD_SECRET: z.string().optional(),

  // ── Segurança ─────────────────────────────────────────────
  API_KEY: z.string().min(8, 'API_KEY deve ter no mínimo 8 caracteres'),
  APP_ENCRYPTION_KEY: z
    .string()
    .length(32, 'APP_ENCRYPTION_KEY deve ter exatamente 32 caracteres')
    .optional(),

  // ── Persistência ──────────────────────────────────────────
  DATABASE_DRIVER: z.enum(['sqlite', 'postgres']).default('sqlite'),
  DATABASE_URL: z.string().default('file:./eco.db'),

  // ── Mensageria (BullMQ + Redis) ───────────────────────────
  // memory: zero dependências externas, ideal para dev e testes locais
  // redis: BullMQ com rate limit anti-ban, retentativas e DLQ (recomendado para produção)
  QUEUE_DRIVER: z.enum(['memory', 'redis']).default('memory'),
  REDIS_URL: z.string().optional(),

  // ── Anti-Ban ──────────────────────────────────────────────
  SEND_RATE_MAX: z.coerce.number().int().positive().default(1),
  SEND_RATE_DURATION_MS: z.coerce.number().int().positive().default(3000),
  SEND_MIN_DELAY_MS: z.coerce.number().int().min(0).default(500),
  SEND_MAX_DELAY_MS: z.coerce.number().int().min(0).default(2000),

  // ── Log ───────────────────────────────────────────────────
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['pretty', 'json']).default('pretty'),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('\n❌ Erro nas variáveis de ambiente do ECO:\n');
    for (const issue of result.error.issues) {
      console.error(`  • ${issue.path.join('.')}: ${issue.message}`);
    }
    console.error('\n📄 Verifique o arquivo .env.example para referência.\n');
    process.exit(1);
  }

  if (result.data.QUEUE_DRIVER === 'redis' && !result.data.REDIS_URL) {
    console.error('❌ REDIS_URL é obrigatório quando QUEUE_DRIVER=redis\n');
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();
export type Env = typeof env;
