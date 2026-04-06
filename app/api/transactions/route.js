import { getSupabaseClient, jsonError, jsonOk } from '../_utils';

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

export async function GET(req) {
  const supabase = getSupabaseClient(req);
  if (!supabase) return jsonError('Não autenticado.', 401);

  const { data, error } = await supabase
    .from('transactions')
    .select('*, card:cards(*)')
    .order('data', { ascending: false });

  if (error) return jsonError('Erro ao buscar transações.', 500);
  return jsonOk(data.map(mapTransaction));
}

export async function POST(req) {
  const supabase = getSupabaseClient(req);
  if (!supabase) return jsonError('Não autenticado.', 401);

  const body = await req.json();
  const parsed = parseTransaction(body);
  if (parsed.error) return jsonError(parsed.error);

  const { data, error } = await supabase
    .from('transactions')
    .insert(parsed.data)
    .select('*, card:cards(*)')
    .single();

  if (error) return jsonError('Erro ao criar transação.', 500);
  return jsonOk(mapTransaction(data));
}
