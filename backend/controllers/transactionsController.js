const prisma = require('../prismaClient');

const allowedTipos = ['receita', 'despesa'];
const allowedStatus = ['pago', 'pendente', 'atrasado'];
const allowedMetodos = ['dinheiro', 'debito', 'credito', 'pix', 'boleto', 'transferencia'];

function ok(res, data) {
  res.json({ status: 'ok', data });
}

function fail(res, message, code = 400) {
  res.status(code).json({ status: 'error', message });
}

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
  if (!data || Number.isNaN(new Date(data).getTime())) return { error: 'Data inválida.' };
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
      data: new Date(data),
      status,
      metodoPagamento,
      cardId: metodoPagamento === 'credito' ? cardId : null,
    },
  };
}

async function getAll(req, res) {
  try {
    const items = await prisma.transaction.findMany({
      orderBy: { data: 'desc' },
      include: { card: true },
    });
    ok(res, items);
  } catch (error) {
    fail(res, 'Erro ao buscar transações.', 500);
  }
}

async function getById(req, res) {
  try {
    const id = Number(req.params.id);
    const item = await prisma.transaction.findUnique({
      where: { id },
      include: { card: true },
    });
    if (!item) return fail(res, 'Transação não encontrada.', 404);
    ok(res, item);
  } catch (error) {
    fail(res, 'Erro ao buscar transação.', 500);
  }
}

async function create(req, res) {
  const parsed = parseTransaction(req.body);
  if (parsed.error) return fail(res, parsed.error);
  try {
    const item = await prisma.transaction.create(parsed);
    ok(res, item);
  } catch (error) {
    fail(res, 'Erro ao criar transação.', 500);
  }
}

async function update(req, res) {
  const id = Number(req.params.id);
  const parsed = parseTransaction(req.body);
  if (parsed.error) return fail(res, parsed.error);
  try {
    const item = await prisma.transaction.update({ where: { id }, data: parsed.data });
    ok(res, item);
  } catch (error) {
    fail(res, 'Erro ao atualizar transação.', 500);
  }
}

async function remove(req, res) {
  try {
    const id = Number(req.params.id);
    await prisma.transaction.delete({ where: { id } });
    ok(res, { id });
  } catch (error) {
    fail(res, 'Erro ao excluir transação.', 500);
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};
