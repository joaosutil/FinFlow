import { getUserOrThrow, jsonError, jsonOk } from '../../_utils';

function parseInvestment(body) {
  const nome = String(body.nome || '').trim();
  const aporteInicial = Number(body.aporteInicial);
  const valorAtual = Number(body.valorAtual);
  const dataInicio = body.dataInicio;

  if (!nome) return { error: 'Nome é obrigatório.' };
  if (Number.isNaN(aporteInicial) || aporteInicial <= 0) return { error: 'Aporte inicial inválido.' };
  if (Number.isNaN(valorAtual) || valorAtual <= 0) return { error: 'Valor atual inválido.' };
  if (!dataInicio) return { error: 'Data de início inválida.' };

  return {
    data: {
      nome,
      aporte_inicial: aporteInicial,
      valor_atual: valorAtual,
      data_inicio: dataInicio,
    },
  };
}

export async function PUT(req, { params }) {
  const { supabase, user, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const id = Number(params.id);
  const body = await req.json();
  const parsed = parseInvestment(body);
  if (parsed.error) return jsonError(parsed.error);

  const { data: investment, error: updateError } = await supabase
    .from('investments')
    .update(parsed.data)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single();
  if (updateError) return jsonError('Erro ao atualizar investimento.', 500);

  return jsonOk({
    id: investment.id,
    nome: investment.nome,
    aporteInicial: Number(investment.aporte_inicial),
    valorAtual: Number(investment.valor_atual),
    dataInicio: investment.data_inicio,
  });
}

export async function DELETE(req, { params }) {
  const { supabase, user, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const id = Number(params.id);
  const { error: deleteError } = await supabase
    .from('investments')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (deleteError) return jsonError('Erro ao excluir investimento.', 500);
  return jsonOk({ id });
}
