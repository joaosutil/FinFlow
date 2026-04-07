import { getUserOrThrow, jsonError, jsonOk } from '../../_utils';

function parseBudget(body) {
  const categoryKey = String(body.categoryKey || '').trim();
  const monthlyLimit = Number(body.monthlyLimit);
  const alertThreshold = Number(body.alertThreshold ?? 0.8);

  if (!categoryKey) return { error: 'Categoria é obrigatória.' };
  if (Number.isNaN(monthlyLimit) || monthlyLimit <= 0) return { error: 'Limite inválido.' };
  if (Number.isNaN(alertThreshold) || alertThreshold <= 0 || alertThreshold > 1) {
    return { error: 'Threshold deve estar entre 0 e 1.' };
  }

  return { data: { category_key: categoryKey, monthly_limit: monthlyLimit, alert_threshold: alertThreshold } };
}

export async function PUT(req, { params }) {
  const { supabase, user, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const id = Number(params.id);
  const body = await req.json();
  const parsed = parseBudget(body);
  if (parsed.error) return jsonError(parsed.error);

  const { data, error: updateError } = await supabase
    .from('budgets')
    .update(parsed.data)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single();
  if (updateError) return jsonError('Erro ao atualizar orçamento.', 500);
  return jsonOk({
    id: data.id,
    categoryKey: data.category_key,
    monthlyLimit: Number(data.monthly_limit),
    alertThreshold: Number(data.alert_threshold),
  });
}

export async function DELETE(req, { params }) {
  const { supabase, user, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const id = Number(params.id);
  const { error: deleteError } = await supabase
    .from('budgets')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (deleteError) return jsonError('Erro ao excluir orçamento.', 500);
  return jsonOk({ id });
}
