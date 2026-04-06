import { getSupabaseClient, jsonError, jsonOk } from '../../_utils';

function parseCard(body) {
  const nome = String(body.nome || '').trim();
  const bandeira = String(body.bandeira || '').trim();
  const final = String(body.final || '').trim();
  const vencimentoDia = Number(body.vencimentoDia);

  if (!nome) return { error: 'Nome do cartão é obrigatório.' };
  if (!bandeira) return { error: 'Bandeira é obrigatória.' };
  if (!final || final.length < 2) return { error: 'Final do cartão inválido.' };
  if (Number.isNaN(vencimentoDia) || vencimentoDia < 1 || vencimentoDia > 28) {
    return { error: 'Dia de vencimento deve ser entre 1 e 28.' };
  }

  return { data: { nome, bandeira, final, vencimento_dia: vencimentoDia } };
}

export async function PUT(req, { params }) {
  const supabase = getSupabaseClient(req);
  if (!supabase) return jsonError('Não autenticado.', 401);

  const id = Number(params.id);
  const body = await req.json();
  const parsed = parseCard(body);
  if (parsed.error) return jsonError(parsed.error);

  const { data, error } = await supabase.from('cards').update(parsed.data).eq('id', id).select('*').single();
  if (error) return jsonError('Erro ao atualizar cartão.', 500);
  return jsonOk({
    id: data.id,
    nome: data.nome,
    bandeira: data.bandeira,
    final: data.final,
    vencimentoDia: data.vencimento_dia,
  });
}

export async function DELETE(req, { params }) {
  const supabase = getSupabaseClient(req);
  if (!supabase) return jsonError('Não autenticado.', 401);

  const id = Number(params.id);
  const { error } = await supabase.from('cards').delete().eq('id', id);
  if (error) return jsonError('Não foi possível excluir o cartão. Verifique se há despesas vinculadas.', 400);
  return jsonOk({ id });
}
