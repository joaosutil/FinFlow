import { getSupabaseClient, jsonError, jsonOk } from '../../_utils';

function parseGoal(body) {
  const nome = String(body.nome || '').trim();
  const alvo = Number(body.alvo);
  const atual = Number(body.atual || 0);

  if (!nome) return { error: 'Nome é obrigatório.' };
  if (Number.isNaN(alvo) || alvo <= 0) return { error: 'Valor alvo inválido.' };
  if (Number.isNaN(atual) || atual < 0) return { error: 'Valor atual inválido.' };

  return { data: { nome, alvo, atual } };
}

export async function PUT(req, { params }) {
  const supabase = getSupabaseClient(req);
  if (!supabase) return jsonError('Não autenticado.', 401);

  const id = Number(params.id);
  const body = await req.json();
  const parsed = parseGoal(body);
  if (parsed.error) return jsonError(parsed.error);

  const { data, error } = await supabase.from('goals').update(parsed.data).eq('id', id).select('*').single();
  if (error) return jsonError('Erro ao atualizar meta.', 500);
  return jsonOk(data);
}

export async function DELETE(req, { params }) {
  const supabase = getSupabaseClient(req);
  if (!supabase) return jsonError('Não autenticado.', 401);

  const id = Number(params.id);
  const { error } = await supabase.from('goals').delete().eq('id', id);
  if (error) return jsonError('Erro ao excluir meta.', 500);
  return jsonOk({ id });
}
