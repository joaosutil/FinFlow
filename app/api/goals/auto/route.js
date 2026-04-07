import { getUserOrThrow, jsonError, jsonOk } from '../../_utils';

export async function POST(req) {
  const { supabase, user, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const body = await req.json();
  const month = Number(body.month);
  const year = Number(body.year);
  if (Number.isNaN(month) || Number.isNaN(year)) {
    return jsonError('Mês/ano inválidos.');
  }

  const { data: goals, error: goalsError } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id);
  if (goalsError) return jsonError('Erro ao buscar metas.', 500);

  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id);
  if (txError) return jsonError('Erro ao buscar transações.', 500);

  const monthTransactions = transactions.filter((t) => {
    const d = new Date(t.data);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const totalReceitas = monthTransactions
    .filter((t) => t.tipo === 'receita')
    .reduce((s, t) => s + Number(t.valor), 0);

  let created = 0;
  for (const goal of goals) {
    if (!goal.contrib_percent || goal.contrib_percent <= 0) continue;
    const valor = (totalReceitas * Number(goal.contrib_percent)) / 100;
    if (valor <= 0) continue;

    const { data: existing } = await supabase
      .from('goal_contributions')
      .select('id')
      .eq('goal_id', goal.id)
      .eq('month', month)
      .eq('year', year)
      .maybeSingle();
    if (existing) continue;

    await supabase.from('goal_contributions').insert({
      user_id: user.id,
      goal_id: goal.id,
      month,
      year,
      valor,
    });
    created += 1;

    await supabase
      .from('goals')
      .update({ atual: Number(goal.atual) + valor })
      .eq('id', goal.id)
      .eq('user_id', user.id);
  }

  return jsonOk({ created });
}
