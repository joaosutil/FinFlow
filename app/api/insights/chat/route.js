import { getUserOrThrow, jsonError, jsonOk } from '../../_utils';

function buildSummary(transactions, month, year) {
  const monthTx = transactions.filter((t) => {
    const d = new Date(t.data);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const receitas = monthTx.filter((t) => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0);
  const despesas = monthTx.filter((t) => t.tipo === 'despesa').reduce((s, t) => s + Number(t.valor), 0);
  return { receitas, despesas, saldo: receitas - despesas, totalLancamentos: monthTx.length };
}

export async function POST(req) {
  const { supabase, user, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return jsonError('IA nao configurada. Defina GEMINI_API_KEY.', 503);

  const body = await req.json().catch(() => ({}));
  const question = String(body.question || '').trim();
  const month = Number(body.month ?? new Date().getMonth());
  const year = Number(body.year ?? new Date().getFullYear());
  if (!question) return jsonError('Pergunta vazia.');

  const { data: transactions } = await supabase.from('transactions').select('*').eq('user_id', user.id);
  const summary = buildSummary(transactions || [], month, year);

  const prompt = `
Você é um assistente financeiro. Responda em português de forma objetiva.
Evite prometer ganhos e deixe claro que não é aconselhamento financeiro.

Resumo do mês: ${JSON.stringify(summary)}
Pergunta: ${question}
`.trim();

  let response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 300 },
      }),
    });
  } catch (e) {
    console.error('Gemini fetch error', e);
    return jsonError('Falha ao conectar no Gemini.', 502);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    console.error('Gemini error', response.status, errText.slice(0, 400));
    return jsonError(`Falha ao gerar resposta (Gemini ${response.status}).`, 502);
  }
  const data = await response.json().catch(() => null);
  const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Não consegui gerar uma resposta agora.';

  return jsonOk({ answer });
}
