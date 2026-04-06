import { getUserOrThrow, jsonError, jsonOk } from '../_utils';

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
  const { supabase, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const { data, error: fetchError } = await supabase.from('goals').select('*').order('created_at', { ascending: false });
  if (fetchError) return jsonError('Erro ao buscar metas.', 500);
  return jsonOk(data);
}

export async function POST(req) {
  const { supabase, user, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const body = await req.json();
  const parsed = parseGoal(body);
  if (parsed.error) return jsonError(parsed.error);

  const { data, error: insertError } = await supabase
    .from('goals')
    .insert({ ...parsed.data, user_id: user.id })
    .select('*')
    .single();
  if (insertError) return jsonError('Erro ao criar meta.', 500);
  return jsonOk(data);
}
