import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

/** Rotas que não exigem API Key */
const PUBLIC_ROUTES = ['/health', '/docs', '/openapi.json'];

/**
 * Middleware de autenticação via API Key.
 * Aceita a chave via:
 *   - Header: x-api-key
 *   - Header: Authorization: Bearer <key>
 *   - Query:  ?token=<key> ou ?apiKey=<key>
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (PUBLIC_ROUTES.some((r) => req.path.startsWith(r))) {
    next();
    return;
  }

  const key =
    req.headers['x-api-key'] ??
    req.headers['authorization']?.replace('Bearer ', '') ??
    (req.query['token'] as string | undefined) ??
    (req.query['apiKey'] as string | undefined);

  if (!key || key !== env.API_KEY) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized — provide a valid API key via x-api-key header',
    });
    return;
  }

  next();
}
