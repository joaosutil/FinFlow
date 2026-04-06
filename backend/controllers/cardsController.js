const prisma = require('../prismaClient');

function ok(res, data) {
  res.json({ status: 'ok', data });
}

function fail(res, message, code = 400) {
  res.status(code).json({ status: 'error', message });
}

function parseCard(body) {
  const nome = String(body.nome || '').trim();
  const bandeira = String(body.bandeira || '').trim();
  const final = String(body.final || '').trim();
  const vencimentoDia = Number(body.vencimentoDia);

  if (!nome) return { error: 'Nome do cartão é obrigatório.' };
  if (!bandeira) return { error: 'Bandeira é obrigatória.' };
  if (!final || final.length < 2) return { error: 'Final do cartão inválido.' };
  if (Number.isNaN(vencimentoDia) || vencimentoDia < 1 || vencimentoDia > 28) {
    return { error: 'Dia de vencimento deve ser entre 1 e 28.' };
  }

  return { data: { nome, bandeira, final, vencimentoDia } };
}

async function getAll(req, res) {
  try {
    const items = await prisma.card.findMany({ orderBy: { createdAt: 'desc' } });
    ok(res, items);
  } catch (error) {
    fail(res, 'Erro ao buscar cartões.', 500);
  }
}

async function create(req, res) {
  const parsed = parseCard(req.body);
  if (parsed.error) return fail(res, parsed.error);
  try {
    const item = await prisma.card.create(parsed);
    ok(res, item);
  } catch (error) {
    fail(res, 'Erro ao criar cartão.', 500);
  }
}

async function update(req, res) {
  const id = Number(req.params.id);
  const parsed = parseCard(req.body);
  if (parsed.error) return fail(res, parsed.error);
  try {
    const item = await prisma.card.update({ where: { id }, data: parsed.data });
    ok(res, item);
  } catch (error) {
    fail(res, 'Erro ao atualizar cartão.', 500);
  }
}

async function remove(req, res) {
  try {
    const id = Number(req.params.id);
    await prisma.card.delete({ where: { id } });
    ok(res, { id });
  } catch (error) {
    fail(res, 'Não foi possível excluir o cartão. Verifique se há despesas vinculadas.', 400);
  }
}

module.exports = {
  getAll,
  create,
  update,
  remove,
};
