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
  if (!apiKey) return jsonError('GEMINI_API_KEY não configurada.', 500);

  const body = await req.json();
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

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 300 },
    }),
  });

  if (!response.ok) return jsonError('Falha ao gerar resposta.', 500);
  const data = await response.json();
  const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Não consegui gerar uma resposta agora.';

  return jsonOk({ answer });
}
