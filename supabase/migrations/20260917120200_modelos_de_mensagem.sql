-- Modelos de mensagem de WhatsApp com variáveis ({nome}, {gancho}...). A troca
-- das variáveis acontece no navegador (src/lib/leads/modelosMensagem.ts): um
-- clique e a conversa abre pronta, sem IA e sem custo.

create table public.modelos_mensagem (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default private.org_atual() references public.organizacoes (id) on delete cascade,
  nome text not null check (length(btrim(nome)) between 1 and 80),
  texto text not null check (length(btrim(texto)) between 1 and 2000),
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index modelos_mensagem_org_ordem_idx on public.modelos_mensagem (org_id, ordem, criado_em);

alter table public.modelos_mensagem enable row level security;

create policy "modelos_mensagem: membros da org"
  on public.modelos_mensagem for all to authenticated
  using (org_id in (select private.minhas_orgs()))
  with check (org_id in (select private.minhas_orgs()));

-- Modelos iniciais de toda conta (quem vende site para negócio local).
create function private.inserir_modelos_padrao(p_org uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.modelos_mensagem (org_id, nome, texto, ordem) values
  (p_org, 'Primeira abordagem',
   E'{saudacao}! Falo com {nome}?\n\nEncontrei vocês no Google e {gancho}. Eu crio sites para negócios aqui de {cidade}, e um site bem feito costuma trazer cliente novo que hoje procura e não acha.\n\nPosso te mandar uma ideia de como ficaria o de vocês?',
   1),
  (p_org, 'Abordagem curta',
   E'{saudacao}! Encontrei {nome} no Google e {gancho}. Trabalho criando sites, posso te mostrar uma ideia rápida pra vocês?',
   2),
  (p_org, 'Retorno',
   E'{saudacao}! Tudo bem? Passando pra saber se você conseguiu ver minha mensagem sobre o site de {nome}. Se fizer sentido, te mando alguns sites que já fiz aqui em {cidade}.',
   3);
$$;

create function private.criar_modelos_padrao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.inserir_modelos_padrao(new.id);
  return new;
end;
$$;

revoke all on function private.inserir_modelos_padrao(uuid) from public;
revoke all on function private.criar_modelos_padrao() from public;

create trigger criar_modelos_padrao
after insert on public.organizacoes
for each row execute function private.criar_modelos_padrao();

-- Contas que já existem.
select private.inserir_modelos_padrao(o.id) from public.organizacoes o;
