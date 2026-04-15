import { getUserOrThrow, jsonError, jsonOk } from '../_utils';

function parseGeminiErrorText(errText) {
  const text = String(errText || '').trim();
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    const msg = parsed?.error?.message || parsed?.message;
    return msg ? String(msg).trim() : text.slice(0, 160);
  } catch {
    return text.slice(0, 160);
  }
}

function buildModelsToTry() {
  const preferred = String(process.env.GEMINI_MODEL || '').trim();
  const models = [
    preferred,
    'gemini-3-flash-preview',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
  ].filter(Boolean);
  return Array.from(new Set(models));
}

function extractJsonFromModelText(rawText) {
  const original = String(rawText || '').trim();
  if (!original) return null;

  // Prefer fenced JSON blocks: ```json ... ```
  const fenced = original.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const text = (fenced ? fenced[1] : original).trim();

  // Then try to isolate a JSON object inside the text.
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) return text.slice(start, end + 1);

  return null;
}

function normalizeInsightsFallback(rawText) {
  const text = String(rawText || '');
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => l !== '```' && l !== '```json' && l !== 'json')
    .filter((l) => l !== '{' && l !== '}' && l !== '[' && l !== ']' && l !== '},' && l !== '],')
    .map((l) => l.replace(/^[-*]\s+/, ''))
    .map((l) => l.replace(/^\d+\.?\s+/, ''))
    .map((l) => l.replace(/^\"|\",?$|\"$/g, ''))
    .slice(0, 8);
}

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

  const apiKey = String(process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '').trim();
  if (!apiKey) return jsonError('IA nao configurada. Defina GEMINI_API_KEY.', 503);
  const apiBase = String(process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta').trim().replace(/\/$/, '');

  const body = await req.json().catch(() => ({}));
  const month = Number(body.month ?? new Date().getMonth());
  const year = Number(body.year ?? new Date().getFullYear());

  const { data: transactions, error: txErr } = await supabase.from('transactions').select('*').eq('user_id', user.id);
  if (txErr) return jsonError('Falha ao carregar transacoes.', 500);
  const { data: goals, error: goalsErr } = await supabase.from('goals').select('*').eq('user_id', user.id);
  if (goalsErr) return jsonError('Falha ao carregar metas.', 500);
  const { data: budgets, error: budgetsErr } = await supabase.from('budgets').select('*').eq('user_id', user.id);
  if (budgetsErr) return jsonError('Falha ao carregar orcamentos.', 500);

  const summary = buildSummary(transactions || [], goals || [], budgets || [], month, year);

  const prompt = `
Você é um analista financeiro pessoal. Com base no resumo abaixo, gere 5 a 8 insights curtos, práticos e objetivos em português.
- Foque em economia, cortes, saúde financeira e próximos passos.
- Não invente dados.
- Responda SOMENTE com JSON puro, sem markdown e sem blocos de codigo.
- Formato: { "insights": ["...","..."] }

Resumo:
${JSON.stringify(summary, null, 2)}
`.trim();

  const modelsToTry = buildModelsToTry();
  let response;
  let lastErrText = '';
  for (const model of modelsToTry) {
    try {
      response = await fetch(`${apiBase}/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 400 },
        }),
      });
    } catch (e) {
      console.error('Gemini fetch error', e);
      return jsonError(`Falha ao conectar no Gemini: ${e?.message || 'erro de rede'}.`, 502);
    }

    if (response.ok) break;

    lastErrText = await response.text().catch(() => '');
    // Only retry on "model not found" style errors.
    if (response.status !== 404) break;
  }

  if (!response.ok) {
    const reason = parseGeminiErrorText(lastErrText) || 'erro desconhecido';
    console.error('Gemini error', response.status, String(lastErrText || '').slice(0, 400));
    const status = Number(response.status) || 502;
    const code = status === 429 ? 429 : 502;
    return jsonError(`Falha ao gerar insights (Gemini ${status}): ${reason}`, code);
  }

  const data = await response.json().catch(() => null);
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  let insights = [];
  try {
    const jsonText = extractJsonFromModelText(text) || text;
    const parsed = JSON.parse(jsonText);
    insights = Array.isArray(parsed?.insights) ? parsed.insights : [];
  } catch {
    insights = normalizeInsightsFallback(text);
  }

  const { error: histErr } = await supabase.from('insights_history').insert({ user_id: user.id, month, year, insights });
  if (histErr) console.error('insights_history insert error', histErr);

  return jsonOk({ insights, summary });
}
