import { getUserOrThrow, jsonError, jsonOk } from '../../_utils';

function parseCategory(body) {
  const nome = String(body.nome || '').trim();
  const tipo = body.tipo;
  const cor = body.cor || null;
  if (!nome) return { error: 'Nome é obrigatório.' };
  if (!['receita', 'despesa'].includes(tipo)) return { error: 'Tipo inválido.' };
  return { data: { nome, tipo, cor } };
}

export async function PUT(req, { params }) {
  const { supabase, user, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const id = Number(params.id);
  const body = await req.json();
  const parsed = parseCategory(body);
  if (parsed.error) return jsonError(parsed.error);

  const { data, error: updateError } = await supabase
    .from('categories')
    .update(parsed.data)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single();
  if (updateError) return jsonError('Erro ao atualizar categoria.', 500);
  return jsonOk({ id: data.id, nome: data.nome, tipo: data.tipo, cor: data.cor });
}

export async function DELETE(req, { params }) {
  const { supabase, user, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const id = Number(params.id);
  const { error: deleteError } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (deleteError) return jsonError('Erro ao excluir categoria.', 500);
  return jsonOk({ id });
}
