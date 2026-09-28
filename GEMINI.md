# 🛡️ ECO — REGRAS DO PROJETO PARA ASSISTENTES DE IA

> Este arquivo define o protocolo obrigatório de comportamento para qualquer assistente de IA
> que trabalhe neste repositório. Todos os assistentes (Gemini, Claude, Copilot, etc.) devem
> seguir estas regras sem exceção.

---

## 1. Protocolo Obrigatório ao Reportar Problemas

Sempre que um problema, falha ou comportamento incorreto for reportado:

1. **NÃO alterar código, banco de dados ou configurações imediatamente.**
2. **NUNCA alterar senhas, tokens, chaves de criptografia ou dados sensíveis sem aviso e autorização prévia.**
3. **Apresentar PRIMEIRO o fluxo completo de investigação:**
   - **Hipótese inicial:** O que pode estar gerando o erro.
   - **Fluxo de diagnóstico:** Quais etapas e testes serão executados para isolar a causa raiz.
   - **Arquivos e rotas analisadas:** Onde será investigado.
   - **Avisos de impacto:** Explicar claramente se for necessário algum dado ou credencial.
4. Somente após detalhar o diagnóstico e alinhar a solução com o mantenedor, avançar para a implementação.

---

## 2. Arquitetura e Stack — Nunca Alterar sem Discussão

O ECO foi projetado com escolhas arquiteturais deliberadas. Não substitua tecnologias sem discutir:

| Camada | Tecnologia Definida | Não Substituir Por |
|---|---|---|
| Linguagem | TypeScript strict | JavaScript puro |
| Auth State | SQLite WAL (`better-sqlite3`) | Arquivos JSON soltos |
| ORM | Prisma | Sequelize, TypeORM sem aprovação |
| Filas | BullMQ + Redis | RabbitMQ (exceto se `QUEUE_DRIVER=rabbitmq`) |
| HTTP | Express.js | Fastify, Hono sem aprovação |
| Dev Runner | `tsx` | `ts-node`, `nodemon` |
| Build | `tsup` | `webpack`, `tsc` direto |
| Lint/Format | `@biomejs/biome` | ESLint + Prettier separados |
| Licença | **GNU AGPLv3** | MIT, Apache sem aprovação do mantenedor |

---

## 3. Estrutura de Pastas — Respeitar a Organização

```
src/
├── config/        # Validação de env com Zod — NUNCA ler process.env diretamente fora daqui
├── database/      # Adapters de Auth State (SQLite e PostgreSQL)
├── core/          # SessionManager, InstanceSession, Baileys socket lifecycle
├── queue/         # BullMQ workers, fila em memória e suporte a RabbitMQ
├── controllers/   # Lógica de negócio das rotas HTTP
├── routes/        # Definição de rotas Express — sem lógica aqui
├── docs/          # Schema OpenAPI gerado via zod-to-openapi
├── dashboard/     # EcoHub — arquivos HTML/CSS/JS do painel visual
└── server.ts      # Bootstrap: inicializa Express API e Dashboard em portas separadas
```

**Regras de organização:**
- Toda variável de ambiente deve ser lida **apenas** em `src/config/env.ts` via schema Zod.
- Rotas em `src/routes/` **não** devem conter lógica de negócio — apenas chamar controllers.
- O `server.ts` deve ser **apenas bootstrap** — sem lógica de sessão ou envio de mensagens.

---

## 4. Segurança — Regras Críticas

- **NUNCA** commitar valores reais de `API_KEY`, `APP_ENCRYPTION_KEY`, `REDIS_URL` ou `DATABASE_URL`.
- **NUNCA** logar credenciais, tokens ou chaves de criptografia — nem em nível `debug`.
- O `.env` está no `.gitignore` e **jamais** deve ser adicionado ao commit.
- O `.env.example` deve conter apenas valores fictícios e comentários explicativos.
- A criptografia AES-256-GCM das sessões deve ser mantida — não remover sem aprovação explícita.

---

## 5. Qualidade de Código

- Todo código TypeScript deve passar em `tsc --noEmit` sem erros antes do commit.
- Todo código deve passar no `biome check` sem warnings antes do commit.
- Funções públicas de `SessionManager` e controllers devem ter JSDoc explicativo.
- Evitar `any` — se necessário, usar `unknown` com type guard explícito.
- Prefira `async/await` a callbacks ou `.then()` encadeados.

---

## 6. Padrão de Commits (Conventional Commits)

```
feat: adiciona suporte a pairing code
fix: corrige reconexão após timeout do socket
docs: atualiza README com exemplos em Python
refactor: extrai lógica de webhook para WebhookService
chore: atualiza dependências do Baileys para 6.8.x
test: adiciona testes de integração para SessionManager
```

---

## 7. Contexto do Projeto

- **ECO** é um gateway WhatsApp open-source licenciado sob **GNU AGPLv3**.
- Qualquer modificação que altere o comportamento público da API deve ser refletida no Swagger (`src/docs/`).
- O projeto tem dois servidores HTTP em portas separadas: API (`PORT`) e Dashboard (`DASHBOARD_PORT`).
- O dashboard (`EcoHub`) é **opcional** e pode ser desligado via `DASHBOARD_ENABLED=false`.
- O projeto suporta múltiplas instâncias WhatsApp em um único processo via `SessionManager`.
- A reconexão automática sem QR Code é uma feature **crítica** — nunca quebrá-la.
