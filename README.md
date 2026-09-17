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

- **Hoje** (`/hoje`): retornos marcados para hoje e atrasados, com ligar/WhatsApp
  e remarcar (amanhã, 3 dias, 1 semana) ou concluir num clique. Embaixo, os
  próximos 7 dias. O número no menu é a quantidade pendente.
- **CRM** (`/crm`): funil em quadro (arrastar entre etapas) ou lista, com filtros
  na URL. Mover para "Perdido" pede o motivo.
- **Buscar leads** (`/buscar`): nicho + estado + cidade (lista do IBGE) + bairro
  opcional, quantidade e filtros, com custo máximo estimado. Histórico de buscas.
- **Resultados** (`/buscar/:id`): resultados da busca com score. Selecione e
  envie ao CRM, exporte CSV ou analise os sites dos resultados visíveis.
- **Lead** (`/leads/:id`): dados, ligar/WhatsApp, etapa, motivo de perda,
  próximo contato, observações e análise do site.
- **WhatsApp** (no card do CRM, na lista Hoje e no lead): mostra a mensagem que o
  sistema decidiu pro lead, em texto fixo, versão curta ou redigida pelo Gemini,
  e o retorno para quem já foi abordado. Dá pra editar, mas o texto editado passa
  pela mesma validação. Fora do horário (antes das 08:00 ou a partir das 21:00,
  horário de Fortaleza) e lead sem lacuna não geram mensagem. Depois de abrir, um
  aviso oferece marcar o lead como abordado e o retorno em 3 dias.
- **Mensagens** (`/mensagens`): cria e edita modelos com variáveis, com prévia
  num lead de verdade. A janela do WhatsApp não usa mais esses modelos.
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
- `20260916200000_sinais_do_perfil_google.sql`: guarda o link cru do Google,
  perfil reivindicado, fotos, descrição e horário, e passa o score a usar esses
  sinais.
- `20260916230000_nota_so_com_5_avaliacoes.sql`: a nota só pontua a partir de 5
  avaliações (antes, 5,0 com uma avaliação valia o mesmo que com 180).
- `20260917120000_proximo_contato.sql`: data de retorno (`proximo_contato`); o
  gatilho apaga o retorno quando o lead vira Convertido ou Perdido.
- `20260917120100_analise_de_site.sql`: colunas `site_*` da análise de site e
  score de quem tem site; reclassifica links de bio e diretórios (Jusbrasil,
  Jusfy) como sem site.
- `20260917120200_modelos_de_mensagem.sql`: tabela `modelos_mensagem` com RLS e
  três modelos iniciais para toda conta (inclusive as novas, por gatilho).
- `20260918120000_modelos_padrao_saem_do_banco.sql`: tira os três modelos
  iniciais e o gatilho; esses textos passam a ser gerados em código.

**Score (0 a 100), calculado por gatilho a cada gravação em `leads`:**

| Sinal | Pontos |
|---|---|
| Sem site próprio (site desconhecido: 10) | 45 |
| Site fora do ar ou sem conteúdo / com alerta de inseguro | 40 / 25 |
| Defeitos do site que abre, somados até 30: nota no celular abaixo de 50 (15) ou de 70 (8), não se ajusta ao celular (12), sem HTTPS (8), endereço gratuito (8), sem botão de WhatsApp (4), rodapé de 3+ anos (3) | até 30 |
| Telefone válido | 20 |
| Avaliações: 100+ / 30+ / 5+ | 20 / 12 / 6 |
| Nota: 4,5+ / 4+ (só com 5+ avaliações) | 10 / 6 |
| Perfil do Google não reivindicado pelo dono | 10 |
| Instagram parado há 30 dias ou mais | 8 |
| Menos de 5 fotos no Google | 5 |
| 5+ avaliações sem resposta | 5 |
| Perfil incompleto (sem descrição ou sem horário) | 4 |
| Instagram com mais de mil seguidores | 4 |

A temperatura sai daí: quente a partir de 70, morno a partir de 40, frio abaixo
disso. Sinal desconhecido (`null`) não soma nem subtrai. Para mudar os pesos,
edite `public.calcular_score_lead` numa migration nova.

**"Sem site" de verdade:** Instagram, Facebook, WhatsApp, link de bio,
plataformas e diretórios (iFood, Booksy, Jusbrasil...) e os antigos sites
gratuitos do Google (`business.site`) contam como sem site próprio. O link fica
guardado em `site_url` e, quando é um perfil do Instagram, o @ vai para
`instagram_handle`. Regras em `src/lib/leads/presencaDigital.ts`. Ao mudar as
listas, reclassifique os leads existentes numa migration.

**Análise de site.** `POST /api/leads/:id/analisar-site` (botão no lead e "Analisar
sites" nos resultados, 3 por vez) só roda para link de site próprio:
1. `src/lib/leads/buscarPagina.ts` abre a página pelo servidor, seguindo até 6
   redirecionamentos, com limite de 15 s e 2 MB. O link é dado de terceiros, então
   cada conexão passa por um lookup que recusa IP interno (privado, loopback,
   link-local, metadados de nuvem), só aceita as portas 80 e 443 e para ao cair
   em rede social ou WhatsApp.
2. `src/lib/leads/analiseSite.ts` (puro, com testes) classifica: fora do ar
   (domínio inexistente, erro 404/5xx, sem resposta), sem conteúdo (domínio à
   venda, hospedagem suspensa, em construção), certificado inválido, "não é
   site" (redireciona para rede social; o lead passa a contar como sem site) ou
   não verificado (bloqueio anti-robô, que não prova nada). Para o site que abre:
   HTTPS, viewport de celular, link de WhatsApp, plataforma, endereço gratuito e
   ano do rodapé.
3. `src/lib/leads/pageSpeed.ts` mede a nota e o tempo do maior conteúdo no
   celular com o PageSpeed Insights, em paralelo; desiste se a página não abriu.
   Precisa de `PAGESPEED_API_KEY` (a cota sem chave é zero); sem ela, o resto da
   análise funciona.

Se uma busca nova trouxer o lead com o mesmo link, a análise continua valendo; com
link diferente, ela é zerada.

**Próximo contato.** `leads.proximo_contato` (só a data). Os cálculos de hoje,
atrasado e remarcação ficam em `src/lib/leads/proximoContato.ts`, no fuso de
quem usa o app.

**Modelos de mensagem.** Texto com variáveis `{saudacao}`, `{nome}`,
`{gancho}`, `{categoria}`, `{bairro}`, `{cidade}`, `{nota}` e `{avaliacoes}`,
preenchido no navegador por `src/lib/leads/modelosMensagem.ts`. `{nome}` corta o
que vem depois de " - " ou "|" no nome do Google. `{gancho}` completa "Encontrei
vocês no Google e ..." com a primeira lacuna do lead (`lacunasDoLead`, a mesma
lista da abordagem), na ordem do score (sem site, só Instagram, site fora do ar,
lento no celular, perfil sem dono...).
Variável sem dado fica em branco e a janela avisa.

**Sinais do perfil:** reivindicação e número de fotos vêm grátis na busca.
Descrição e horário só vêm com o add-on pago de página de detalhe do Apify (não
ligado), então ficam como desconhecidos. Negócios fechados são descartados no
processamento, sem pagar o filtro do Apify. As etiquetas "por que esse lead"
(`src/lib/leads/motivos.ts`) aparecem nos cards, nos resultados, no detalhe e no
CSV.

Tipos: `npx supabase gen types typescript --project-id iypipenavdztjqkcgwgc > src/types/database.types.ts`.

**Primeiro acesso:** crie seu usuário em Authentication → Users → Add user. Um
gatilho cria a organização automaticamente, com o nome vindo do e-mail. Para
renomear: `update public.organizacoes set nome = 'Núcleo Tech';`

**Mensagem de WhatsApp.** `POST /api/leads/:id/mensagem-whatsapp` com
`{ modo: "completa" | "curta" | "gemini" }`, em três camadas
(`src/lib/leads/abordagem.ts`, textos e limites em `src/lib/leads/config/`):
1. O código decide tudo: horário (America/Fortaleza), nicho (categoria do
   Google; termo da busca só se a categoria for genérica), lacuna (sem site ou
   link fora do site; poucas fotos e pouca avaliação só em comércio), âncora
   com a pessoa do nome quando dá pra afirmar, e a pergunta final.
2. O texto sai fixo, na estrutura de 3 linhas, ou o Gemini redige
   (`src/lib/gemini.ts`, prompt em `src/lib/leads/mensagemWhatsApp.ts`). O
   Gemini só recebe saudação, âncora, lacuna, pergunta e tratamento, nunca os
   dados do lead. Primeira tentativa no `gemini-3.5-flash`, retry no
   `gemini-3.8-flash`, temperatura 1.0.
3. `validarMensagem` bloqueia marcas de IA, oferta, pedido de permissão,
   promessa, elogio, termos vedados na advocacia, mais de uma pergunta, texto
   sem o nome ou sem a pergunta decidida. Gemini bloqueado duas vezes vira o
   texto fixo, e o motivo vai pro log do servidor.

Os testes usam as mensagens reais do fluxo antigo e os 100 leads reais
(`src/lib/leads/fixtures/leads-reais.json`). Precisa de `GEMINI_API_KEY`.

## Deploy (Vercel)

`vercel.json` já define o framework como Next.js. Variáveis do projeto:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SECRET_KEY`, `APIFY_TOKEN`, `GEMINI_API_KEY`, `PAGESPEED_API_KEY`, `APP_URL` (a URL de produção, com https) e
`APIFY_WEBHOOK_SECRET` (qualquer texto aleatório longo).
