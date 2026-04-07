import { getUserOrThrow, jsonError, jsonOk } from '../_utils';

function parseInvestment(body) {
  const nome = String(body.nome || '').trim();
  const aporteInicial = Number(body.aporteInicial);
  const valorAtual = Number(body.valorAtual);
  const dataInicio = body.dataInicio;

  if (!nome) return { error: 'Nome é obrigatório.' };
  if (Number.isNaN(aporteInicial) || aporteInicial <= 0) return { error: 'Aporte inicial inválido.' };
  if (Number.isNaN(valorAtual) || valorAtual <= 0) return { error: 'Valor atual inválido.' };
  if (!dataInicio) return { error: 'Data de início inválida.' };

  return {
    data: {
      nome,
      aporte_inicial: aporteInicial,
      valor_atual: valorAtual,
      data_inicio: dataInicio,
    },
  };
}

export async function GET(req) {
  const { supabase, user, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const { data: investments, error: invError } = await supabase
    .from('investments')
    .select('*')
    .order('created_at', { ascending: false });
  if (invError) return jsonError('Erro ao buscar investimentos.', 500);

  const { data: history, error: histError } = await supabase
    .from('investment_history')
    .select('*')
    .eq('user_id', user.id)
    .order('data', { ascending: true });
  if (histError) return jsonError('Erro ao buscar histórico.', 500);

  const historyMap = {};
  history.forEach((item) => {
    if (!historyMap[item.investment_id]) historyMap[item.investment_id] = [];
    historyMap[item.investment_id].push(item);
  });

  const payload = investments.map((inv) => ({
    id: inv.id,
    nome: inv.nome,
    aporteInicial: Number(inv.aporte_inicial),
    valorAtual: Number(inv.valor_atual),
    dataInicio: inv.data_inicio,
    history: historyMap[inv.id] || [],
  }));

  return jsonOk(payload);
}

export async function POST(req) {
  const { supabase, user, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const body = await req.json();
  const parsed = parseInvestment(body);
  if (parsed.error) return jsonError(parsed.error);

  const { data: investment, error: invError } = await supabase
    .from('investments')
    .insert({ ...parsed.data, user_id: user.id })
    .select('*')
    .single();
  if (invError) return jsonError('Erro ao criar investimento.', 500);

  const { error: histError } = await supabase
    .from('investment_history')
    .insert({
      user_id: user.id,
      investment_id: investment.id,
      data: parsed.data.data_inicio,
      valor: parsed.data.valor_atual,
    });
  if (histError) return jsonError('Erro ao salvar histórico.', 500);

  return jsonOk({
    id: investment.id,
    nome: investment.nome,
    aporteInicial: Number(investment.aporte_inicial),
    valorAtual: Number(investment.valor_atual),
    dataInicio: investment.data_inicio,
    history: [{ data: parsed.data.data_inicio, valor: parsed.data.valor_atual }],
  });
}
