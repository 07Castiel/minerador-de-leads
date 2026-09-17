-- Análise do site de quem tem site próprio: o servidor abre a página e o
-- PageSpeed Insights mede o celular. Antes, lead com site valia 0 nesse sinal;
-- agora site fora do ar, inseguro, lento ou que não se ajusta ao celular vira
-- argumento de venda. Regras em src/lib/leads/analiseSite.ts.
-- null em qualquer coluna = não analisado ou não deu pra medir.

alter table public.leads
  add column site_analisado_em timestamptz,
  add column site_status text check (site_status in (
    'ok',                   -- abriu normalmente
    'fora_do_ar',           -- domínio não existe, não conecta ou erro 4xx/5xx
    'sem_conteudo',         -- domínio à venda, hospedagem suspensa, em construção
    'certificado_invalido', -- navegador mostra alerta de site inseguro
    'nao_e_site',           -- o link redireciona para rede social ou WhatsApp
    'nao_verificado'        -- bloqueou o robô ou falhou de um jeito que não prova nada
  )),
  add column site_detalhe text,
  add column site_url_final text,
  add column site_https boolean,
  add column site_responsivo boolean,
  add column site_tem_whatsapp boolean,
  add column site_plataforma text,
  add column site_dominio_gratuito boolean,
  add column site_ano_rodape smallint check (site_ano_rodape between 1990 and 2100),
  add column site_nota_celular smallint check (site_nota_celular between 0 and 100),
  add column site_carregamento_ms integer check (site_carregamento_ms >= 0);

create or replace function public.calcular_score_lead(l public.leads)
returns integer
language sql
immutable
set search_path = ''
as $$
  select least(100, greatest(0,
    -- Sem site próprio é o maior sinal; null = ainda não sabemos
    case l.tem_site
      when false then 45
      when true then
        -- Site com problema vale quase o mesmo que não ter site; defeitos
        -- menores somam até 30, sempre abaixo de "sem site".
        case l.site_status
          when 'fora_do_ar' then 40
          when 'sem_conteudo' then 40
          when 'certificado_invalido' then 25
          when 'ok' then least(30,
              case
                when l.site_nota_celular < 50 then 15
                when l.site_nota_celular < 70 then 8
                else 0
              end
            + case when l.site_responsivo = false then 12 else 0 end
            + case when l.site_https = false then 8 else 0 end
            + case when l.site_dominio_gratuito then 8 else 0 end
            + case when l.site_tem_whatsapp = false then 4 else 0 end
            -- Rodapé com ano de 3+ anos antes da análise (at time zone: mantém imutável)
            + case
                when l.site_ano_rodape <= extract(year from (l.site_analisado_em at time zone 'UTC')) - 3 then 3
                else 0
              end
          )
          else 0
        end
      else 10
    end
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

-- Links de bio e páginas de plataforma que passaram a contar como "sem site"
-- (mesma lista de src/lib/leads/presencaDigital.ts). O gatilho recalcula o score.
update public.leads
set tem_site = false
where tem_site = true
  and site_url ~* '^(https?://)?([a-z0-9-]+\.)*(linklist\.bio|linkbio\.co|msha\.ke|solo\.to|jusbrasil\.com\.br|jusfy\.com\.br|zapier\.app)(/|\?|$)';
