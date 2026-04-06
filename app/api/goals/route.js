import { getSupabaseClient, jsonError, jsonOk } from '../_utils';

function parseGoal(body) {
  const nome = String(body.nome || '').trim();
  const alvo = Number(body.alvo);
  const atual = Number(body.atual || 0);

  if (!nome) return { error: 'Nome é obrigatório.' };
  if (Number.isNaN(alvo) || alvo <= 0) return { error: 'Valor alvo inválido.' };
  if (Number.isNaN(atual) || atual < 0) return { error: 'Valor atual inválido.' };

  return { data: { nome, alvo, atual } };
}

export async function GET(req) {
  const supabase = getSupabaseClient(req);
  if (!supabase) return jsonError('Não autenticado.', 401);

  const { data, error } = await supabase.from('goals').select('*').order('created_at', { ascending: false });
  if (error) return jsonError('Erro ao buscar metas.', 500);
  return jsonOk(data);
}

export async function POST(req) {
  const supabase = getSupabaseClient(req);
  if (!supabase) return jsonError('Não autenticado.', 401);

  const body = await req.json();
  const parsed = parseGoal(body);
  if (parsed.error) return jsonError(parsed.error);

  const { data, error } = await supabase.from('goals').insert(parsed.data).select('*').single();
  if (error) return jsonError('Erro ao criar meta.', 500);
  return jsonOk(data);
}
