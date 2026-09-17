-- A nota do Google só pesa no score a partir de 5 avaliações. Antes, 5,0 com
-- uma única avaliação valia o mesmo que 5,0 com 180 — e advogados com 1 a 4
-- avaliações apareciam como "quentes" (visto na busca de advogados em Sobral).
-- Mesmo limite de src/lib/leads/motivos.ts (MINIMO_AVALIACOES_CONFIAVEIS).

create or replace function public.calcular_score_lead(l public.leads)
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
    -- Reputação boa — só com avaliações suficientes pra nota significar algo
    + case
        when coalesce(l.google_avaliacoes_count, 0) < 5 then 0
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

-- Recalcula os leads que já existem.
update public.leads set atualizado_em = now();
