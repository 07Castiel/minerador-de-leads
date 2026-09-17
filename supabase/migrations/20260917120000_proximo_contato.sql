-- Data de retorno em cada lead e a lista "Hoje" (retornos de hoje e atrasados).
-- Só a data, sem hora: o combinado costuma ser "falo com você na quinta".

alter table public.leads add column proximo_contato date;

create index leads_org_proximo_contato_idx
  on public.leads (org_id, proximo_contato)
  where proximo_contato is not null;

-- Mesmo gatilho de antes, mais uma regra: lead que acabou de virar cliente ou
-- de ser perdido sai da lista de retornos. Só na mudança de etapa, para não
-- apagar um retorno marcado depois de propósito.
create or replace function public.leads_antes_de_salvar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.etapa in ('convertido', 'perdido')
     and (tg_op = 'INSERT' or old.etapa is distinct from new.etapa) then
    new.proximo_contato := null;
  end if;

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
