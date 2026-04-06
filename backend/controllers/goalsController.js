const prisma = require('../prismaClient');

function ok(res, data) {
  res.json({ status: 'ok', data });
}

function fail(res, message, code = 400) {
  res.status(code).json({ status: 'error', message });
}

function parseGoal(body) {
  const nome = String(body.nome || '').trim();
  const alvo = Number(body.alvo);
  const atual = Number(body.atual || 0);

  if (!nome) return { error: 'Nome é obrigatório.' };
  if (Number.isNaN(alvo) || alvo <= 0) return { error: 'Valor alvo inválido.' };
  if (Number.isNaN(atual) || atual < 0) return { error: 'Valor atual inválido.' };

  return { data: { nome, alvo, atual } };
}

async function getAll(req, res) {
  try {
    const items = await prisma.goal.findMany({ orderBy: { createdAt: 'desc' } });
    ok(res, items);
  } catch (error) {
    fail(res, 'Erro ao buscar metas.', 500);
  }
}

async function create(req, res) {
  const parsed = parseGoal(req.body);
  if (parsed.error) return fail(res, parsed.error);
  try {
    const item = await prisma.goal.create(parsed);
    ok(res, item);
  } catch (error) {
    fail(res, 'Erro ao criar meta.', 500);
  }
}

async function update(req, res) {
  const id = Number(req.params.id);
  const parsed = parseGoal(req.body);
  if (parsed.error) return fail(res, parsed.error);
  try {
    const item = await prisma.goal.update({ where: { id }, data: parsed.data });
    ok(res, item);
  } catch (error) {
    fail(res, 'Erro ao atualizar meta.', 500);
  }
}

async function remove(req, res) {
  try {
    const id = Number(req.params.id);
    await prisma.goal.delete({ where: { id } });
    ok(res, { id });
  } catch (error) {
    fail(res, 'Erro ao excluir meta.', 500);
  }
}

module.exports = {
  getAll,
  create,
  update,
  remove,
};
