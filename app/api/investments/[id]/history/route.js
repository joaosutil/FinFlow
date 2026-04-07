import { getUserOrThrow, jsonError, jsonOk } from '../../../_utils';

function parseHistory(body) {
  const data = body.data;
  const valor = Number(body.valor);
  if (!data) return { error: 'Data inválida.' };
  if (Number.isNaN(valor) || valor <= 0) return { error: 'Valor inválido.' };
  return { data: { data, valor } };
}

export async function POST(req, { params }) {
  const { supabase, user, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const investmentId = Number(params.id);
  const body = await req.json();
  const parsed = parseHistory(body);
  if (parsed.error) return jsonError(parsed.error);

  const { data: history, error: histError } = await supabase
    .from('investment_history')
    .insert({
      user_id: user.id,
      investment_id: investmentId,
      data: parsed.data.data,
      valor: parsed.data.valor,
    })
    .select('*')
    .single();
  if (histError) return jsonError('Erro ao salvar histórico.', 500);

  await supabase
    .from('investments')
    .update({ valor_atual: parsed.data.valor })
    .eq('id', investmentId)
    .eq('user_id', user.id);

  return jsonOk(history);
}
