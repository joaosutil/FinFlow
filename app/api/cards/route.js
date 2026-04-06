import { getSupabaseClient, jsonError, jsonOk } from '../_utils';

function parseCard(body) {
  const nome = String(body.nome || '').trim();
  const bandeira = String(body.bandeira || '').trim();
  const final = String(body.final || '').trim();
  const vencimentoDia = Number(body.vencimentoDia);
  const fechamentoDia = Number(body.fechamentoDia);

  if (!nome) return { error: 'Nome do cartão é obrigatório.' };
  if (!bandeira) return { error: 'Bandeira é obrigatória.' };
  if (!final || final.length < 2) return { error: 'Final do cartão inválido.' };
  if (Number.isNaN(vencimentoDia) || vencimentoDia < 1 || vencimentoDia > 28) {
    return { error: 'Dia de vencimento deve ser entre 1 e 28.' };
  }
  if (Number.isNaN(fechamentoDia) || fechamentoDia < 1 || fechamentoDia > 28) {
    return { error: 'Dia de fechamento deve ser entre 1 e 28.' };
  }

  return { data: { nome, bandeira, final, vencimento_dia: vencimentoDia, fechamento_dia: fechamentoDia } };
}

export async function GET(req) {
  const supabase = getSupabaseClient(req);
  if (!supabase) return jsonError('Não autenticado.', 401);

  const { data, error } = await supabase.from('cards').select('*').order('created_at', { ascending: false });
  if (error) return jsonError('Erro ao buscar cartões.', 500);
  return jsonOk(data.map((c) => ({
    id: c.id,
    nome: c.nome,
    bandeira: c.bandeira,
    final: c.final,
    vencimentoDia: c.vencimento_dia,
    fechamentoDia: c.fechamento_dia,
  })));
}

export async function POST(req) {
  const supabase = getSupabaseClient(req);
  if (!supabase) return jsonError('Não autenticado.', 401);

  const body = await req.json();
  const parsed = parseCard(body);
  if (parsed.error) return jsonError(parsed.error);

  const { data, error } = await supabase.from('cards').insert(parsed.data).select('*').single();
  if (error) return jsonError('Erro ao criar cartão.', 500);
  return jsonOk({
    id: data.id,
    nome: data.nome,
    bandeira: data.bandeira,
    final: data.final,
    vencimentoDia: data.vencimento_dia,
    fechamentoDia: data.fechamento_dia,
  });
}
