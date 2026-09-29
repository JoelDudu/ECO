export function getLoginHtml(error?: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login — EcoHub Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background: #070b14;
      color: #f1f5f9;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background-image: radial-gradient(circle at center, rgba(34, 197, 94, 0.08) 0%, transparent 60%);
    }
    .card {
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 2.5rem;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      text-align: center;
    }
    .icon {
      width: 52px;
      height: 52px;
      background: linear-gradient(135deg, #22c55e 0%, #10b981 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.8rem;
      margin: 0 auto 1.25rem;
      box-shadow: 0 0 20px rgba(34, 197, 94, 0.3);
    }
    h1 { font-size: 1.4rem; font-weight: 700; margin-bottom: 0.5rem; }
    p { font-size: 0.85rem; color: #94a3b8; margin-bottom: 1.75rem; }
    .form-group { text-align: left; margin-bottom: 1.25rem; }
    label { display: block; font-size: 0.8rem; color: #94a3b8; margin-bottom: 0.4rem; font-weight: 500; }
    input {
      width: 100%;
      padding: 0.75rem 1rem;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: #fff;
      font-size: 0.9rem;
      outline: none;
    }
    input:focus { border-color: #22c55e; box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.25); }
    button {
      width: 100%;
      padding: 0.75rem;
      background: #22c55e;
      color: #052e16;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      transition: background 0.15s ease;
      margin-top: 0.5rem;
    }
    button:hover { background: #16a34a; }
    .error {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
      padding: 0.6rem;
      border-radius: 6px;
      font-size: 0.8rem;
      margin-bottom: 1rem;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🔊</div>
    <h1>EcoHub Dashboard</h1>
    <p>Acesso protegido por DASHBOARD_SECRET</p>
    ${error ? `<div class="error">${error}</div>` : ''}
    <form action="/auth/login" method="POST">
      <div class="form-group">
        <label>Senha de Acesso</label>
        <input type="password" name="secret" placeholder="Digite o segredo do painel" required autofocus>
      </div>
      <button type="submit">Entrar no Painel</button>
    </form>
  </div>
</body>
</html>`;
}
