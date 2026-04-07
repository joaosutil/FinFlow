import { getUserOrThrow, jsonError, jsonOk } from '../_utils';

function buildSummary(transactions, goals, budgets, month, year) {
  const monthTx = transactions.filter((t) => {
    const d = new Date(t.data);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const receitas = monthTx.filter((t) => t.tipo === 'receita');
  const despesas = monthTx.filter((t) => t.tipo === 'despesa');
  const totalReceitas = receitas.reduce((s, t) => s + Number(t.valor), 0);
  const totalDespesas = despesas.reduce((s, t) => s + Number(t.valor), 0);

  const byCategory = {};
  despesas.forEach((t) => {
    byCategory[t.categoria] = (byCategory[t.categoria] || 0) + Number(t.valor);
  });
  const topCats = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, val]) => ({ categoria: cat, valor: val }));

  const budgetAlerts = budgets.map((b) => {
    const spent = byCategory[b.category_key] || 0;
    const ratio = spent / Number(b.monthly_limit || 1);
    return { categoria: b.category_key, limite: Number(b.monthly_limit), gasto: spent, ratio, threshold: Number(b.alert_threshold || 0.8) };
  });

  const goalsBrief = goals.map((g) => ({
    nome: g.nome,
    alvo: Number(g.alvo),
    atual: Number(g.atual),
    contribPercent: Number(g.contrib_percent || 0),
  }));

  return {
    periodo: { mes: month + 1, ano: year },
    totalReceitas,
    totalDespesas,
    saldo: totalReceitas - totalDespesas,
    topCategorias: topCats,
    orcamentos: budgetAlerts,
    metas: goalsBrief,
  };
}

export async function POST(req) {
  const { supabase, user, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return jsonError('GEMINI_API_KEY não configurada.', 500);

  const body = await req.json().catch(() => ({}));
  const month = Number(body.month ?? new Date().getMonth());
  const year = Number(body.year ?? new Date().getFullYear());

  const { data: transactions } = await supabase.from('transactions').select('*').eq('user_id', user.id);
  const { data: goals } = await supabase.from('goals').select('*').eq('user_id', user.id);
  const { data: budgets } = await supabase.from('budgets').select('*').eq('user_id', user.id);

  const summary = buildSummary(transactions || [], goals || [], budgets || [], month, year);

  const prompt = `
Você é um analista financeiro pessoal. Com base no resumo abaixo, gere 5 a 8 insights curtos, práticos e objetivos em português.
- Foque em economia, cortes, saúde financeira e próximos passos.
- Não invente dados.
- Responda em JSON como: { "insights": ["...","..."] }

Resumo:
${JSON.stringify(summary, null, 2)}
`.trim();

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 400 },
    }),
  });

  if (!response.ok) {
    return jsonError('Falha ao gerar insights com Gemini.', 500);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  let insights = [];
  try {
    const parsed = JSON.parse(text);
    insights = parsed.insights || [];
  } catch {
    insights = text.split('\n').filter(Boolean).slice(0, 8);
  }

  await supabase.from('insights_history').insert({
    user_id: user.id,
    month,
    year,
    insights,
  });

  return jsonOk({ insights, summary });
}
