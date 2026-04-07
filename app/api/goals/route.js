import { getUserOrThrow, jsonError, jsonOk } from '../_utils';

function parseGoal(body) {
  const nome = String(body.nome || '').trim();
  const alvo = Number(body.alvo);
  const atual = Number(body.atual || 0);
  const contribPercent = Number(body.contribPercent || 0);

  if (!nome) return { error: 'Nome é obrigatório.' };
  if (Number.isNaN(alvo) || alvo <= 0) return { error: 'Valor alvo inválido.' };
  if (Number.isNaN(atual) || atual < 0) return { error: 'Valor atual inválido.' };
  if (Number.isNaN(contribPercent) || contribPercent < 0) return { error: 'Percentual inválido.' };

  return { data: { nome, alvo, atual, contrib_percent: contribPercent } };
}

export async function GET(req) {
  const { supabase, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const { data, error: fetchError } = await supabase.from('goals').select('*').order('created_at', { ascending: false });
  if (fetchError) return jsonError('Erro ao buscar metas.', 500);
  return jsonOk(data.map((g) => ({
    id: g.id,
    nome: g.nome,
    alvo: Number(g.alvo),
    atual: Number(g.atual),
    contribPercent: Number(g.contrib_percent || 0),
  })));
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
  return jsonOk({
    id: data.id,
    nome: data.nome,
    alvo: Number(data.alvo),
    atual: Number(data.atual),
    contribPercent: Number(data.contrib_percent || 0),
  });
}
