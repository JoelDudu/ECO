import express, { type Request, type Response, type NextFunction } from 'express';
import { env } from '../config/env';
import { getDashboardHtml } from './html';
import { getLoginHtml } from './login-html';
import { dashboardApiRouter } from './routes';

function getCookie(req: Request, name: string): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1] ?? '') : undefined;
}

export function createDashboardServer(): express.Application {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const authRequired = Boolean(env.DASHBOARD_SECRET && env.DASHBOARD_SECRET.trim().length > 0);

  // Middleware de checagem de autenticação para o Dashboard
  const checkAuth = (req: Request): boolean => {
    if (!authRequired) return true;

    // Cookie
    const tokenCookie = getCookie(req, 'eco_dashboard_token');
    if (tokenCookie && tokenCookie === env.DASHBOARD_SECRET) return true;

    // Header x-dashboard-secret
    const headerSecret = req.headers['x-dashboard-secret'];
    if (headerSecret && headerSecret === env.DASHBOARD_SECRET) return true;

    // Authorization Bearer
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      if (token === env.DASHBOARD_SECRET) return true;
    }

    return false;
  };

  // Rotas de Autenticação
  app.get('/login', (_req: Request, res: Response) => {
    if (!authRequired) {
      res.redirect('/');
      return;
    }
    res.send(getLoginHtml());
  });

  app.post('/auth/login', (req: Request, res: Response) => {
    if (!authRequired) {
      res.redirect('/');
      return;
    }

    const { secret } = req.body;
    if (secret === env.DASHBOARD_SECRET) {
      res.setHeader(
        'Set-Cookie',
        `eco_dashboard_token=${encodeURIComponent(secret)}; Path=/; HttpOnly; SameSite=Lax`,
      );
      res.redirect('/');
    } else {
      res.status(401).send(getLoginHtml('Senha incorreta. Verifique DASHBOARD_SECRET no .env.'));
    }
  });

  // Interceptador para rotas da API do Dashboard
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    if (!checkAuth(req)) {
      res.status(401).json({ success: false, error: 'Unauthorized. Dashboard secret required.' });
      return;
    }
    next();
  });

  // Registra as rotas da API do Dashboard
  app.use('/api', dashboardApiRouter);

  // Página Principal do Dashboard
  app.get('/', (req: Request, res: Response) => {
    if (!checkAuth(req)) {
      res.redirect('/login');
      return;
    }
    res.send(getDashboardHtml(authRequired, env.PORT));
  });

  return app;
}
