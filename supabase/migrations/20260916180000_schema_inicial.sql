-- =============================================================================
-- Schema inicial do minerador de leads + CRM (projeto minerador-leads).
--
-- Tudo pertence a uma organização e a RLS só libera o que é da org do usuário —
-- é o que permite virar SaaS depois sem reescrever o banco.
--
-- Escrita: buscas e vínculos só pelo servidor (chave secreta, ignora RLS);
-- leads e imports o app grava direto, com a RLS filtrando por org.
-- =============================================================================

-- 1. Organizações e membros ---------------------------------------------------

create table public.organizacoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) between 1 and 120),
  criado_em timestamptz not null default now()
);

create table public.membros (
  org_id uuid not null references public.organizacoes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  papel text not null default 'membro' check (papel in ('dono', 'membro')),
  criado_em timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index membros_user_id_idx on public.membros (user_id);

-- security definer: usada nas policies de todas as tabelas, inclusive a de
-- membros — sem isso a policy de membros consultaria a si mesma.
create function public.minhas_orgs()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.org_id from public.membros m where m.user_id = auth.uid()
$$;

-- Org "ativa": por enquanto cada pessoa usa uma só. Serve de default nos
-- inserts feitos pelo navegador.
create function public.org_atual()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.org_id
  from public.membros m
  where m.user_id = auth.uid()
  order by m.criado_em
  limit 1
$$;

revoke all on function public.minhas_orgs() from public, anon;
revoke all on function public.org_atual() from public, anon;
grant execute on function public.minhas_orgs() to authenticated;
grant execute on function public.org_atual() to authenticated;

alter table public.organizacoes enable row level security;
alter table public.membros enable row level security;

create policy "organizacoes: membros leem"
  on public.organizacoes for select to authenticated
  using (id in (select public.minhas_orgs()));

create policy "organizacoes: donos editam"
  on public.organizacoes for update to authenticated
  using (id in (select m.org_id from public.membros m where m.user_id = auth.uid() and m.papel = 'dono'))
  with check (id in (select m.org_id from public.membros m where m.user_id = auth.uid() and m.papel = 'dono'));

create policy "membros: membros da org leem"
  on public.membros for select to authenticated
  using (org_id in (select public.minhas_orgs()));

-- Todo usuário novo ganha a própria organização.
create function public.criar_org_para_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  insert into public.organizacoes (nome)
  values (coalesce(nullif(split_part(new.email, '@', 1), ''), 'Minha conta'))
  returning id into v_org;

  insert into public.membros (org_id, user_id, papel) values (v_org, new.id, 'dono');
  return new;
end;
$$;

create trigger criar_org_para_novo_usuario
after insert on auth.users
for each row execute function public.criar_org_para_novo_usuario();

-- 2. Leads --------------------------------------------------------------------

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default public.org_atual() references public.organizacoes (id) on delete cascade,

  -- Identificação (vem do Google Maps ou do cadastro manual)
  nome text not null check (length(trim(nome)) > 0),
  categoria text,
  telefone text,
  endereco text,
  bairro text,
  cidade text,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  maps_url text,
  place_id text,

  -- Sinais usados no score
  tem_site boolean,
  google_rating numeric(2, 1) check (google_rating between 0 and 5),
  google_avaliacoes_count integer check (google_avaliacoes_count >= 0),
  google_avaliacoes_sem_resposta integer check (google_avaliacoes_sem_resposta >= 0),
  instagram_handle text,
  instagram_seguidores integer check (instagram_seguidores >= 0),
  instagram_ultimo_post_dias integer check (instagram_ultimo_post_dias >= 0),

  -- Calculados pelo gatilho (nunca escrever na mão)
  score integer,
  temperatura text check (temperatura in ('quente', 'morno', 'frio')),

  -- Funil
  no_funil boolean not null default true,
  etapa text not null default 'novo'
    check (etapa in ('novo', 'abordado', 'agendado', 'follow_up', 'convertido', 'perdido')),
  etapa_atualizada_em timestamptz,
  motivo_perda text check (motivo_perda is null or motivo_perda in
    ('preco', 'sem_resposta', 'ja_tem_fornecedor', 'fechou_com_outro',
     'decisor_nao_aprovou', 'nao_e_o_momento', 'nao_viu_valor', 'outro')),
  observacoes text,
  origem text,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  -- O mesmo negócio pode existir em orgs diferentes, nunca duas vezes na mesma.
  unique (org_id, maps_url)
);

create unique index leads_org_place_id_key on public.leads (org_id, place_id) where place_id is not null;
create index leads_org_funil_idx on public.leads (org_id, no_funil, etapa);
create index leads_org_score_idx on public.leads (org_id, score desc);

-- Score de 0 a 100: quanto maior, mais vale a pena abordar.
-- A ideia é achar negócio estabelecido (tem movimento, é bem avaliado, atende
-- telefone) com presença digital fraca — é aí que um serviço nosso entra.
create function public.calcular_score_lead(
  p_tem_site boolean,
  p_telefone text,
  p_google_rating numeric,
  p_google_avaliacoes_count integer,
  p_google_avaliacoes_sem_resposta integer,
  p_instagram_handle text,
  p_instagram_seguidores integer,
  p_instagram_ultimo_post_dias integer
)
returns integer
language sql
immutable
set search_path = ''
as $$
  select least(100, greatest(0,
    -- Sem site é o maior sinal de oportunidade; null = ainda não sabemos.
    case p_tem_site when false then 45 when true then 0 else 10 end
    -- Dá pra ligar hoje
    + case when length(regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g')) >= 8 then 20 else 0 end
    -- Volume de avaliações = movimento real
    + case
        when coalesce(p_google_avaliacoes_count, 0) >= 100 then 20
        when coalesce(p_google_avaliacoes_count, 0) >= 30 then 12
        when coalesce(p_google_avaliacoes_count, 0) >= 5 then 6
        else 0
      end
    -- Reputação boa: cliente que já é bem visto tem dinheiro pra investir
    + case
        when coalesce(p_google_rating, 0) >= 4.5 then 10
        when coalesce(p_google_rating, 0) >= 4 then 6
        else 0
      end
    -- Não responde avaliações: perfil abandonado, outra porta de entrada
    + case when coalesce(p_google_avaliacoes_sem_resposta, 0) >= 5 then 5 else 0 end
    -- Instagram parado há mais de um mês conta como presença fraca
    + case when coalesce(p_instagram_ultimo_post_dias, 0) >= 30 then 8 else 0 end
    -- Audiência já construída (só conta se tem perfil)
    + case when p_instagram_handle is not null and coalesce(p_instagram_seguidores, 0) >= 1000 then 4 else 0 end
  ))::integer
$$;

create function public.leads_antes_de_salvar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.score := public.calcular_score_lead(
    new.tem_site, new.telefone, new.google_rating, new.google_avaliacoes_count,
    new.google_avaliacoes_sem_resposta, new.instagram_handle,
    new.instagram_seguidores, new.instagram_ultimo_post_dias
  );
  new.temperatura := case
    when new.score >= 70 then 'quente'
    when new.score >= 40 then 'morno'
    else 'frio'
  end;
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger leads_antes_de_salvar
before insert or update on public.leads
for each row execute function public.leads_antes_de_salvar();

alter table public.leads enable row level security;

create policy "leads: membros da org"
  on public.leads for all to authenticated
  using (org_id in (select public.minhas_orgs()))
  with check (org_id in (select public.minhas_orgs()));

-- 3. Importações manuais (tela Importar) --------------------------------------

create table public.imports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default public.org_atual() references public.organizacoes (id) on delete cascade,
  arquivo_nome text,
  origem text,
  total_linhas integer,
  novos integer,
  atualizados integer,
  ignorados integer,
  erros integer,
  created_at timestamptz not null default now()
);

create index imports_org_criado_idx on public.imports (org_id, created_at desc);

alter table public.imports enable row level security;

create policy "imports: membros da org"
  on public.imports for all to authenticated
  using (org_id in (select public.minhas_orgs()))
  with check (org_id in (select public.minhas_orgs()));

-- 4. Minerador ----------------------------------------------------------------

create table public.buscas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizacoes (id) on delete cascade,
  criado_por uuid references auth.users (id) on delete set null,
  nicho text not null,
  uf text not null check (uf ~ '^[A-Z]{2}$'),
  cidade text not null,
  bairro text,
  max_resultados integer not null check (max_resultados between 1 and 1000),
  filtros jsonb not null default '{}'::jsonb,
  status text not null default 'iniciando'
    check (status in ('iniciando', 'rodando', 'processando', 'concluida', 'erro')),
  apify_run_id text unique,
  apify_dataset_id text,
  custo_estimado_usd numeric(10, 4),
  total_encontrados integer,
  novos integer,
  ja_existiam integer,
  ignorados integer,
  erro text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  concluido_em timestamptz
);

create index buscas_org_criado_em_idx on public.buscas (org_id, criado_em desc);

create table public.buscas_leads (
  busca_id uuid not null references public.buscas (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  org_id uuid not null references public.organizacoes (id) on delete cascade,
  primary key (busca_id, lead_id)
);

create index buscas_leads_lead_id_idx on public.buscas_leads (lead_id);

-- atualizado_em também é o "heartbeat" do processamento: busca presa em
-- 'processando' por muito tempo pode ser retomada com segurança.
create function public.buscas_set_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger buscas_set_atualizado_em
before update on public.buscas
for each row execute function public.buscas_set_atualizado_em();

alter table public.buscas enable row level security;
alter table public.buscas_leads enable row level security;

create policy "buscas: membros da org leem"
  on public.buscas for select to authenticated
  using (org_id in (select public.minhas_orgs()));

create policy "buscas_leads: membros da org leem"
  on public.buscas_leads for select to authenticated
  using (org_id in (select public.minhas_orgs()));
