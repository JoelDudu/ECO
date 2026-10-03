# ECO — WhatsApp Gateway & Listener

<p align="center">
  <strong>Gateway WhatsApp ultra-leve, multi-instância e resiliente baseado em Baileys e TypeScript.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20+-68a063?style=flat-square&logo=node.js" alt="Node.js 20+" />
  <img src="https://img.shields.io/badge/TypeScript-5.5-3178c6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Baileys-6.7-25d366?style=flat-square&logo=whatsapp" alt="Baileys" />
  <img src="https://img.shields.io/badge/Queue-BullMQ%20%2B%20Redis-dc382d?style=flat-square&logo=redis" alt="BullMQ & Redis" />
  <img src="https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square" alt="License AGPL-3.0" />
</p>

---

## ⚡ Principais Recursos

- 🚀 **Multi-Instância:** Crie e gerencie múltiplas conexões simultâneas do WhatsApp de forma isolada.
- 🛡️ **Anti-Ban Inteligente:** Rate limiting integrado com janelas de tempo e delays aleatórios para simular digitação humana.
- 📦 **Filas & Mensageria:** Suporte a fila em memória (dev) ou **BullMQ + Redis** (produção) com Dead Letter Queue (DLQ) e retentativas automáticas com backoff exponencial.
- 💾 **Persistência SQLite:** Armazenamento individual de chaves de autenticação por instância em bancos SQLite com suporte a criptografia AES-256-GCM.
- 📊 **EcoHub Dashboard:** Painel visual exclusivo (porta `3001`) para leitura de QR Code em tempo real, monitoramento de instâncias, logs de webhooks e envio de testes.
- 🌐 **Webhooks Confiáveis:** Disparo de eventos em tempo real para seu backend (`message.received`, `connection.update`, `status.update`, etc.).
- 🐳 **Deploy Simplificado:** Dockerfile multi-stage pronto para **EasyPanel**, Coolify, Portainer ou Docker puro.

---

## 🏗️ Arquitetura de Portas

O ECO roda dois servidores Express independentes:

| Serviço | Porta Padrão | Descrição |
|---|---|---|
| **API REST** | `3000` | Endpoints para gerenciamento de instâncias, envio de mensagens e webhooks. |
| **EcoHub Dashboard** | `3001` | Painel visual para conexão via QR Code, status e monitoramento em tempo real. |

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- **Node.js 20+**
- **npm** ou **pnpm**

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/SEU_USUARIO/eco.git
   cd eco
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   ```bash
   cp .env.example .env
   ```
   > Edite o arquivo `.env` para definir sua `API_KEY`, `DASHBOARD_SECRET` e configurações de fila.

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

5. **Acesse as interfaces:**
   - **API Health:** [http://localhost:3000/health](http://localhost:3000/health)
   - **EcoHub Dashboard:** [http://localhost:3001](http://localhost:3001)

---

## 🐳 Deploy no EasyPanel / Docker

O ECO já inclui um `Dockerfile` otimizado em múltiplos estágios com Debian Bookworm Slim, garantindo compatibilidade nativa total com `better-sqlite3` e `sharp`.

### Configuração no EasyPanel

1. **Criar Novo App:**
   - No seu projeto no EasyPanel, selecione **App > GitHub / Git Repository**.
   - Aponte para este repositório no branch `main`.
   - Selecione o método de build: **Dockerfile**.

2. **Configurar Volume Persistente (OBRIGATÓRIO):**
   - Vá na aba **Storage / Mounts**.
   - Adicione um volume com o **Mount Path**:
     ```
     /app/sessions
     ```
     > ⚠️ **Atenção:** A montagem desse volume garante que as sessões e conexões do WhatsApp não sejam perdidas a cada deploy ou reinicialização.

3. **Portas e Domínios:**
   - Adicione as portas do container no EasyPanel:
     - Porta `3000` (API REST) → ex: `api-eco.seudominio.com`
     - Porta `3001` (EcoHub) → ex: `hub-eco.seudominio.com`

4. **Fila Redis (Recomendado para Produção):**
   - No mesmo projeto no EasyPanel, crie um serviço a partir do template **Redis**.
   - Nas variáveis de ambiente do ECO, configure:
     ```env
     QUEUE_DRIVER=redis
     REDIS_URL=redis://default:<senha_do_redis>@<nome_do_servico_redis>:6379
     ```

5. **Variáveis de Ambiente:**
   - Copie os valores de referência do `.env.example` para a aba **Environment** do EasyPanel.

---

## 📡 Endpoints da API REST

Todas as requisições para a API REST (exceto `/health`) exigem autenticação via header:
```http
x-api-key: SUA_CHAVE_API
```

### Instâncias
| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/health` | Status geral do gateway e instâncias ativas (sem auth) |
| `POST` | `/instances` | Cria uma nova instância `{ "name": "atendimento" }` |
| `GET` | `/instances` | Lista todas as instâncias e status de conexão |
| `GET` | `/instances/:name` | Detalhes e status de uma instância específica |
| `GET` | `/instances/:name/qr` | Obtém o QR Code em base64/texto para pareamento |
| `DELETE` | `/instances/:name` | Desconecta e remove a instância |

### Envio de Mensagens
| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/instances/:name/messages/text` | Envia mensagem de texto simples |
| `POST` | `/instances/:name/messages/media` | Envia imagens, documentos (PDF, planilhas), áudios ou vídeos |
| `POST` | `/instances/:name/messages/reaction` | Envia reação com emoji para uma mensagem |

---

## 🛠️ Scripts Disponíveis

```bash
# Executa em modo desenvolvimento com hot reload (tsx)
npm run dev

# Compila o projeto para produção com tsup
npm run build

# Executa o build compilado
npm start

# Validação de tipos do TypeScript
npm run type-check

# Verificação e correção de código com Biome
npm run lint
npm run lint:fix
```

---

## 📄 Licença

Distribuído sob a licença **AGPL-3.0**. Consulte o arquivo [LICENSE](LICENSE) para obter mais informações.
