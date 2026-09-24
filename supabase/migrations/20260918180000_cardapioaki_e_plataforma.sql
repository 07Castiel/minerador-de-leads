-- Cardápio Aki entrou na lista de plataformas (src/lib/leads/presencaDigital.ts):
-- é página de cardápio em site de terceiro, não site do negócio. Os leads que já
-- estão no banco com esse link foram gravados como tem_site = true, então
-- precisam ser reclassificados aqui, igual ao que 20260917120100 fez com as
-- outras. O gatilho recalcula o score.
update public.leads
set tem_site = false
where tem_site = true
  and site_url ~* '^(https?://)?([a-z0-9-]+\.)*cardapioaki\.app(/|\?|$)';
