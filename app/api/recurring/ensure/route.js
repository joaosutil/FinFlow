import { getUserOrThrow, jsonError, jsonOk } from '../../_utils';

function buildDate(year, month, day) {
  return new Date(year, month, day);
}

function safeDay(year, month, day) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Math.min(day, lastDay);
}

export async function POST(req) {
  const { supabase, user, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const { data: rules, error: rulesError } = await supabase
    .from('recurring_rules')
    .select('*')
    .eq('user_id', user.id)
    .eq('active', true);
  if (rulesError) return jsonError('Erro ao buscar recorrências.', 500);

  let created = 0;
  for (const rule of rules) {
    const start = new Date(rule.start_date);
    const end = rule.end_date ? new Date(rule.end_date) : null;
    const targetDay = safeDay(year, month, rule.day_of_month);
    const targetDate = buildDate(year, month, targetDay);

    if (targetDate < start) continue;
    if (end && targetDate > end) continue;

    const { data: existing } = await supabase
      .from('recurring_instances')
      .select('id')
      .eq('rule_id', rule.id)
      .eq('year', year)
      .eq('month', month)
      .maybeSingle();
    if (existing) continue;

    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        descricao: rule.descricao,
        valor: rule.valor,
        tipo: rule.tipo,
        categoria: rule.categoria,
        data: targetDate.toISOString().slice(0, 10),
        status: rule.status,
        metodo_pagamento: rule.metodo_pagamento,
        card_id: rule.metodo_pagamento === 'credito' ? rule.card_id : null,
      })
      .select('id')
      .single();
    if (txError) continue;

    await supabase
      .from('recurring_instances')
      .insert({
        user_id: user.id,
        rule_id: rule.id,
        year,
        month,
        transaction_id: transaction.id,
      });
    created += 1;
  }

  return jsonOk({ created });
}
