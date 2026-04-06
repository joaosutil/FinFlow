import { getUserOrThrow, jsonError, jsonOk } from '../../_utils';

const allowedTipos = ['receita', 'despesa'];
const allowedStatus = ['pago', 'pendente', 'atrasado'];
const allowedMetodos = ['dinheiro', 'debito', 'credito', 'pix', 'boleto', 'transferencia'];

function parseTransaction(body) {
  const descricao = String(body.descricao || '').trim();
  const valor = Number(body.valor);
  const tipo = body.tipo;
  const categoria = String(body.categoria || '').trim();
  const data = body.data;
  const status = body.status || (tipo === 'receita' ? 'pago' : 'pendente');
  const metodoPagamento = body.metodoPagamento || (tipo === 'receita' ? 'transferencia' : 'debito');
  const cardId = body.cardId ? Number(body.cardId) : null;

  if (!descricao) return { error: 'Descrição é obrigatória.' };
  if (Number.isNaN(valor) || valor <= 0) return { error: 'Valor inválido.' };
  if (!allowedTipos.includes(tipo)) return { error: 'Tipo inválido.' };
  if (!categoria) return { error: 'Categoria é obrigatória.' };
  if (!data) return { error: 'Data inválida.' };
  if (!allowedStatus.includes(status)) return { error: 'Status inválido.' };
  if (!allowedMetodos.includes(metodoPagamento)) return { error: 'Método de pagamento inválido.' };
  if (metodoPagamento === 'credito' && (!cardId || Number.isNaN(cardId))) {
    return { error: 'Selecione um cartão de crédito.' };
  }

  return {
    data: {
      descricao,
      valor,
      tipo,
      categoria,
      data,
      status,
      metodo_pagamento: metodoPagamento,
      card_id: metodoPagamento === 'credito' ? cardId : null,
    },
  };
}

function mapTransaction(row) {
  return {
    id: row.id,
    descricao: row.descricao,
    valor: Number(row.valor),
    tipo: row.tipo,
    categoria: row.categoria,
    data: row.data,
    status: row.status,
    metodoPagamento: row.metodo_pagamento,
    cardId: row.card_id,
    card: row.card || null,
  };
}

export async function GET(req, { params }) {
  const { supabase, user, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const id = Number(params.id);
  const { data, error: fetchError } = await supabase
    .from('transactions')
    .select('*, card:cards(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !data) return jsonError('Transação não encontrada.', 404);
  return jsonOk(mapTransaction(data));
}

export async function PUT(req, { params }) {
  const { supabase, user, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const id = Number(params.id);
  const body = await req.json();
  const parsed = parseTransaction(body);
  if (parsed.error) return jsonError(parsed.error);

  const { data, error: updateError } = await supabase
    .from('transactions')
    .update(parsed.data)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*, card:cards(*)')
    .single();

  if (updateError) return jsonError('Erro ao atualizar transação.', 500);
  return jsonOk(mapTransaction(data));
}

export async function DELETE(req, { params }) {
  const { supabase, user, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const id = Number(params.id);
  const { error: deleteError } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (deleteError) return jsonError('Erro ao excluir transação.', 500);
  return jsonOk({ id });
}
