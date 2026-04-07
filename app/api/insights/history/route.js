import { getUserOrThrow, jsonError, jsonOk } from '../../_utils';

export async function GET(req) {
  const { supabase, user, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const { data, error: fetchError } = await supabase
    .from('insights_history')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (fetchError) return jsonError('Erro ao buscar histórico.', 500);
  return jsonOk(data.map((h) => ({
    id: h.id,
    month: h.month,
    year: h.year,
    insights: h.insights,
    createdAt: h.created_at,
  })));
}
