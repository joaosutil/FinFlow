import { getUserOrThrow, jsonError, jsonOk } from '../_utils';

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

export async function GET(req) {
  const { supabase, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const { data, error: fetchError } = await supabase.from('budgets').select('*').order('created_at', { ascending: false });
  if (fetchError) return jsonError('Erro ao buscar orçamentos.', 500);
  return jsonOk(data.map((b) => ({
    id: b.id,
    categoryKey: b.category_key,
    monthlyLimit: Number(b.monthly_limit),
    alertThreshold: Number(b.alert_threshold),
  })));
}

export async function POST(req) {
  const { supabase, user, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const body = await req.json();
  const parsed = parseBudget(body);
  if (parsed.error) return jsonError(parsed.error);

  const { data, error: insertError } = await supabase
    .from('budgets')
    .insert({ ...parsed.data, user_id: user.id })
    .select('*')
    .single();
  if (insertError) return jsonError('Erro ao criar orçamento.', 500);
  return jsonOk({
    id: data.id,
    categoryKey: data.category_key,
    monthlyLimit: Number(data.monthly_limit),
    alertThreshold: Number(data.alert_threshold),
  });
}
