import { getUserOrThrow, jsonError, jsonOk } from '../../_utils';

const allowedTipos = ['receita', 'despesa'];
const allowedStatus = ['pago', 'pendente', 'atrasado'];
const allowedMetodos = ['dinheiro', 'debito', 'credito', 'pix', 'boleto', 'transferencia'];

function parseRule(body) {
  const descricao = String(body.descricao || '').trim();
  const valor = Number(body.valor);
  const tipo = body.tipo;
  const categoria = String(body.categoria || '').trim();
  const status = body.status || (tipo === 'receita' ? 'pago' : 'pendente');
  const metodoPagamento = body.metodoPagamento || (tipo === 'receita' ? 'transferencia' : 'debito');
  const cardId = body.cardId ? Number(body.cardId) : null;
  const dayOfMonth = Number(body.dayOfMonth);
  const startDate = body.startDate;
  const endDate = body.endDate || null;
  const active = body.active !== false;

  if (!descricao) return { error: 'Descrição é obrigatória.' };
  if (Number.isNaN(valor) || valor <= 0) return { error: 'Valor inválido.' };
  if (!allowedTipos.includes(tipo)) return { error: 'Tipo inválido.' };
  if (!categoria) return { error: 'Categoria é obrigatória.' };
  if (!allowedStatus.includes(status)) return { error: 'Status inválido.' };
  if (!allowedMetodos.includes(metodoPagamento)) return { error: 'Método de pagamento inválido.' };
  if (metodoPagamento === 'credito' && (!cardId || Number.isNaN(cardId))) {
    return { error: 'Selecione um cartão de crédito.' };
  }
  if (Number.isNaN(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 28) {
    return { error: 'Dia deve ser entre 1 e 28.' };
  }
  if (!startDate) return { error: 'Data de início inválida.' };

  return {
    data: {
      descricao,
      valor,
      tipo,
      categoria,
      status,
      metodo_pagamento: metodoPagamento,
      card_id: metodoPagamento === 'credito' ? cardId : null,
      day_of_month: dayOfMonth,
      start_date: startDate,
      end_date: endDate,
      active,
    },
  };
}

export async function PUT(req, { params }) {
  const { supabase, user, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const id = Number(params.id);
  const body = await req.json();
  const parsed = parseRule(body);
  if (parsed.error) return jsonError(parsed.error);

  const { data, error: updateError } = await supabase
    .from('recurring_rules')
    .update(parsed.data)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single();
  if (updateError) return jsonError('Erro ao atualizar recorrência.', 500);
  return jsonOk({
    id: data.id,
    descricao: data.descricao,
    valor: Number(data.valor),
    tipo: data.tipo,
    categoria: data.categoria,
    status: data.status,
    metodoPagamento: data.metodo_pagamento,
    cardId: data.card_id,
    dayOfMonth: data.day_of_month,
    startDate: data.start_date,
    endDate: data.end_date,
    active: data.active,
  });
}

export async function DELETE(req, { params }) {
  const { supabase, user, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const id = Number(params.id);
  const { error: deleteError } = await supabase
    .from('recurring_rules')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (deleteError) return jsonError('Erro ao excluir recorrência.', 500);
  return jsonOk({ id });
}
