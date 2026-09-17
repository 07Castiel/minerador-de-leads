-- Por que o site não abriu: ENOTFOUND (domínio não existe), TIMEOUT, ECONNREFUSED,
-- CERT_HAS_EXPIRED... O status "fora_do_ar" junta causas muito diferentes, e só o
-- domínio inexistente é firme o bastante pra virar gancho de mensagem: 404, 500 e
-- tempo esgotado saem de uma medição única e podem ser passageiros.
alter table public.leads add column site_falha text;

comment on column public.leads.site_falha is
  'Código da falha ao abrir o site (ENOTFOUND, TIMEOUT, CERT_HAS_EXPIRED...). Null quando a página abriu.';
