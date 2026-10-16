export function getDashboardHtml(authRequired: boolean, apiPort: number): string {
  return `<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EcoHub — WhatsApp Gateway & Multi-Instance Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #070b14;
      --card-bg: rgba(15, 23, 42, 0.75);
      --card-border: rgba(255, 255, 255, 0.08);
      --card-hover-border: rgba(34, 197, 94, 0.3);
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --primary: #22c55e;
      --primary-hover: #16a34a;
      --primary-glow: rgba(34, 197, 94, 0.25);
      --indigo: #6366f1;
      --indigo-glow: rgba(99, 102, 241, 0.25);
      --danger: #ef4444;
      --warning: #f59e0b;
      --header-bg: rgba(10, 15, 29, 0.85);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background-color: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background-image: 
        radial-gradient(circle at 15% 15%, rgba(34, 197, 94, 0.06) 0%, transparent 40%),
        radial-gradient(circle at 85% 25%, rgba(99, 102, 241, 0.06) 0%, transparent 40%);
      background-attachment: fixed;
    }

    code, pre, .mono { font-family: 'JetBrains Mono', monospace; }

    /* Header */
    header {
      position: sticky;
      top: 0;
      z-index: 50;
      backdrop-filter: blur(16px);
      background: var(--header-bg);
      border-bottom: 1px solid var(--card-border);
      padding: 0.85rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      text-decoration: none;
      color: inherit;
    }

    .brand-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, #22c55e 0%, #10b981 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
      box-shadow: 0 0 20px var(--primary-glow);
    }

    .brand-info h1 {
      font-size: 1.15rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .brand-info p {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .tag-badge {
      font-size: 0.65rem;
      font-weight: 600;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      background: rgba(34, 197, 94, 0.15);
      color: var(--primary);
      border: 1px solid rgba(34, 197, 94, 0.3);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .status-pill {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.8rem;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.04);
      padding: 0.35rem 0.75rem;
      border-radius: 20px;
      border: 1px solid var(--card-border);
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--primary);
      box-shadow: 0 0 8px var(--primary);
    }
    .dot.pulse { animation: pulse 2s infinite; }
    .dot.yellow { background: var(--warning); box-shadow: 0 0 8px var(--warning); }
    .dot.red { background: var(--danger); box-shadow: 0 0 8px var(--danger); }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }

    /* Navigation */
    .tabs-nav {
      display: flex;
      gap: 0.5rem;
      padding: 1rem 2rem 0;
      border-bottom: 1px solid var(--card-border);
      background: rgba(10, 15, 29, 0.4);
    }

    .tab-btn {
      padding: 0.65rem 1.25rem;
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .tab-btn:hover { color: var(--text); }
    .tab-btn.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
    }

    .tab-badge {
      background: rgba(255, 255, 255, 0.1);
      padding: 0.1rem 0.4rem;
      border-radius: 10px;
      font-size: 0.7rem;
    }

    /* Main Container */
    main {
      flex: 1;
      padding: 1.75rem 2rem 3rem;
      max-width: 1400px;
      width: 100%;
      margin: 0 auto;
    }

    .tab-content { display: none; }
    .tab-content.active { display: block; animation: fadeIn 0.25s ease-in; }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Cards & Stats */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
      margin-bottom: 1.75rem;
    }

    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.25rem;
      backdrop-filter: blur(12px);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      transition: border-color 0.2s ease, transform 0.2s ease;
    }

    .stat-card:hover {
      border-color: rgba(255, 255, 255, 0.15);
      transform: translateY(-2px);
    }

    .stat-title {
      font-size: 0.8rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }

    .stat-value {
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .stat-desc {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    /* Section Headers */
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }

    .section-header h2 {
      font-size: 1.25rem;
      font-weight: 600;
    }

    /* Buttons */
    .btn {
      padding: 0.55rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      border: 1px solid transparent;
      text-decoration: none;
    }

    .btn-primary {
      background: var(--primary);
      color: #052e16;
      font-weight: 600;
      box-shadow: 0 0 15px var(--primary-glow);
    }
    .btn-primary:hover { background: var(--primary-hover); transform: translateY(-1px); }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      border-color: var(--card-border);
      color: var(--text);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .btn-danger {
      background: rgba(239, 68, 68, 0.15);
      color: #fca5a5;
      border-color: rgba(239, 68, 68, 0.3);
    }
    .btn-danger:hover {
      background: rgba(239, 68, 68, 0.25);
    }

    .btn-sm {
      padding: 0.35rem 0.7rem;
      font-size: 0.75rem;
    }

    /* Instances Grid */
    .instances-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 1.25rem;
    }

    .instance-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.25rem;
      backdrop-filter: blur(12px);
      display: flex;
      flex-direction: column;
      gap: 1rem;
      transition: all 0.2s ease;
    }

    .instance-card:hover {
      border-color: var(--card-hover-border);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    }

    .instance-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .instance-name {
      font-size: 1.05rem;
      font-weight: 600;
      color: #fff;
    }

    .instance-phone {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-top: 0.2rem;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.6rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .status-open {
      background: rgba(34, 197, 94, 0.15);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }

    .status-connecting {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .status-close {
      background: rgba(148, 163, 184, 0.12);
      color: #94a3b8;
      border: 1px solid rgba(148, 163, 184, 0.2);
    }

    .instance-meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      padding: 0.4rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .instance-meta-row:last-child { border-bottom: none; }
    .instance-meta-label { color: var(--text-muted); }
    .instance-meta-value { color: var(--text); font-weight: 500; }

    .instance-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.5rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--card-border);
    }

    /* Form & Inputs */
    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--text-muted);
      margin-bottom: 0.4rem;
    }

    .form-control {
      width: 100%;
      padding: 0.65rem 0.85rem;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      color: var(--text);
      font-size: 0.875rem;
      font-family: inherit;
      transition: border-color 0.15s ease;
    }

    .form-control:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 2px var(--primary-glow);
    }

    textarea.form-control { resize: vertical; min-height: 80px; }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }

    .modal-backdrop.show {
      opacity: 1;
      pointer-events: auto;
    }

    .modal-card {
      background: #0d1527;
      border: 1px solid var(--card-border);
      border-radius: 16px;
      width: 100%;
      max-width: 520px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
      overflow: hidden;
      transform: scale(0.95);
      transition: transform 0.2s ease;
    }

    .modal-backdrop.show .modal-card {
      transform: scale(1);
    }

    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--card-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-header h3 { font-size: 1.1rem; font-weight: 600; }

    .modal-close {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 1.4rem;
      cursor: pointer;
      line-height: 1;
    }
    .modal-close:hover { color: #fff; }

    .modal-body {
      padding: 1.5rem;
      max-height: 75vh;
      overflow-y: auto;
    }

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--card-border);
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      background: rgba(0, 0, 0, 0.2);
    }

    /* Tables */
    .table-container {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.85rem;
    }

    th {
      background: rgba(255, 255, 255, 0.03);
      padding: 0.85rem 1rem;
      color: var(--text-muted);
      font-weight: 600;
      border-bottom: 1px solid var(--card-border);
    }

    td {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: var(--text);
    }

    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(255, 255, 255, 0.02); }

    /* Toast */
    #toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      padding: 0.75rem 1.25rem;
      background: #1e293b;
      color: #fff;
      border-radius: 8px;
      font-size: 0.85rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
      z-index: 999;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.2s ease;
      pointer-events: none;
    }
    #toast.show {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }
    #toast.success { border-color: rgba(34, 197, 94, 0.5); background: #064e3b; color: #a7f3d0; }
    #toast.error { border-color: rgba(239, 68, 68, 0.5); background: #7f1d1d; color: #fecaca; }

    /* Code Viewer */
    .code-box {
      background: #050811;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 1rem;
      font-size: 0.8rem;
      color: #e2e8f0;
      overflow-x: auto;
      max-height: 250px;
    }

    /* QR Code Display */
    .qr-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
    }
    .qr-image {
      width: 250px;
      height: 250px;
      background: #fff;
      padding: 10px;
      border-radius: 12px;
      box-shadow: 0 0 25px rgba(34, 197, 94, 0.2);
    }
    .pairing-box {
      font-size: 2rem;
      letter-spacing: 0.3em;
      font-weight: 700;
      color: var(--primary);
      background: rgba(34, 197, 94, 0.1);
      padding: 0.75rem 1.5rem;
      border-radius: 10px;
      border: 1px dashed rgba(34, 197, 94, 0.4);
      margin: 1rem 0;
    }

    /* Live Chat */
    .chat-layout {
      display: grid;
      grid-template-columns: 360px 1fr;
      height: calc(100vh - 210px);
      min-height: 600px;
      max-height: 850px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      overflow: hidden;
      backdrop-filter: blur(12px);
    }

    .chat-sidebar {
      border-right: 1px solid var(--card-border);
      display: flex;
      flex-direction: column;
      background: rgba(10, 15, 29, 0.4);
    }

    .chat-sidebar-header {
      padding: 1rem;
      border-bottom: 1px solid var(--card-border);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .chat-search-bar {
      display: flex;
      gap: 0.5rem;
    }

    .chat-list {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }

    .chat-list::-webkit-scrollbar {
      width: 6px;
    }
    .chat-list::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
    }

    .chat-item {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.85rem;
      transition: background 0.15s ease;
    }

    .chat-item:hover {
      background: rgba(255, 255, 255, 0.04);
    }

    .chat-item.active {
      background: rgba(34, 197, 94, 0.12);
      border-left: 3px solid var(--primary);
    }

    .chat-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(34, 197, 94, 0.25) 100%);
      border: 1px solid var(--card-border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      color: var(--primary);
      flex-shrink: 0;
      font-size: 0.95rem;
    }

    .chat-info {
      flex: 1;
      min-width: 0;
    }

    .chat-info-top {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 0.25rem;
    }

    .chat-name {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .chat-time {
      font-size: 0.7rem;
      color: var(--text-muted);
      flex-shrink: 0;
      margin-left: 0.5rem;
    }

    .chat-last-msg {
      font-size: 0.8rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .chat-main {
      display: flex;
      flex-direction: column;
      background: rgba(7, 11, 20, 0.6);
      position: relative;
    }

    .chat-empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      padding: 2rem;
      text-align: center;
    }

    .chat-empty-icon {
      font-size: 3.5rem;
      margin-bottom: 1rem;
      opacity: 0.4;
    }

    .chat-header {
      padding: 0.85rem 1.25rem;
      border-bottom: 1px solid var(--card-border);
      background: rgba(10, 15, 29, 0.5);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .chat-header-user {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      background-image: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.02) 0%, transparent 60%);
    }

    .chat-messages::-webkit-scrollbar {
      width: 6px;
    }
    .chat-messages::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
    }

    .msg-bubble-wrapper {
      display: flex;
      flex-direction: column;
      max-width: 72%;
    }

    .msg-bubble-wrapper.outbound {
      align-self: flex-end;
      align-items: flex-end;
    }

    .msg-bubble-wrapper.inbound {
      align-self: flex-start;
      align-items: flex-start;
    }

    .msg-bubble {
      padding: 0.65rem 0.95rem;
      border-radius: 12px;
      font-size: 0.875rem;
      line-height: 1.45;
      word-break: break-word;
      position: relative;
    }

    .msg-bubble-wrapper.outbound .msg-bubble {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.22) 0%, rgba(16, 185, 129, 0.16) 100%);
      border: 1px solid rgba(34, 197, 94, 0.35);
      color: #f1f5f9;
      border-bottom-right-radius: 2px;
    }

    .msg-bubble-wrapper.inbound .msg-bubble {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #f1f5f9;
      border-bottom-left-radius: 2px;
    }

    .msg-meta {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.7rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
      padding: 0 0.25rem;
    }

    .chat-input-bar {
      padding: 0.85rem 1.25rem;
      border-top: 1px solid var(--card-border);
      background: rgba(10, 15, 29, 0.6);
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
  </style>
</head>
<body>

  <!-- Header -->
  <header>
    <a href="#" class="brand">
      <div class="brand-icon">🔊</div>
      <div class="brand-info">
        <h1>EcoHub <span class="tag-badge">v0.1.0</span></h1>
        <p>Ultra-lightweight WhatsApp Gateway</p>
      </div>
    </a>

    <div class="header-actions">
      <div class="status-pill">
        <span class="dot pulse"></span>
        <span>API :${apiPort}</span>
      </div>
      <button class="btn btn-primary" onclick="openNewInstanceModal()">
        <span>+</span> Nova Instância
      </button>
      ${authRequired ? '<button class="btn btn-secondary btn-sm" onclick="logout()">Sair</button>' : ''}
    </div>
  </header>

  <!-- Navigation Tabs -->
  <nav class="tabs-nav">
    <button class="tab-btn active" onclick="switchTab('instances')">
      📱 Instâncias <span class="tab-badge" id="badge-instances">0</span>
    </button>
    <button class="tab-btn" onclick="switchTab('chat')">
      💬 Live Chat
    </button>
    <button class="tab-btn" onclick="switchTab('tester')">
      🚀 Envio de Teste
    </button>
    <button class="tab-btn" onclick="switchTab('webhooks')">
      🪝 Webhooks & Auditoria <span class="tab-badge" id="badge-webhooks">0</span>
    </button>
    <button class="tab-btn" onclick="switchTab('metrics')">
      ⚡ Filas & Anti-Ban
    </button>
  </nav>

  <!-- Main View -->
  <main>
    <!-- TAB 1: INSTANCES -->
    <section id="tab-instances" class="tab-content active">
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-title">Instâncias Totais</span>
          <span class="stat-value" id="stat-total-instances">0</span>
          <span class="stat-desc">Criadas no sistema</span>
        </div>
        <div class="stat-card">
          <span class="stat-title">Conectadas (Online)</span>
          <span class="stat-value" style="color: var(--primary);" id="stat-online-instances">0</span>
          <span class="stat-desc">Prontas para envio e recebimento</span>
        </div>
        <div class="stat-card">
          <span class="stat-title">Driver da Fila</span>
          <span class="stat-value" style="color: var(--indigo); font-size: 1.4rem;" id="stat-queue-driver">-</span>
          <span class="stat-desc" id="stat-queue-info">BullMQ / In-Memory</span>
        </div>
        <div class="stat-card">
          <span class="stat-title">Uptime do Servidor</span>
          <span class="stat-value" style="font-size: 1.4rem;" id="stat-uptime">0s</span>
          <span class="stat-desc">Tempo ativo sem reinício</span>
        </div>
      </div>

      <div class="section-header">
        <h2>Instâncias Ativas</h2>
        <button class="btn btn-secondary btn-sm" onclick="loadInstances()">🔄 Atualizar</button>
      </div>

      <div class="instances-grid" id="instances-list">
        <!-- Rendered via JS -->
      </div>
    </section>

    <!-- TAB 2: TEST SENDER -->
    <section id="tab-tester" class="tab-content">
      <div class="section-header">
        <h2>Laboratório de Envio de Mensagens</h2>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
        <div class="stat-card" style="padding: 1.5rem;">
          <form id="send-form" onsubmit="handleSendMessage(event)">
            <div class="form-group">
              <label>Instância Remetente</label>
              <select id="send-instance" class="form-control" required>
                <!-- Filled via JS -->
              </select>
            </div>

            <div class="form-group">
              <label>Tipo de Mensagem</label>
              <select id="send-type" class="form-control" onchange="toggleSendFields()">
                <option value="text">Texto Simples</option>
                <option value="image">Imagem (URL)</option>
                <option value="video">Vídeo (URL)</option>
                <option value="audio">Áudio PTT / Voice Note (URL)</option>
                <option value="document">Documento (URL)</option>
                <option value="reaction">Reação com Emoji</option>
              </select>
            </div>

            <div class="form-group">
              <label>Telefone Destinatário</label>
              <input type="text" id="send-phone" class="form-control" placeholder="Ex: 5511999999999" required>
              <small style="color: var(--text-muted); font-size: 0.7rem;">Código do país + DDD + Número (ex: 5511...)</small>
            </div>

            <div id="field-text" class="form-group">
              <label>Mensagem de Texto</label>
              <textarea id="send-text" class="form-control" placeholder="Olá pelo ECO WhatsApp Gateway!"></textarea>
            </div>

            <div id="field-media" class="form-group" style="display: none;">
              <label>URL da Mídia (HTTPS pública)</label>
              <input type="url" id="send-url" class="form-control" placeholder="https://example.com/arquivo.jpg">
              <div style="margin-top: 0.5rem;">
                <label>Legenda (Opcional)</label>
                <input type="text" id="send-caption" class="form-control" placeholder="Legenda do arquivo...">
              </div>
            </div>

            <div id="field-reaction" class="form-group" style="display: none;">
              <label>ID da Mensagem para Reagir</label>
              <input type="text" id="send-message-id" class="form-control" placeholder="3EB0...">
              <div style="margin-top: 0.5rem;">
                <label>Emoji</label>
                <input type="text" id="send-emoji" class="form-control" placeholder="👍" style="font-size: 1.2rem; width: 80px;">
              </div>
            </div>

            <button type="submit" id="btn-submit-send" class="btn btn-primary" style="width: 100%; justify-content: center; margin-top: 1rem;">
              🚀 Disparar Mensagem
            </button>
          </form>
        </div>

        <div class="stat-card" style="padding: 1.5rem; display: flex; flex-direction: column;">
          <h3 style="font-size: 0.95rem; margin-bottom: 0.75rem;">Resposta da API</h3>
          <pre id="send-response" class="code-box" style="flex: 1;">Aguardando disparo...</pre>
        </div>
      </div>
    </section>

    <!-- TAB 3: WEBHOOKS -->
    <section id="tab-webhooks" class="tab-content">
      <div class="section-header">
        <h2>Últimos Eventos de Webhook (Despacho com Retentativas)</h2>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-secondary btn-sm" onclick="clearWebhookLogs()">Limpar Logs</button>
          <button class="btn btn-secondary btn-sm" onclick="loadWebhookLogs()">🔄 Atualizar</button>
        </div>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Instância</th>
              <th>Evento</th>
              <th>URL de Destino</th>
              <th>Status</th>
              <th>Tentativa</th>
              <th>Payload</th>
            </tr>
          </thead>
          <tbody id="webhooks-table-body">
            <tr>
              <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                Nenhum evento de webhook recebido ainda.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- TAB 4: METRICS & ANTI-BAN -->
    <section id="tab-metrics" class="tab-content">
      <div class="section-header">
        <h2>Métricas de Fila e Anti-Ban</h2>
        <button class="btn btn-secondary btn-sm" onclick="loadMetrics()">🔄 Atualizar</button>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-title">Fila Ativa (Processando)</span>
          <span class="stat-value" id="metric-active">0</span>
          <span class="stat-desc">Webhooks / envios em andamento</span>
        </div>
        <div class="stat-card">
          <span class="stat-title">Aguardando na Fila</span>
          <span class="stat-value" id="metric-waiting">0</span>
          <span class="stat-desc">Jobs prontos para execução</span>
        </div>
        <div class="stat-card">
          <span class="stat-title">Entregas Concluídas</span>
          <span class="stat-value" style="color: var(--primary);" id="metric-completed">0</span>
          <span class="stat-desc">Webhooks despachados com sucesso</span>
        </div>
        <div class="stat-card">
          <span class="stat-title">Falhas / DLQ</span>
          <span class="stat-value" style="color: var(--danger);" id="metric-failed">0</span>
          <span class="stat-desc">Jobs após todas as retentativas</span>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 1.5rem;">
        <div class="stat-card" style="padding: 1.5rem;">
          <h3 style="font-size: 1rem; margin-bottom: 1rem; font-weight: 600;">Configurações Anti-Ban do Gateway</h3>
          <div class="instance-meta-row">
            <span class="instance-meta-label">Janela Máxima de Envio:</span>
            <span class="instance-meta-value mono" id="cfg-rate-max">-</span>
          </div>
          <div class="instance-meta-row">
            <span class="instance-meta-label">Duração da Janela:</span>
            <span class="instance-meta-value mono" id="cfg-duration-ms">-</span>
          </div>
          <div class="instance-meta-row">
            <span class="instance-meta-label">Delay Mínimo Humanizado:</span>
            <span class="instance-meta-value mono" id="cfg-min-delay">-</span>
          </div>
          <div class="instance-meta-row">
            <span class="instance-meta-label">Delay Máximo Humanizado:</span>
            <span class="instance-meta-value mono" id="cfg-max-delay">-</span>
          </div>
        </div>

        <div class="stat-card" style="padding: 1.5rem;">
          <h3 style="font-size: 1rem; margin-bottom: 1rem; font-weight: 600;">Token Bucket por Instância</h3>
          <div id="rate-limiters-list">
            <!-- Rendered via JS -->
          </div>
        </div>
      </div>
    </section>

    <!-- TAB: LIVE CHAT -->
    <section id="tab-chat" class="tab-content">
      <div class="chat-layout">
        <!-- Sidebar -->
        <div class="chat-sidebar">
          <div class="chat-sidebar-header">
            <div>
              <label style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.35rem; display: block; font-weight: 600;">Instância WhatsApp</label>
              <select id="chat-instance-select" class="form-control" onchange="onChatInstanceChange()">
                <option value="">Selecione uma instância...</option>
              </select>
            </div>
            <div class="chat-search-bar">
              <input type="text" id="chat-search" class="form-control" placeholder="Buscar conversa..." oninput="filterChatList()">
              <button class="btn btn-primary btn-sm" onclick="openNewChatModal()" title="Nova Conversa">＋</button>
            </div>
          </div>
          <div class="chat-list" id="chat-list-container">
            <div style="padding: 2rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
              Selecione uma instância para carregar as conversas.
            </div>
          </div>
        </div>

        <!-- Main Chat Area -->
        <div class="chat-main" id="chat-main-area">
          <div class="chat-empty-state" id="chat-empty-state">
            <div class="chat-empty-icon">💬</div>
            <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem; color: var(--text);">Nenhuma conversa selecionada</h3>
            <p style="font-size: 0.85rem; max-width: 400px; line-height: 1.5;">
              Selecione um contato na lista à esquerda ou clique em <strong>＋</strong> para iniciar um novo chat com qualquer número.
            </p>
          </div>

          <div id="chat-active-box" style="display: none; flex-direction: column; height: 100%;">
            <div class="chat-header">
              <div class="chat-header-user">
                <div class="chat-avatar" id="chat-header-avatar">?</div>
                <div>
                  <div style="font-weight: 600; font-size: 0.95rem;" id="chat-header-name">-</div>
                  <div class="mono" style="font-size: 0.75rem; color: var(--text-muted);" id="chat-header-jid">-</div>
                </div>
              </div>
              <div style="display: flex; gap: 0.5rem;">
                <button class="btn btn-secondary btn-sm" onclick="refreshCurrentChatMessages()" title="Atualizar mensagens">🔄</button>
              </div>
            </div>

            <div class="chat-messages" id="chat-messages-container">
              <!-- Messages injected here via JS -->
            </div>

            <form class="chat-input-bar" onsubmit="handleSendChatMessage(event)">
              <input type="text" id="chat-msg-input" class="form-control" placeholder="Digite uma mensagem..." autocomplete="off" required>
              <button type="submit" class="btn btn-primary" id="btn-chat-send" style="padding: 0.5rem 1.25rem;">
                ➤ Enviar
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  </main>

  <!-- MODALS -->

  <!-- Modal: Nova Instância -->
  <div id="modal-new-instance" class="modal-backdrop">
    <div class="modal-card">
      <div class="modal-header">
        <h3>Criar Nova Instância</h3>
        <button class="modal-close" onclick="closeModal('modal-new-instance')">&times;</button>
      </div>
      <form onsubmit="handleCreateInstance(event)">
        <div class="modal-body">
          <div class="form-group">
            <label>Nome da Instância (Identificador)</label>
            <input type="text" id="new-name" class="form-control" placeholder="ex: suporte, vendas, financeiro" required>
            <small style="color: var(--text-muted); font-size: 0.7rem;">Apenas letras, números e hífens.</small>
          </div>
          <div class="form-group">
            <label>URL do Webhook (Opcional)</label>
            <input type="url" id="new-webhook" class="form-control" placeholder="https://seu-sistema.com/webhook/whatsapp">
          </div>
          <div class="form-group">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
              <input type="checkbox" id="new-use-pairing" onchange="togglePairingPhoneField(this.checked)">
              <span>Conectar via Pairing Code (8 dígitos) em vez de QR Code</span>
            </label>
          </div>
          <div id="field-pairing-phone" class="form-group" style="display: none;">
            <label>Número do WhatsApp com DDI e DDD</label>
            <input type="text" id="new-pairing-phone" class="form-control" placeholder="5511999999999">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModal('modal-new-instance')">Cancelar</button>
          <button type="submit" id="btn-create-submit" class="btn btn-primary">Criar e Inicializar</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal: QR Code Scanner -->
  <div id="modal-qr" class="modal-backdrop">
    <div class="modal-card" style="text-align: center;">
      <div class="modal-header">
        <h3 id="qr-modal-title">Escanear QR Code</h3>
        <button class="modal-close" onclick="closeModal('modal-qr')">&times;</button>
      </div>
      <div class="modal-body">
        <div class="qr-container">
          <p style="font-size: 0.85rem; color: var(--text-muted);">
            Abra o WhatsApp no celular &gt; Aparelhos conectados &gt; Conectar um aparelho
          </p>
          <img id="qr-image-src" class="qr-image" src="" alt="QR Code WhatsApp">
          <div id="qr-loading" style="display: none; padding: 2.5rem 0;">
            <p style="color: var(--primary); font-weight: 500; font-size: 1.1rem;">⏳ Gerando QR Code...</p>
            <p style="color: var(--text-muted); font-size: 0.75rem; margin-top: 0.4rem;">Conectando aos servidores do WhatsApp</p>
          </div>
          <div id="qr-expired" style="display: none; padding: 2rem 0;">
            <p style="color: var(--warning); font-weight: 600; font-size: 1.05rem;">⚠️ QR Code expirou</p>
            <p style="color: var(--text-muted); font-size: 0.8rem; margin: 0.5rem 0 1rem;">O WhatsApp expira códigos não escaneados após ~30s.</p>
            <button class="btn btn-primary btn-sm" onclick="refreshCurrentQr()">🔄 Gerar Novo QR Code</button>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; max-width: 250px; margin-top: 0.75rem;">
            <p id="qr-status-text" class="mono" style="font-size: 0.75rem; color: var(--text-muted);">Ao vivo via SSE + Polling</p>
            <button class="btn btn-secondary btn-sm" style="font-size: 0.75rem;" onclick="refreshCurrentQr()">🔄 Renovar</button>
          </div>
        </div>
      </div>
      <div class="modal-footer" style="justify-content: center;">
        <button type="button" class="btn btn-secondary" onclick="closeModal('modal-qr')">Fechar</button>
      </div>
    </div>
  </div>

  <!-- Modal: Pairing Code -->
  <div id="modal-pairing" class="modal-backdrop">
    <div class="modal-card" style="text-align: center;">
      <div class="modal-header">
        <h3>Código de Pareamento (Pairing Code)</h3>
        <button class="modal-close" onclick="closeModal('modal-pairing')">&times;</button>
      </div>
      <div class="modal-body">
        <p style="font-size: 0.85rem; color: var(--text-muted);">
          Insira este código de 8 dígitos na notificação do WhatsApp:
        </p>
        <div class="pairing-box mono" id="pairing-code-display">--------</div>
        <p style="font-size: 0.75rem; color: var(--text-muted);">
          Válido por cerca de 1 a 2 minutos.
        </p>
      </div>
      <div class="modal-footer" style="justify-content: center;">
        <button type="button" class="btn btn-secondary" onclick="closeModal('modal-pairing')">Concluir</button>
      </div>
    </div>
  </div>

  <!-- Modal: Configurar Webhook -->
  <div id="modal-webhook-config" class="modal-backdrop">
    <div class="modal-card">
      <div class="modal-header">
        <h3>Configurar Webhook</h3>
        <button class="modal-close" onclick="closeModal('modal-webhook-config')">&times;</button>
      </div>
      <form onsubmit="handleSaveWebhook(event)">
        <div class="modal-body">
          <input type="hidden" id="webhook-instance-name">
          <div class="form-group">
            <label>URL do Webhook</label>
            <input type="url" id="webhook-url-input" class="form-control" placeholder="https://seu-sistema.com/whatsapp" required>
          </div>
          <div class="form-group">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
              <input type="checkbox" id="webhook-enabled-input" checked>
              <span>Disparar webhooks para esta instância</span>
            </label>
          </div>
          <div class="form-group" style="margin-top: 1rem; border-top: 1px solid var(--card-border); padding-top: 0.75rem;">
            <label style="margin-bottom: 0.5rem; display: block; font-weight: 600; font-size: 0.85rem;">Eventos Ativos</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem;">
              <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; font-size: 0.85rem;">
                <input type="checkbox" id="webhook-evt-message-received" checked>
                <span>📥 Mensagens Recebidas</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; font-size: 0.85rem;">
                <input type="checkbox" id="webhook-evt-message-status" checked>
                <span>📬 Status de Mensagens</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; font-size: 0.85rem;">
                <input type="checkbox" id="webhook-evt-connection-update" checked>
                <span>🔌 Conexão (Open/Close)</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; font-size: 0.85rem;">
                <input type="checkbox" id="webhook-evt-qrcode-updated">
                <span>📷 QR Code Atualizado</span>
              </label>
            </div>
            <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.4rem; display: block;">
              Selecione quais eventos despachar para a URL acima.
            </span>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModal('modal-webhook-config')">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar Webhook</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal: Ajustes da Instância -->
  <div id="modal-instance-settings" class="modal-backdrop">
    <div class="modal-card">
      <div class="modal-header">
        <h3>⚙️ Ajustes de Comportamento</h3>
        <button class="modal-close" onclick="closeModal('modal-instance-settings')">&times;</button>
      </div>
      <form onsubmit="handleSaveSettings(event)">
        <div class="modal-body">
          <input type="hidden" id="settings-instance-name">
          
          <div class="form-group">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-weight: 500;">
              <input type="checkbox" id="settings-reject-calls" onchange="toggleRejectCallMsg(this.checked)">
              <span>🚫 Rejeitar Chamadas Automaticamente</span>
            </label>
            <span style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-top: 0.25rem;">
              Recusa chamadas de voz e vídeo recebidas no WhatsApp instantaneamente.
            </span>
          </div>

          <div class="form-group" id="group-reject-msg" style="display: none; margin-left: 1.5rem;">
            <label style="font-size: 0.85rem;">Mensagem de Recusa (Opcional)</label>
            <input type="text" id="settings-reject-msg" class="form-control" placeholder="ex: Este número não aceita chamadas, envie texto.">
          </div>

          <div class="form-group">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-weight: 500;">
              <input type="checkbox" id="settings-ignore-groups">
              <span>👥 Ignorar Mensagens de Grupos</span>
            </label>
            <span style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-top: 0.25rem;">
              Não processa mensagens vindas de grupos, economizando banda e fila.
            </span>
          </div>

          <div class="form-group">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-weight: 500;">
              <input type="checkbox" id="settings-always-online">
              <span>🟢 Sempre Online</span>
            </label>
            <span style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-top: 0.25rem;">
              Mantém a presença da instância como 'Disponível' no WhatsApp.
            </span>
          </div>

          <div class="form-group">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-weight: 500;">
              <input type="checkbox" id="settings-auto-read">
              <span>👀 Marcar como Lido Automático (Auto-Read)</span>
            </label>
            <span style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-top: 0.25rem;">
              Envia confirmação de leitura (dois tiques azuis) assim que a mensagem chega.
            </span>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModal('modal-instance-settings')">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar Ajustes</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal: Ver Payload -->
  <div id="modal-payload" class="modal-backdrop">
    <div class="modal-card" style="max-width: 650px;">
      <div class="modal-header">
        <h3>Payload do Webhook</h3>
        <button class="modal-close" onclick="closeModal('modal-payload')">&times;</button>
      </div>
      <div class="modal-body">
        <pre id="payload-content" class="code-box" style="max-height: 400px;"></pre>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="copyPayload()">Copiar JSON</button>
        <button type="button" class="btn btn-primary" onclick="closeModal('modal-payload')">Fechar</button>
      </div>
    </div>
  </div>

  <!-- Modal: Nova Conversa (Chat) -->
  <div id="modal-new-chat" class="modal-backdrop">
    <div class="modal-card" style="max-width: 480px;">
      <div class="modal-header">
        <h3>Iniciar Nova Conversa</h3>
        <button class="modal-close" onclick="closeModal('modal-new-chat')">&times;</button>
      </div>
      <form onsubmit="handleStartNewChat(event)">
        <div class="modal-body">
          <div class="form-group">
            <label>Número do WhatsApp (com DDI e DDD)</label>
            <input type="text" id="new-chat-phone" class="form-control" placeholder="ex: 5511999999999" required>
            <small style="color: var(--text-muted); font-size: 0.75rem;">Digite o número com código do país (DDI) e código de área (DDD), apenas dígitos.</small>
          </div>
          <div class="form-group">
            <label>Nome do Contato (Opcional)</label>
            <input type="text" id="new-chat-name" class="form-control" placeholder="ex: João Silva">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModal('modal-new-chat')">Cancelar</button>
          <button type="submit" class="btn btn-primary">Abrir Chat</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Toast Notification -->
  <div id="toast">Notificação</div>

  <!-- Scripts -->
  <script>
    let currentInstances = [];
    let currentActiveQrInstance = null;

    // Toast Notification Helper
    function showToast(message, type = 'info') {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.className = 'show ' + (type === 'success' ? 'success' : type === 'error' ? 'error' : '');
      setTimeout(() => { toast.className = ''; }, 3500);
    }

    // Tab Navigation
    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick')?.includes(tabId));
      if (btn) btn.classList.add('active');
      
      const content = document.getElementById('tab-' + tabId);
      if (content) content.classList.add('active');

      if (tabId === 'instances') loadInstances();
      if (tabId === 'chat') initChatTab();
      if (tabId === 'webhooks') loadWebhookLogs();
      if (tabId === 'metrics') loadMetrics();
      if (tabId === 'tester') updateTesterInstances();
    }

    // Modal Helpers
    function openModal(id) { document.getElementById(id)?.classList.add('show'); }
    let qrPollInterval = null;

    function closeModal(id) {
      document.getElementById(id)?.classList.remove('show');
      if (id === 'modal-qr') {
        currentActiveQrInstance = null;
        if (qrPollInterval) {
          clearInterval(qrPollInterval);
          qrPollInterval = null;
        }
      }
    }

    function openNewInstanceModal() {
      document.getElementById('new-name').value = '';
      document.getElementById('new-webhook').value = '';
      document.getElementById('new-use-pairing').checked = false;
      togglePairingPhoneField(false);
      openModal('modal-new-instance');
    }

    function togglePairingPhoneField(checked) {
      document.getElementById('field-pairing-phone').style.display = checked ? 'block' : 'none';
    }

    // Toggle fields in tester
    function toggleSendFields() {
      const type = document.getElementById('send-type').value;
      document.getElementById('field-text').style.display = type === 'text' ? 'block' : 'none';
      document.getElementById('field-media').style.display = ['image', 'video', 'audio', 'document'].includes(type) ? 'block' : 'none';
      document.getElementById('field-reaction').style.display = type === 'reaction' ? 'block' : 'none';
    }

    // Load System Status
    async function loadStatus() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        if (data.success) {
          document.getElementById('stat-queue-driver').textContent = data.queueDriver.toUpperCase();
          document.getElementById('stat-uptime').textContent = formatUptime(data.uptime);
          document.getElementById('badge-instances').textContent = data.instancesCount;
          document.getElementById('stat-total-instances').textContent = data.instancesCount;
        }
      } catch (err) {
        console.error('Failed to load status', err);
      }
    }

    // Load Instances
    async function loadInstances() {
      try {
        const res = await fetch('/api/instances');
        const data = await res.json();
        if (data.success) {
          currentInstances = data.instances;
          renderInstances(currentInstances);
          updateTesterInstances();
        }
      } catch (err) {
        showToast('Erro ao carregar instâncias', 'error');
      }
    }

    function renderInstances(instances) {
      const list = document.getElementById('instances-list');
      const onlineCount = instances.filter(i => i.status === 'open').length;
      document.getElementById('stat-online-instances').textContent = onlineCount;
      document.getElementById('stat-total-instances').textContent = instances.length;
      document.getElementById('badge-instances').textContent = instances.length;

      if (instances.length === 0) {
        list.innerHTML = \`
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: var(--card-bg); border-radius: 12px; border: 1px solid var(--card-border);">
            <p style="color: var(--text-muted); margin-bottom: 1rem;">Nenhuma instância criada no momento.</p>
            <button class="btn btn-primary" onclick="openNewInstanceModal()">+ Criar Primeira Instância</button>
          </div>
        \`;
        return;
      }

      list.innerHTML = instances.map(inst => {
        const statusMap = {
          open: { label: 'Online', class: 'status-open', dot: '' },
          connecting: { label: 'Conectando...', class: 'status-connecting', dot: 'pulse' },
          close: { label: 'Desconectado', class: 'status-close', dot: 'red' },
        };
        const st = statusMap[inst.status] || statusMap.close;

        return \`
          <div class="instance-card">
            <div class="instance-card-header">
              <div>
                <div class="instance-name">\${inst.name}</div>
                <div class="instance-phone">\${inst.phone ? '+' + inst.phone : 'Nenhum número vinculado'}</div>
              </div>
              <span class="status-badge \${st.class}">
                <span class="dot \${st.dot}"></span>
                \${st.label}
              </span>
            </div>

            <div>
              <div class="instance-meta-row">
                <span class="instance-meta-label">Webhook:</span>
                <span class="instance-meta-value">\${inst.webhook?.enabled ? '🟢 Ativo' : '⚪ Inativo'}</span>
              </div>
              <div class="instance-meta-row">
                <span class="instance-meta-label">Tokens Anti-Ban:</span>
                <span class="instance-meta-value mono">\${inst.rateLimiter?.tokens ?? 1} disponíveis (fila: \${inst.rateLimiter?.queueSize ?? 0})</span>
              </div>
              <div class="instance-meta-row">
                <span class="instance-meta-label">Conectado em:</span>
                <span class="instance-meta-value">\${inst.connectedAt ? new Date(inst.connectedAt).toLocaleTimeString() : '-'}</span>
              </div>
              <div class="instance-meta-row">
                <span class="instance-meta-label">Ajustes:</span>
                <span class="instance-meta-value" style="font-size: 0.75rem;">
                  \${[
                    inst.settings?.rejectCalls ? '🚫 Anti-Chamada' : '',
                    inst.settings?.ignoreGroups ? '👥 Ignora Grupos' : '',
                    inst.settings?.alwaysOnline ? '🟢 Online' : '',
                    inst.settings?.autoRead ? '👀 Auto-Read' : '',
                  ].filter(Boolean).join(' • ') || '⚪ Padrão'}
                </span>
              </div>
            </div>

            <div class="instance-actions">
              \${inst.status === 'close' ? \`
                <button class="btn btn-secondary btn-sm" onclick="connectInstance('\${inst.name}')">🔌 Conectar</button>
              \` : ''}
              
              \${inst.status !== 'open' ? \`
                <button class="btn btn-secondary btn-sm" onclick="showQrModal('\${inst.name}')">📷 QR Code</button>
                <button class="btn btn-secondary btn-sm" onclick="promptPairingCode('\${inst.name}')">🔢 Pairing Code</button>
              \` : ''}

              \${inst.status === 'open' ? \`
                <button class="btn btn-primary btn-sm" onclick="quickTest('\${inst.name}')">💬 Enviar</button>
                <button class="btn btn-secondary btn-sm" onclick="disconnectInstance('\${inst.name}')">🔌 Desconectar</button>
              \` : ''}

              <button class="btn btn-secondary btn-sm" onclick="openSettingsModal('\${inst.name}')">⚙️ Ajustes</button>
              <button class="btn btn-secondary btn-sm" onclick="openWebhookConfig('\${inst.name}')">🪝 Webhook</button>
              <button class="btn btn-danger btn-sm" onclick="deleteInstance('\${inst.name}')">🗑️</button>
            </div>
          </div>
        \`;
      }).join('');
    }

    // Connect & Disconnect
    async function connectInstance(name) {
      try {
        const res = await fetch(\`/api/instances/\${name}/connect\`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast(\`Conectando '\${name}'...\`, 'success');
          showQrModal(name);
          loadInstances();
        } else {
          showToast(data.error || 'Falha ao conectar', 'error');
        }
      } catch {
        showToast('Erro de conexão com o servidor', 'error');
      }
    }

    async function disconnectInstance(name) {
      if (!confirm(\`Deseja realmente desconectar a instância '\${name}'?\`)) return;
      try {
        const res = await fetch(\`/api/instances/\${name}/disconnect\`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast(\`Instância '\${name}' desconectada\`, 'info');
          loadInstances();
        }
      } catch {
        showToast('Erro ao desconectar', 'error');
      }
    }

    async function deleteInstance(name) {
      if (!confirm(\`ATENÇÃO: Deseja apagar a instância '\${name}' e todas as credenciais salvas?\`)) return;
      try {
        const res = await fetch(\`/api/instances/\${name}\`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          showToast(\`Instância '\${name}' removida com sucesso\`, 'success');
          loadInstances();
        }
      } catch {
        showToast('Erro ao excluir instância', 'error');
      }
    }

    // QR Code Modal
    async function showQrModal(name) {
      currentActiveQrInstance = name;
      document.getElementById('qr-modal-title').textContent = \`Conectar: \${name}\`;
      const img = document.getElementById('qr-image-src');
      const loading = document.getElementById('qr-loading');
      const expired = document.getElementById('qr-expired');
      
      img.style.display = 'none';
      if (expired) expired.style.display = 'none';
      loading.style.display = 'block';
      openModal('modal-qr');

      // Se a instância estiver 'close', /api/instances/:name/qr inicia conexão automaticamente

      await fetchQrForModal(name);

      if (qrPollInterval) clearInterval(qrPollInterval);
      qrPollInterval = setInterval(() => {
        if (currentActiveQrInstance) {
          fetchQrForModal(currentActiveQrInstance);
        }
      }, 3000);
    }

    async function fetchQrForModal(name) {
      if (!currentActiveQrInstance || currentActiveQrInstance !== name) return;
      const img = document.getElementById('qr-image-src');
      const loading = document.getElementById('qr-loading');
      const expired = document.getElementById('qr-expired');

      try {
        const res = await fetch(\`/api/instances/\${name}/qr\`);
        const data = await res.json();
        if (data.status === 'open') {
          closeModal('modal-qr');
          showToast(\`Instância '\${name}' conectou com sucesso!\`, 'success');
          loadInstances();
          return;
        }

        if (data.qr) {
          img.src = data.qr;
          img.style.display = 'block';
          loading.style.display = 'none';
          if (expired) expired.style.display = 'none';
        } else if (data.status === 'close' && !img.src) {
          img.style.display = 'none';
          loading.style.display = 'none';
          if (expired) expired.style.display = 'block';
        } else if (!data.qr && !img.src) {
          img.style.display = 'none';
          if (expired) expired.style.display = 'none';
          loading.style.display = 'block';
        }
      } catch {
        // Ignora erro momentâneo
      }
    }

    async function refreshCurrentQr() {
      if (!currentActiveQrInstance) return;
      const img = document.getElementById('qr-image-src');
      const loading = document.getElementById('qr-loading');
      const expired = document.getElementById('qr-expired');

      img.style.display = 'none';
      if (expired) expired.style.display = 'none';
      loading.style.display = 'block';
      showToast('Solicitando novo QR Code...', 'info');

      try {
        await fetch(\`/api/instances/\${currentActiveQrInstance}/connect\`, { method: 'POST' });
        setTimeout(() => fetchQrForModal(currentActiveQrInstance), 1000);
      } catch {
        showToast('Erro ao solicitar novo QR', 'error');
      }
    }
    // Pairing Code
    async function promptPairingCode(name) {
      const phone = prompt('Digite o número de telefone completo (com código do país e DDD, ex: 5511999999999):');
      if (!phone) return;

      showToast('Gerando código de 8 dígitos...', 'info');
      try {
        const res = await fetch(\`/api/instances/\${name}/pairing-code\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: phone }),
        });
        const data = await res.json();
        if (data.pairingCode) {
          const formatted = data.pairingCode.length === 8 
            ? data.pairingCode.slice(0, 4) + '-' + data.pairingCode.slice(4) 
            : data.pairingCode;
          document.getElementById('pairing-code-display').textContent = formatted;
          openModal('modal-pairing');
        } else {
          showToast(data.error || 'Erro ao gerar código', 'error');
        }
      } catch {
        showToast('Falha na comunicação', 'error');
      }
    }

    // Create Instance
    async function handleCreateInstance(e) {
      e.preventDefault();
      const btn = document.getElementById('btn-create-submit');
      btn.disabled = true;
      btn.textContent = 'Criando...';

      const name = document.getElementById('new-name').value.trim();
      const webhookUrl = document.getElementById('new-webhook').value.trim();
      const usePairingCode = document.getElementById('new-use-pairing').checked;
      const phoneNumber = document.getElementById('new-pairing-phone').value.trim();

      try {
        const res = await fetch('/api/instances', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, webhookUrl, usePairingCode, phoneNumber }),
        });
        const data = await res.json();
        if (data.success) {
          showToast(\`Instância '\${name}' criada com sucesso!\`, 'success');
          closeModal('modal-new-instance');
          loadInstances();
          if (!usePairingCode) {
            setTimeout(() => showQrModal(name), 1000);
          }
        } else {
          showToast(data.error || 'Erro ao criar instância', 'error');
        }
      } catch {
        showToast('Erro ao comunicar com a API', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Criar e Inicializar';
      }
    }

    // Webhook Config
    function openWebhookConfig(name) {
      const inst = currentInstances.find(i => i.name === name);
      const url = inst?.webhook?.url || '';
      const enabled = Boolean(inst?.webhook?.enabled);
      const events = Array.isArray(inst?.webhook?.events) && inst.webhook.events.length > 0
        ? inst.webhook.events
        : ['message.received', 'message.status', 'connection.update'];

      document.getElementById('webhook-instance-name').value = name;
      document.getElementById('webhook-url-input').value = url;
      document.getElementById('webhook-enabled-input').checked = enabled;

      document.getElementById('webhook-evt-message-received').checked = events.includes('message.received');
      document.getElementById('webhook-evt-message-status').checked = events.includes('message.status');
      document.getElementById('webhook-evt-connection-update').checked = events.includes('connection.update') || events.includes('connection.open');
      document.getElementById('webhook-evt-qrcode-updated').checked = events.includes('qrcode.updated');

      openModal('modal-webhook-config');
    }

    async function handleSaveWebhook(e) {
      e.preventDefault();
      const name = document.getElementById('webhook-instance-name').value;
      const url = document.getElementById('webhook-url-input').value.trim();
      const enabled = document.getElementById('webhook-enabled-input').checked;

      const events = [];
      if (document.getElementById('webhook-evt-message-received').checked) events.push('message.received');
      if (document.getElementById('webhook-evt-message-status').checked) events.push('message.status');
      if (document.getElementById('webhook-evt-connection-update').checked) events.push('connection.update');
      if (document.getElementById('webhook-evt-qrcode-updated').checked) events.push('qrcode.updated');

      try {
        const res = await fetch(\`/api/instances/\${name}/webhook\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, enabled, events }),
        });
        const data = await res.json();
        if (data.success) {
          showToast('Webhook atualizado!', 'success');
          closeModal('modal-webhook-config');
          loadInstances();
        }
      } catch {
        showToast('Erro ao salvar webhook', 'error');
      }
    }

    // Instance Settings
    function toggleRejectCallMsg(checked) {
      document.getElementById('group-reject-msg').style.display = checked ? 'block' : 'none';
    }

    function openSettingsModal(name) {
      const inst = currentInstances.find(i => i.name === name);
      const settings = inst?.settings || {};

      document.getElementById('settings-instance-name').value = name;
      document.getElementById('settings-reject-calls').checked = Boolean(settings.rejectCalls);
      document.getElementById('settings-reject-msg').value = settings.callRejectMessage || '';
      document.getElementById('settings-ignore-groups').checked = Boolean(settings.ignoreGroups);
      document.getElementById('settings-always-online').checked = Boolean(settings.alwaysOnline);
      document.getElementById('settings-auto-read').checked = Boolean(settings.autoRead);

      toggleRejectCallMsg(Boolean(settings.rejectCalls));
      openModal('modal-instance-settings');
    }

    async function handleSaveSettings(e) {
      e.preventDefault();
      const name = document.getElementById('settings-instance-name').value;
      const rejectCalls = document.getElementById('settings-reject-calls').checked;
      const callRejectMessage = document.getElementById('settings-reject-msg').value.trim();
      const ignoreGroups = document.getElementById('settings-ignore-groups').checked;
      const alwaysOnline = document.getElementById('settings-always-online').checked;
      const autoRead = document.getElementById('settings-auto-read').checked;

      try {
        const res = await fetch(\`/api/instances/\${name}/settings\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rejectCalls,
            callRejectMessage: rejectCalls ? callRejectMessage : '',
            ignoreGroups,
            alwaysOnline,
            autoRead,
          }),
        });
        const data = await res.json();
        if (data.success) {
          showToast('Ajustes salvos com sucesso!', 'success');
          closeModal('modal-instance-settings');
          loadInstances();
        }
      } catch {
        showToast('Erro ao salvar ajustes', 'error');
      }
    }

    // Quick Test Helper
    function quickTest(name) {
      switchTab('tester');
      setTimeout(() => {
        document.getElementById('send-instance').value = name;
      }, 100);
    }

    function updateTesterInstances() {
      const select = document.getElementById('send-instance');
      const val = select.value;
      select.innerHTML = currentInstances.map(i => 
        \`<option value="\${i.name}">\${i.name} (\${i.status === 'open' ? '🟢 Conectado' : '⚪ ' + i.status})</option>\`
      ).join('');
      if (val && currentInstances.some(i => i.name === val)) {
        select.value = val;
      }
    }

    // Send Message
    async function handleSendMessage(e) {
      e.preventDefault();
      const instance = document.getElementById('send-instance').value;
      const type = document.getElementById('send-type').value;
      const phone = document.getElementById('send-phone').value.trim();
      const resBox = document.getElementById('send-response');
      const btn = document.getElementById('btn-submit-send');

      if (!instance) {
        showToast('Selecione uma instância', 'error');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Enviando...';
      resBox.textContent = 'Disparando mensagem para a fila anti-ban...';

      let endpoint = \`/api/instances/\${instance}/send/text\`;
      let body = { phone, message: document.getElementById('send-text').value };

      if (['image', 'video', 'audio', 'document'].includes(type)) {
        endpoint = \`/api/instances/\${instance}/send/media\`;
        body = {
          phone,
          type,
          url: document.getElementById('send-url').value,
          caption: document.getElementById('send-caption').value,
        };
      } else if (type === 'reaction') {
        endpoint = \`/api/instances/\${instance}/send/reaction\`;
        body = {
          phone,
          messageId: document.getElementById('send-message-id').value,
          emoji: document.getElementById('send-emoji').value,
        };
      }

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        resBox.textContent = JSON.stringify(data, null, 2);
        if (data.success) {
          showToast('Mensagem enviada com sucesso!', 'success');
        } else {
          showToast(data.error || 'Erro no envio', 'error');
        }
      } catch (err) {
        resBox.textContent = 'Erro ao enviar: ' + err.message;
        showToast('Falha na requisição', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = '🚀 Disparar Mensagem';
      }
    }

    // Webhook Logs
    let cachedPayloads = {};

    async function loadWebhookLogs() {
      try {
        const res = await fetch('/api/webhooks/logs');
        const data = await res.json();
        if (data.success) {
          renderWebhookLogs(data.logs);
          document.getElementById('badge-webhooks').textContent = data.logs.length;
        }
      } catch (err) {
        console.error('Failed to load webhook logs', err);
      }
    }

    function renderWebhookLogs(logs) {
      const tbody = document.getElementById('webhooks-table-body');
      if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 2rem;">Nenhum evento registrado ainda.</td></tr>';
        return;
      }

      cachedPayloads = {};
      tbody.innerHTML = logs.map(l => {
        cachedPayloads[l.id] = l.payload;
        const statusMap = {
          success: '<span style="color: var(--primary);">200 OK</span>',
          retrying: '<span style="color: var(--warning);">Retentando</span>',
          failed: '<span style="color: var(--danger);">Falha DLQ</span>',
          pending: '<span>Pendente</span>'
        };

        return \`
          <tr>
            <td class="mono" style="font-size: 0.75rem;">\${new Date(l.timestamp).toLocaleTimeString()}</td>
            <td><strong>\${l.instance}</strong></td>
            <td><span class="tag-badge">\${l.event}</span></td>
            <td class="mono" style="font-size: 0.75rem; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">\${l.url}</td>
            <td>\${statusMap[l.status] || l.status}</td>
            <td class="mono">\${l.attempt}</td>
            <td>
              <button class="btn btn-secondary btn-sm" onclick="viewPayload('\${l.id}')">JSON</button>
            </td>
          </tr>
        \`;
      }).join('');
    }

    async function clearWebhookLogs() {
      await fetch('/api/webhooks/logs', { method: 'DELETE' });
      loadWebhookLogs();
      showToast('Logs de webhook limpos', 'info');
    }

    function viewPayload(id) {
      const payload = cachedPayloads[id];
      document.getElementById('payload-content').textContent = JSON.stringify(payload, null, 2);
      openModal('modal-payload');
    }

    function copyPayload() {
      const text = document.getElementById('payload-content').textContent;
      navigator.clipboard.writeText(text);
      showToast('JSON copiado!', 'success');
    }

    // Metrics
    async function loadMetrics() {
      try {
        const res = await fetch('/api/metrics');
        const data = await res.json();
        if (data.success) {
          document.getElementById('metric-active').textContent = data.queue.active;
          document.getElementById('metric-waiting').textContent = data.queue.waiting;
          document.getElementById('metric-completed').textContent = data.queue.completed;
          document.getElementById('metric-failed').textContent = data.queue.failed;

          document.getElementById('cfg-rate-max').textContent = data.antiBanConfig.sendRateMax + ' msg';
          document.getElementById('cfg-duration-ms').textContent = (data.antiBanConfig.sendRateDurationMs / 1000) + 's';
          document.getElementById('cfg-min-delay').textContent = data.antiBanConfig.sendMinDelayMs + 'ms';
          document.getElementById('cfg-max-delay').textContent = data.antiBanConfig.sendMaxDelayMs + 'ms';

          const rateBox = document.getElementById('rate-limiters-list');
          if (data.rateLimiters.length === 0) {
            rateBox.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">Nenhuma sessão ativa.</p>';
          } else {
            rateBox.innerHTML = data.rateLimiters.map(r => \`
              <div class="instance-meta-row">
                <span class="instance-meta-label">\${r.instanceName}:</span>
                <span class="instance-meta-value mono">\${r.tokens} tokens livres | fila: \${r.queueSize}</span>
              </div>
            \`).join('');
          }
        }
      } catch (err) {
        console.error('Failed to load metrics', err);
      }
    }

    function formatUptime(seconds) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      if (h > 0) return \`\${h}h \${m}m\`;
      if (m > 0) return \`\${m}m \${s}s\`;
      return \`\${s}s\`;
    }

    // ── Live Chat Logic ────────────────────────────────────────────────────────
    let selectedChatInstance = null;
    let selectedChatJid = null;
    let selectedChatContactName = null;
    let cachedChatList = [];

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function updateChatInstanceOptions() {
      const select = document.getElementById('chat-instance-select');
      if (!select) return;
      const prevVal = select.value || selectedChatInstance;
      const instances = currentInstances || [];

      select.innerHTML = '<option value="">Selecione uma instância...</option>';
      instances.forEach(inst => {
        const opt = document.createElement('option');
        opt.value = inst.name;
        opt.textContent = \`\${inst.name} (\${inst.status === 'open' ? '🟢 Online' : '⚪ ' + inst.status})\`;
        select.appendChild(opt);
      });

      if (prevVal && instances.some(i => i.name === prevVal)) {
        select.value = prevVal;
        selectedChatInstance = prevVal;
      }
    }

    function initChatTab() {
      const select = document.getElementById('chat-instance-select');
      updateChatInstanceOptions();

      const instances = currentInstances || [];
      if (!selectedChatInstance && instances.length > 0) {
        const firstOnline = instances.find(i => i.status === 'open') || instances[0];
        select.value = firstOnline.name;
        selectedChatInstance = firstOnline.name;
      }

      if (selectedChatInstance) {
        loadChatsList();
      }
    }

    function onChatInstanceChange() {
      selectedChatInstance = document.getElementById('chat-instance-select').value;
      selectedChatJid = null;
      selectedChatContactName = null;
      document.getElementById('chat-active-box').style.display = 'none';
      document.getElementById('chat-empty-state').style.display = 'flex';
      if (selectedChatInstance) {
        loadChatsList();
      } else {
        document.getElementById('chat-list-container').innerHTML = 
          '<div style="padding: 2rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">Selecione uma instância para carregar as conversas.</div>';
      }
    }

    async function loadChatsList() {
      if (!selectedChatInstance) return;
      try {
        const res = await fetch(\`/api/instances/\${encodeURIComponent(selectedChatInstance)}/chats\`);
        const data = await res.json();
        if (data.success) {
          cachedChatList = data.chats || [];
          renderChatList(cachedChatList);
        }
      } catch (err) {
        console.error('Erro ao carregar chats:', err);
      }
    }

    function renderChatList(chats) {
      const container = document.getElementById('chat-list-container');
      if (!chats || chats.length === 0) {
        container.innerHTML = \`
          <div style="padding: 2.5rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
            Nenhuma conversa recente registrada.<br>
            <button class="btn btn-secondary btn-sm" style="margin-top: 0.75rem;" onclick="openNewChatModal()">＋ Iniciar Conversa</button>
          </div>\`;
        return;
      }

      let html = '';
      chats.forEach(c => {
        const isSelected = c.remoteJid === selectedChatJid;
        const displayName = c.name || c.remoteJid.split('@')[0];
        const initials = displayName.substring(0, 2).toUpperCase();
        const timeStr = c.lastTimestamp ? new Date(c.lastTimestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        const lastMsg = escapeHtml(c.lastMessage || 'Conversa iniciada');

        html += \`
          <div class="chat-item \${isSelected ? 'active' : ''}" onclick="selectChat('\${escapeHtml(c.remoteJid)}', '\${escapeHtml(displayName)}')">
            <div class="chat-avatar">\${escapeHtml(initials)}</div>
            <div class="chat-info">
              <div class="chat-info-top">
                <span class="chat-name">\${escapeHtml(displayName)}</span>
                <span class="chat-time">\${timeStr}</span>
              </div>
              <div class="chat-last-msg">\${lastMsg}</div>
            </div>
          </div>\`;
      });
      container.innerHTML = html;
    }

    function filterChatList() {
      const q = (document.getElementById('chat-search').value || '').toLowerCase().trim();
      if (!q) {
        renderChatList(cachedChatList);
        return;
      }
      const filtered = cachedChatList.filter(c => 
        (c.name && c.name.toLowerCase().includes(q)) ||
        c.remoteJid.toLowerCase().includes(q) ||
        (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
      );
      renderChatList(filtered);
    }

    function openNewChatModal() {
      document.getElementById('new-chat-phone').value = '';
      document.getElementById('new-chat-name').value = '';
      openModal('modal-new-chat');
    }

    function handleStartNewChat(e) {
      e.preventDefault();
      const phoneInput = document.getElementById('new-chat-phone').value.trim();
      const contactName = document.getElementById('new-chat-name').value.trim();
      const digits = phoneInput.replace(/\\D/g, '');
      if (digits.length < 8) {
        showToast('Número de WhatsApp inválido (mínimo 8 dígitos com DDD/DDI).', 'error');
        return;
      }
      const jid = digits + '@s.whatsapp.net';
      closeModal('modal-new-chat');

      const existing = cachedChatList.find(c => c.remoteJid === jid);
      if (!existing) {
        cachedChatList.unshift({
          remoteJid: jid,
          name: contactName || digits,
          lastMessage: 'Nova conversa iniciada',
          lastTimestamp: Math.floor(Date.now() / 1000),
          unreadCount: 0
        });
      }
      selectChat(jid, contactName || digits);
    }

    async function selectChat(jid, name) {
      selectedChatJid = jid;
      selectedChatContactName = name || jid.split('@')[0];

      renderChatList(cachedChatList);

      document.getElementById('chat-empty-state').style.display = 'none';
      const box = document.getElementById('chat-active-box');
      box.style.display = 'flex';

      document.getElementById('chat-header-name').textContent = selectedChatContactName;
      document.getElementById('chat-header-jid').textContent = jid;
      document.getElementById('chat-header-avatar').textContent = selectedChatContactName.substring(0, 2).toUpperCase();

      await refreshCurrentChatMessages();
      document.getElementById('chat-msg-input').focus();
    }

    async function refreshCurrentChatMessages() {
      if (!selectedChatInstance || !selectedChatJid) return;
      try {
        const res = await fetch(\`/api/instances/\${encodeURIComponent(selectedChatInstance)}/chats/\${encodeURIComponent(selectedChatJid)}/messages\`);
        const data = await res.json();
        if (data.success) {
          renderMessages(data.messages || []);
        }
      } catch (err) {
        console.error('Erro ao carregar mensagens:', err);
      }
    }

    function renderMessages(messages) {
      const container = document.getElementById('chat-messages-container');
      if (!messages || messages.length === 0) {
        container.innerHTML = \`
          <div style="flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 0.85rem;">
            Nenhuma mensagem neste chat ainda. Envie a primeira mensagem abaixo!
          </div>\`;
        return;
      }

      let html = '';
      messages.forEach(m => {
        const isOut = Boolean(m.fromMe);
        const timeStr = m.timestamp ? new Date(m.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        const sender = !isOut && m.senderName ? \`<div style="font-size: 0.75rem; font-weight: 600; color: var(--indigo); margin-bottom: 2px;">\${escapeHtml(m.senderName)}</div>\` : '';
        const tick = isOut ? ' ✓✓' : '';

        html += \`
          <div class="msg-bubble-wrapper \${isOut ? 'outbound' : 'inbound'}">
            <div class="msg-bubble">
              \${sender}
              \${escapeHtml(m.text)}
            </div>
            <div class="msg-meta">
              <span>\${timeStr}</span>\${tick ? \`<span style="color: var(--primary);">\${tick}</span>\` : ''}
            </div>
          </div>\`;
      });
      container.innerHTML = html;
      container.scrollTop = container.scrollHeight;
    }

    async function handleSendChatMessage(e) {
      e.preventDefault();
      if (!selectedChatInstance || !selectedChatJid) return;
      const input = document.getElementById('chat-msg-input');
      const text = input.value.trim();
      if (!text) return;

      const btn = document.getElementById('btn-chat-send');
      btn.disabled = true;

      try {
        const res = await fetch(\`/api/instances/\${encodeURIComponent(selectedChatInstance)}/chats/\${encodeURIComponent(selectedChatJid)}/messages\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });
        const data = await res.json();
        if (data.success) {
          input.value = '';
          appendMessageBubble({
            id: data.message?.id || String(Date.now()),
            fromMe: true,
            remoteJid: selectedChatJid,
            text,
            timestamp: Math.floor(Date.now() / 1000)
          });
          loadChatsList();
        } else {
          showToast('Erro ao enviar mensagem: ' + (data.error || 'Desconhecido'), 'error');
        }
      } catch (err) {
        showToast('Falha na comunicação: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        input.focus();
      }
    }

    function appendMessageBubble(msg) {
      const container = document.getElementById('chat-messages-container');
      const isOut = Boolean(msg.fromMe);
      const timeStr = msg.timestamp ? new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      const tick = isOut ? ' ✓✓' : '';
      const sender = !isOut && msg.senderName ? \`<div style="font-size: 0.75rem; font-weight: 600; color: var(--indigo); margin-bottom: 2px;">\${escapeHtml(msg.senderName)}</div>\` : '';

      if (container.children.length === 1 && !container.children[0].classList.contains('msg-bubble-wrapper')) {
        container.innerHTML = '';
      }

      const div = document.createElement('div');
      div.className = \`msg-bubble-wrapper \${isOut ? 'outbound' : 'inbound'}\`;
      div.innerHTML = \`
        <div class="msg-bubble">
          \${sender}
          \${escapeHtml(msg.text)}
        </div>
        <div class="msg-meta">
          <span>\${timeStr}</span>\${tick ? \`<span style="color: var(--primary);">\${tick}</span>\` : ''}
        </div>\`;
      container.appendChild(div);
      container.scrollTop = container.scrollHeight;
    }

    // Real-Time Server-Sent Events (SSE)
    function setupSSE() {
      const es = new EventSource('/api/events');
      
      es.addEventListener('webhook.log', (e) => {
        const log = JSON.parse(e.data);
        const badge = document.getElementById('badge-webhooks');
        badge.textContent = Number(badge.textContent) + 1;
        showToast(\`Webhook: \${log.event} (\${log.instance})\`, log.status === 'success' ? 'success' : 'info');
        loadWebhookLogs();
      });

      es.addEventListener('chat.message', (e) => {
        try {
          const payload = JSON.parse(e.data);
          const msg = payload.message;
          if (!msg) return;

          // Se for da instância e chat ativo, renderiza a bolha em tempo real
          if (payload.instance === selectedChatInstance && msg.remoteJid === selectedChatJid) {
            appendMessageBubble(msg);
          }

          // Se for da instância atualmente selecionada, atualiza lista de conversas
          if (payload.instance === selectedChatInstance) {
            loadChatsList();
          }
        } catch (err) {
          console.error('Erro ao processar SSE chat.message:', err);
        }
      });

      es.addEventListener('heartbeat', (e) => {
        const data = JSON.parse(e.data);
        document.getElementById('stat-uptime').textContent = formatUptime(data.uptime);
        if (data.instances) {
          currentInstances = data.instances;
          renderInstances(currentInstances);
          updateChatInstanceOptions();

          // Se tiver modal de QR aberto para a instância e ela conectou ou tem novo QR
          if (currentActiveQrInstance) {
            const curr = data.instances.find(i => i.name === currentActiveQrInstance);
            if (curr?.status === 'open') {
              closeModal('modal-qr');
              showToast(\`Instância '\${currentActiveQrInstance}' conectou com sucesso!\`, 'success');
            } else if (curr?.qrCode) {
              const img = document.getElementById('qr-image-src');
              const loading = document.getElementById('qr-loading');
              const expired = document.getElementById('qr-expired');
              img.src = curr.qrCode;
              img.style.display = 'block';
              loading.style.display = 'none';
              expired.style.display = 'none';
            }
          }
        }
      });

      es.onerror = () => {
        // Reconexão automática é nativa do EventSource
      };
    }

    async function logout() {
      try {
        await fetch('/auth/logout', { method: 'POST' });
      } catch {
        // Fallback caso a requisição falhe
      }
      window.location.href = '/login';
    }

    // Init
    window.addEventListener('DOMContentLoaded', () => {
      loadStatus();
      loadInstances();
      setupSSE();
    });
  </script>
</body>
</html>`;
}
