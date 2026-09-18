-- Passo 2 da conversa: a mensagem que vai depois que o lead responde a abertura
-- (src/lib/leads/config/apresentacao.ts). É a única que fala do serviço e da
-- empresa, então vira um tipo próprio: misturar com 'primeira' estragaria a
-- taxa de resposta por lacuna, que só olha a abertura.
alter table public.abordagens drop constraint abordagens_tipo_check;

alter table public.abordagens
  add constraint abordagens_tipo_check check (tipo in ('primeira', 'follow_up', 'apresentacao'));
