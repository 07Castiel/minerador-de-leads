-- Sinais que o Google Maps Scraper já devolve sem custo extra e que antes eram
-- descartados: link cru do Google (site ou rede social), perfil reivindicado
-- pelo dono, quantidade de fotos, descrição e horário de funcionamento.
-- null em qualquer um deles = "não sabemos" (ex.: lead importado de planilha).

alter table public.leads
  add column site_url text,
  add column perfil_reivindicado boolean,
  add column fotos_count integer check (fotos_count >= 0),
  add column tem_descricao boolean,
  add column tem_horario boolean;

drop trigger leads_antes_de_salvar on public.leads;
drop function public.leads_antes_de_salvar();
drop function public.calcular_score_lead(boolean, text, numeric, integer, integer, text, integer, integer);

-- Recebe a linha inteira: adicionar um sinal novo não muda a assinatura.
-- Score de 0 a 100 — negócio estabelecido (movimento, boa nota, telefone) com
-- presença digital fraca é o lead ideal.
create function public.calcular_score_lead(l public.leads)
returns integer
language sql
immutable
set search_path = ''
as $$
  select least(100, greatest(0,
    -- Sem site próprio é o maior sinal; null = ainda não sabemos
    case l.tem_site when false then 45 when true then 0 else 10 end
    -- Dá pra ligar hoje
    + case when length(regexp_replace(coalesce(l.telefone, ''), '\D', '', 'g')) >= 8 then 20 else 0 end
    -- Volume de avaliações = movimento real
    + case
        when coalesce(l.google_avaliacoes_count, 0) >= 100 then 20
        when coalesce(l.google_avaliacoes_count, 0) >= 30 then 12
        when coalesce(l.google_avaliacoes_count, 0) >= 5 then 6
        else 0
      end
    -- Reputação boa
    + case
        when coalesce(l.google_rating, 0) >= 4.5 then 10
        when coalesce(l.google_rating, 0) >= 4 then 6
        else 0
      end
    -- Dono nunca assumiu o perfil do Google
    + case when l.perfil_reivindicado = false then 10 else 0 end
    -- Perfil pobre: poucas fotos, sem descrição ou sem horário
    + case when l.fotos_count < 5 then 5 else 0 end
    + case when l.tem_descricao = false or l.tem_horario = false then 4 else 0 end
    -- Não responde avaliações
    + case when coalesce(l.google_avaliacoes_sem_resposta, 0) >= 5 then 5 else 0 end
    -- Instagram parado há mais de um mês
    + case when coalesce(l.instagram_ultimo_post_dias, 0) >= 30 then 8 else 0 end
    -- Audiência já construída
    + case when l.instagram_handle is not null and coalesce(l.instagram_seguidores, 0) >= 1000 then 4 else 0 end
  ))::integer
$$;

create function public.leads_antes_de_salvar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.score := public.calcular_score_lead(new);
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

-- Recalcula o que já existe com a regra nova.
update public.leads set atualizado_em = now();
