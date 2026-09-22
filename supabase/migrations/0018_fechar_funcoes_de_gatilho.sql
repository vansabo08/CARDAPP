-- As funções de gatilho não se chamam de fora.
--
-- O verificador de segurança do Supabase apontou que `abrir_sessao_no_pedido`
-- se podia chamar por `/rest/v1/rpc`. Não fazia nada — uma função de
-- gatilho chamada à mão dá erro —, mas uma porta que não serve para nada
-- fecha-se. O gatilho continua a disparar: o Postgres só confere o
-- EXECUTE quando o gatilho é criado, não de cada vez que corre.
revoke execute on function public.abrir_sessao_no_pedido() from public, anon, authenticated;

-- E o aviso antigo da isenção: sem `search_path` fixo, uma função pode
-- ser enganada por uma tabela com o mesmo nome noutro esquema.
alter function public.isencao_apaga_o_prazo() set search_path = public;
revoke execute on function public.isencao_apaga_o_prazo() from public, anon, authenticated;
