import { getUserOrThrow, jsonError, jsonOk } from '../../_utils';

export async function POST(req) {
  const { supabase, user, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const { goalId, valor, month, year } = await req.json();
  const goal_id = Number(goalId);
  const valorNum = Number(valor);
  const monthNum = Number(month);
  const yearNum = Number(year);

  if (!goal_id || Number.isNaN(valorNum) || valorNum <= 0) {
    return jsonError('Parâmetros inválidos.');
  }

  const { data: goal, error: goalError } = await supabase
    .from('goals')
    .select('*')
    .eq('id', goal_id)
    .eq('user_id', user.id)
    .single();
  if (goalError || !goal) return jsonError('Meta não encontrada.', 404);

  const { error: contribError } = await supabase
    .from('goal_contributions')
    .insert({
      user_id: user.id,
      goal_id,
      valor: valorNum,
      month: monthNum,
      year: yearNum,
    });
  if (contribError) return jsonError('Erro ao registrar contribuição.', 500);

  const updated = Number(goal.atual) + valorNum;
  const { error: updateError } = await supabase
    .from('goals')
    .update({ atual: updated })
    .eq('id', goal_id)
    .eq('user_id', user.id);
  if (updateError) return jsonError('Erro ao atualizar meta.', 500);

  return jsonOk({ goalId: goal_id, atual: updated });
}
