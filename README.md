# Leads · Núcleo Tech

Minerador de leads + CRM de prospecção. Busca negócios no Google Maps por nicho e
local, deixa você escolher quais resultados entram no funil e acompanha cada lead
até virar cliente. Hoje é de uso próprio; a estrutura já é multi-conta para virar
SaaS depois.

Stack: Next.js 16 (App Router) + TypeScript + Tailwind/shadcn no app e nas rotas de
API, Supabase (Postgres, Auth, RLS) como banco e login, Apify (Google Maps Scraper)
como fonte dos leads, Vercel para hospedagem.

```bash
npm install
npm run dev        # http://localhost:3000
npm test
npm run typecheck
npm run build
```

Variáveis em `.env.local` (modelo em `.env.example`).

## Telas

- **CRM** (`/crm`): funil em quadro (arrastar entre etapas) ou lista, com filtros
  na URL. Mover para "Perdido" pede o motivo.
- **Buscar leads** (`/buscar`): nicho + estado + cidade (lista do IBGE) + bairro
  opcional, quantidade e filtros, com custo máximo estimado. Histórico de buscas.
- **Resultados** (`/buscar/:id`): resultados da busca com score. Selecione e
  envie ao CRM, ou exporte CSV.
- **Lead** (`/leads/:id`): dados, ligar/WhatsApp, etapa, motivo de perda e
  observações.
- **Importar** (`/importar`): upload manual de export do Apify (CSV/JSON).

## Como funciona

**Contas.** Todo dado pertence a uma organização (`organizacoes` + `membros`),
e a RLS só deixa ver o que é da própria org. Um usuário novo ganha uma org
automaticamente.

**Busca.**
1. `POST /api/buscas` valida, grava a busca e dispara o actor
   `compass/crawler-google-places` com teto de custo (`maxTotalChargeUsd`).
2. Quando a run termina, o Apify chama `POST /api/apify/webhook` (só se `APP_URL`
   e `APIFY_WEBHOOK_SECRET` estiverem configurados). Sem webhook, a tela chama
   `POST /api/buscas/:id/sincronizar` a cada 5 s, o que funciona em dev local.
3. O servidor baixa o dataset e salva cada lugar em `leads` com
   `no_funil = false`. Deduplica por `place_id` ou URL do Maps dentro da org: lead
   que já existia só tem os dados do Google atualizados, sem mexer em etapa nem
   observações. O vínculo fica em `buscas_leads`.
4. "Enviar ao CRM" marca `no_funil = true`.

Regras puras (validação, custo, input do Apify, mapeamento) em
`src/lib/minerador/regras.ts`, com testes.

## Banco

Projeto Supabase `minerador-leads` (`iypipenavdztjqkcgwgc`, região sa-east-1).
As migrations em `supabase/migrations/` já estão aplicadas:

- `20260916180000_schema_inicial.sql`: orgs e membros, `leads`, `imports`,
  `buscas`, `buscas_leads`, RLS por org e o cálculo de score.
- `20260916183000_funcoes_em_schema_privado.sql`: tira as funções internas do
  schema `public` (elas viravam endpoints RPC) e põe no schema `private`.

**Score (0 a 100), calculado por gatilho a cada gravação em `leads`:** sem site
vale 45 e site desconhecido vale 10; telefone válido 20; avaliações 20/12/6
(100+, 30+, 5+); nota 10 acima de 4,5 e 6 acima de 4; 5 se há avaliações sem
resposta; 8 se o Instagram está parado há 30 dias ou mais; 4 se o perfil tem mais
de mil seguidores. A temperatura sai daí: quente a partir de 70, morno a partir
de 40, frio abaixo disso. Para mudar os pesos, edite
`public.calcular_score_lead` numa migration nova.

Tipos: `npx supabase gen types typescript --project-id iypipenavdztjqkcgwgc > src/types/database.types.ts`.

**Primeiro acesso:** crie seu usuário em Authentication → Users → Add user. Um
gatilho cria a organização automaticamente, com o nome vindo do e-mail. Para
renomear: `update public.organizacoes set nome = 'Núcleo Tech';`

## Deploy (Vercel)

`vercel.json` já define o framework como Next.js. Variáveis do projeto:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SECRET_KEY`, `APIFY_TOKEN`, `APP_URL` (a URL de produção, com https) e
`APIFY_WEBHOOK_SECRET` (qualquer texto aleatório longo).
