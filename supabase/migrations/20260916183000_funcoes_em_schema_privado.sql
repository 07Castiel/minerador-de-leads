-- As funções SECURITY DEFINER no schema `public` viram endpoints /rest/v1/rpc.
-- Nenhuma delas é pra ser chamada pelo navegador (duas são usadas dentro das
-- policies, uma é gatilho), então vão para o schema `private`, que o PostgREST
-- não expõe. Aviso do linter do Supabase: 0028 e 0029.

create schema if not exists private;
grant usage on schema private to authenticated, service_role;

create function private.minhas_orgs()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.org_id from public.membros m where m.user_id = auth.uid()
$$;

create function private.org_atual()
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

revoke all on function private.minhas_orgs() from public;
revoke all on function private.org_atual() from public;
-- As policies e os defaults são avaliados com os privilégios de quem consulta.
grant execute on function private.minhas_orgs() to authenticated;
grant execute on function private.org_atual() to authenticated;

-- Policies apontando para as funções novas -----------------------------------

drop policy "organizacoes: membros leem" on public.organizacoes;
drop policy "membros: membros da org leem" on public.membros;
drop policy "leads: membros da org" on public.leads;
drop policy "imports: membros da org" on public.imports;
drop policy "buscas: membros da org leem" on public.buscas;
drop policy "buscas_leads: membros da org leem" on public.buscas_leads;

create policy "organizacoes: membros leem"
  on public.organizacoes for select to authenticated
  using (id in (select private.minhas_orgs()));

create policy "membros: membros da org leem"
  on public.membros for select to authenticated
  using (org_id in (select private.minhas_orgs()));

create policy "leads: membros da org"
  on public.leads for all to authenticated
  using (org_id in (select private.minhas_orgs()))
  with check (org_id in (select private.minhas_orgs()));

create policy "imports: membros da org"
  on public.imports for all to authenticated
  using (org_id in (select private.minhas_orgs()))
  with check (org_id in (select private.minhas_orgs()));

create policy "buscas: membros da org leem"
  on public.buscas for select to authenticated
  using (org_id in (select private.minhas_orgs()));

create policy "buscas_leads: membros da org leem"
  on public.buscas_leads for select to authenticated
  using (org_id in (select private.minhas_orgs()));

alter table public.leads alter column org_id set default private.org_atual();
alter table public.imports alter column org_id set default private.org_atual();

drop function public.minhas_orgs();
drop function public.org_atual();

-- Gatilho de novo usuário ----------------------------------------------------

create function private.criar_org_para_novo_usuario()
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

revoke all on function private.criar_org_para_novo_usuario() from public;
-- Quem insere em auth.users é o serviço de autenticação.
grant usage on schema private to supabase_auth_admin;
grant execute on function private.criar_org_para_novo_usuario() to supabase_auth_admin;

drop trigger criar_org_para_novo_usuario on auth.users;
drop function public.criar_org_para_novo_usuario();

create trigger criar_org_para_novo_usuario
after insert on auth.users
for each row execute function private.criar_org_para_novo_usuario();
