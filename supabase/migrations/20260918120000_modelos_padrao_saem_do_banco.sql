-- Os três modelos padrão (Primeira abordagem, Abordagem curta, Retorno) violam
-- as regras da abordagem: oferta em 1ª pessoa, pedido de permissão, promessa de
-- resultado, duas perguntas, linha em branco. Eles passam a ser gerados em código
-- a partir do config (src/lib/leads/abordagem.ts: mensagemFixa e
-- mensagemDeRetorno), com a mesma validação do resto.
--
-- Sai o gatilho que criava os três em toda org nova, e saem as linhas que ele
-- criou. Só apaga o texto original: modelo que alguém editou fica.

drop trigger if exists criar_modelos_padrao on public.organizacoes;
drop function if exists private.criar_modelos_padrao();
drop function if exists private.inserir_modelos_padrao(uuid);

delete from public.modelos_mensagem
where (nome, texto) in (
  ('Primeira abordagem',
   E'{saudacao}! Falo com {nome}?\n\nEncontrei vocês no Google e {gancho}. Eu crio sites para negócios aqui de {cidade}, e um site bem feito costuma trazer cliente novo que hoje procura e não acha.\n\nPosso te mandar uma ideia de como ficaria o de vocês?'),
  ('Abordagem curta',
   E'{saudacao}! Encontrei {nome} no Google e {gancho}. Trabalho criando sites, posso te mostrar uma ideia rápida pra vocês?'),
  ('Retorno',
   E'{saudacao}! Tudo bem? Passando pra saber se você conseguiu ver minha mensagem sobre o site de {nome}. Se fizer sentido, te mando alguns sites que já fiz aqui em {cidade}.')
);
