import { getUserOrThrow, jsonError, jsonOk } from '../../_utils';
import { createClient } from '@supabase/supabase-js';

function buildDateLabel(dateStr) {
  if (!dateStr) return '';
  if (dateStr.includes('-')) {
    const [y, m, d] = dateStr.split('-').map((n) => parseInt(n, 10));
    if (y && m && d) return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  }
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
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

  const budgetAlerts = budgets.map((b) => {
    const spent = byCategory[b.category_key] || 0;
    const ratio = spent / Number(b.monthly_limit || 1);
    return { ...b, spent, ratio };
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
    orcamentos: budgetAlerts,
    metas: goalsBrief,
  };
}

async function generateInsights(summary) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return [];

  const prompt = `
Você é um analista financeiro pessoal. Gere 5 a 8 insights curtos em português com base no resumo abaixo.
Seja prático e evite promessas de investimento. Responda em JSON: { "insights": ["..."] }

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
  if (!response.ok) return [];
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  try {
    const parsed = JSON.parse(text);
    return parsed.insights || [];
  } catch {
    return text.split('\n').filter(Boolean).slice(0, 8);
  }
}

export async function POST(req) {
  const cronSecret = process.env.CRON_SECRET;
  const headerSecret = req.headers.get('x-cron-secret');
  const { searchParams } = new URL(req.url);
  const querySecret = searchParams.get('secret');
  const isCron = cronSecret && ((headerSecret && cronSecret === headerSecret) || (querySecret && cronSecret === querySecret));

  if (isCron) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!serviceRoleKey || !supabaseUrl) {
      return jsonError('SUPABASE_SERVICE_ROLE_KEY não configurada.', 500);
    }
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: users, error: usersError } = await admin.auth.admin.listUsers();
    if (usersError) return jsonError('Erro ao listar usuários.', 500);

    let sent = 0;
    for (const u of users.users || []) {
      const { data: settings } = await admin
        .from('notification_settings')
        .select('*')
        .eq('user_id', u.id)
        .maybeSingle();
      const freq = settings?.frequency || 'weekly';
      if (!shouldSend(freq, settings?.last_sent_at)) continue;

      const { data: transactions } = await admin.from('transactions').select('*').eq('user_id', u.id);
      const { data: goals } = await admin.from('goals').select('*').eq('user_id', u.id);
      const { data: budgets } = await admin.from('budgets').select('*').eq('user_id', u.id);
      const { data: invoices } = await admin
        .from('card_invoices')
        .select('*')
        .eq('user_id', u.id)
        .eq('cycle_year', new Date().getFullYear())
        .eq('cycle_month', new Date().getMonth());

      const summary = buildSummary(transactions || [], goals || [], budgets || [], new Date().getMonth(), new Date().getFullYear());
      const insights = await generateInsights(summary);

      await sendEmail(u.email, summary, insights, invoices || []);
      await admin.from('insights_history').insert({
        user_id: u.id,
        month: summary.periodo.mes - 1,
        year: summary.periodo.ano,
        insights,
      });
      await admin.from('notification_settings').upsert({
        user_id: u.id,
        frequency: freq,
        last_sent_at: new Date().toISOString(),
      });
      sent += 1;
    }

    return jsonOk({ sent });
  }

  const { supabase, user, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const brevoKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL;
  const fromName = process.env.BREVO_FROM_NAME || 'FinFlow';
  if (!brevoKey || !fromEmail) return jsonError('BREVO_API_KEY e BREVO_FROM_EMAIL são obrigatórios.', 500);

  const body = await req.json().catch(() => ({}));
  const month = Number(body.month ?? new Date().getMonth());
  const year = Number(body.year ?? new Date().getFullYear());

  const { data: transactions } = await supabase.from('transactions').select('*').eq('user_id', user.id);
  const { data: goals } = await supabase.from('goals').select('*').eq('user_id', user.id);
  const { data: budgets } = await supabase.from('budgets').select('*').eq('user_id', user.id);
  const { data: invoices } = await supabase
    .from('card_invoices')
    .select('*')
    .eq('user_id', user.id)
    .eq('cycle_year', year)
    .eq('cycle_month', month);

  const summary = buildSummary(transactions || [], goals || [], budgets || [], month, year);
  const insights = await generateInsights(summary);

  const html = `
    <div style="font-family:Arial,sans-serif;color:#111">
      <h2>FinFlow • Resumo com Insights</h2>
      <p>Período: ${month + 1}/${year}</p>
      <h3>Resumo</h3>
      <ul>
        <li>Receitas: ${summary.totalReceitas.toFixed(2)}</li>
        <li>Despesas: ${summary.totalDespesas.toFixed(2)}</li>
        <li>Saldo: ${summary.saldo.toFixed(2)}</li>
      </ul>
      <h3>Insights</h3>
      ${insights.length ? `<ul>${insights.map((i) => `<li>${i}</li>`).join('')}</ul>` : '<p>Sem insights no momento.</p>'}
      <h3>Faturas abertas</h3>
      ${invoices?.length ? `<ul>${invoices.map((i) =>
        `<li>Cartão ${i.card_id} • vence em ${buildDateLabel(i.vencimento_date)} • total ${Number(i.total).toFixed(2)}</li>`
      ).join('')}</ul>` : '<p>Sem faturas abertas 🎉</p>'}
    </div>
  `;

  const ok = await sendEmail(user.email, summary, insights, invoices || []);
  if (!ok) return jsonError('Falha ao enviar email via Brevo.', 500);

  await supabase.from('insights_history').insert({
    user_id: user.id,
    month,
    year,
    insights,
  });

  return jsonOk({ sent: true, insights });
}

function shouldSend(freq, lastSent) {
  const now = new Date();
  if (!lastSent) return true;
  const last = new Date(lastSent);
  if (freq === 'daily') return now.toDateString() !== last.toDateString();
  if (freq === 'weekly') return now - last >= 7 * 24 * 60 * 60 * 1000;
  if (freq === 'monthly') return now.getMonth() !== last.getMonth() || now.getFullYear() !== last.getFullYear();
  return true;
}

async function sendEmail(to, summary, insights, invoices) {
  const brevoKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL;
  const fromName = process.env.BREVO_FROM_NAME || 'FinFlow';
  if (!brevoKey || !fromEmail || !to) return false;

  const html = `
    <div style="font-family:Arial,sans-serif;color:#111">
      <h2>FinFlow • Resumo com Insights</h2>
      <p>Período: ${summary.periodo.mes}/${summary.periodo.ano}</p>
      <h3>Resumo</h3>
      <ul>
        <li>Receitas: ${summary.totalReceitas.toFixed(2)}</li>
        <li>Despesas: ${summary.totalDespesas.toFixed(2)}</li>
        <li>Saldo: ${summary.saldo.toFixed(2)}</li>
      </ul>
      <h3>Insights</h3>
      ${insights.length ? `<ul>${insights.map((i) => `<li>${i}</li>`).join('')}</ul>` : '<p>Sem insights no momento.</p>'}
      <h3>Faturas abertas</h3>
      ${invoices?.length ? `<ul>${invoices.map((i) =>
        `<li>Cartão ${i.card_id} • vence em ${buildDateLabel(i.vencimento_date)} • total ${Number(i.total).toFixed(2)}</li>`
      ).join('')}</ul>` : '<p>Sem faturas abertas 🎉</p>'}
    </div>
  `;

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': brevoKey },
    body: JSON.stringify({
      sender: { email: fromEmail, name: fromName },
      to: [{ email: to }],
      subject: 'FinFlow • Resumo e Insights do mês',
      htmlContent: html,
    }),
  });
  return response.ok;
}
