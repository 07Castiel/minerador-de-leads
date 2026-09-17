-- Uma linha por mensagem gerada para uso: primeira abordagem e follow-up são
-- linhas separadas. É daqui que sai a anti-repetição de lacuna e, quando
-- "respondeu" começar a ser marcado, a taxa de resposta por lacuna.

create table public.abordagens (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default private.org_atual() references public.organizacoes (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  tipo text not null default 'primeira' check (tipo in ('primeira', 'follow_up')),
  -- Lacuna que decidiu o gancho ("sem_site", "link_fora_do_site"...). Null no follow-up.
  lacuna text,
  nicho text not null,
  texto text not null,
  origem text not null check (origem in ('fixo', 'gemini', 'exportacao')),
  -- O clique em "Abrir no WhatsApp"; o envio em si acontece fora do app
  aberto_whatsapp boolean not null default false,
  -- Marcação manual, quando o lead responde
  respondeu boolean not null default false,
  -- Motivos da validação quando a geração foi bloqueada e caiu no texto fixo
  motivo_bloqueio text,
  criado_em timestamptz not null default now()
);

-- Anti-repetição lê as últimas da org; a página do lead lê as dele.
create index abordagens_org_criado_idx on public.abordagens (org_id, criado_em desc);
create index abordagens_lead_criado_idx on public.abordagens (lead_id, criado_em desc);

alter table public.abordagens enable row level security;

create policy "abordagens: membros da org"
  on public.abordagens for all to authenticated
  using (org_id in (select private.minhas_orgs()))
  with check (org_id in (select private.minhas_orgs()));
