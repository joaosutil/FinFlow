import { getUserOrThrow, jsonError, jsonOk } from '../_utils';

function parseCategory(body) {
  const nome = String(body.nome || '').trim();
  const tipo = body.tipo;
  const cor = body.cor || null;
  if (!nome) return { error: 'Nome é obrigatório.' };
  if (!['receita', 'despesa'].includes(tipo)) return { error: 'Tipo inválido.' };
  return { data: { nome, tipo, cor } };
}

export async function GET(req) {
  const { supabase, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const { data, error: fetchError } = await supabase
    .from('categories')
    .select('*')
    .order('created_at', { ascending: false });
  if (fetchError) return jsonError('Erro ao buscar categorias.', 500);
  return jsonOk(data.map((c) => ({
    id: c.id,
    nome: c.nome,
    tipo: c.tipo,
    cor: c.cor,
  })));
}

export async function POST(req) {
  const { supabase, user, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const body = await req.json();
  const parsed = parseCategory(body);
  if (parsed.error) return jsonError(parsed.error);

  const { data, error: insertError } = await supabase
    .from('categories')
    .insert({ ...parsed.data, user_id: user.id })
    .select('*')
    .single();
  if (insertError) return jsonError('Erro ao criar categoria.', 500);
  return jsonOk({
    id: data.id,
    nome: data.nome,
    tipo: data.tipo,
    cor: data.cor,
  });
}
