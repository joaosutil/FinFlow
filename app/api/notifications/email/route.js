import { getUserOrThrow, jsonError, jsonOk } from '../../_utils';
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

export async function POST(req) {
  const { supabase, user, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const brevoKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL;
  const fromName = process.env.BREVO_FROM_NAME || 'FinFlow';
  if (!brevoKey || !fromEmail) {
    return jsonError('BREVO_API_KEY e BREVO_FROM_EMAIL são obrigatórios.', 500);
  }

  const body = await req.json().catch(() => ({}));
  const month = Number(body.month);
  const year = Number(body.year);
  if (Number.isNaN(month) || Number.isNaN(year)) return jsonError('Mês/ano inválidos.');

  const { data: budgets } = await supabase.from('budgets').select('*');
  const { data: transactions } = await supabase.from('transactions').select('*');
  const { data: invoices } = await supabase
    .from('card_invoices')
    .select('*')
    .eq('cycle_year', year)
    .eq('cycle_month', month);

  const monthTransactions = transactions.filter((t) => {
    const d = new Date(t.data);
    return d.getFullYear() === year && d.getMonth() === month && t.tipo === 'despesa';
  });

  const spendingByCat = {};
  monthTransactions.forEach((t) => {
    spendingByCat[t.categoria] = (spendingByCat[t.categoria] || 0) + Number(t.valor);
  });

  const budgetAlerts = budgets
    .map((b) => {
      const spent = spendingByCat[b.category_key] || 0;
      const ratio = spent / Number(b.monthly_limit || 1);
      return { ...b, spent, ratio };
    })
    .filter((b) => b.ratio >= Number(b.alert_threshold));

  const invoiceAlerts = invoices.filter((i) => i.status === 'aberta');

  const html = `
    <div style="font-family:Arial,sans-serif;color:#111">
      <h2>FinFlow • Alertas do mês</h2>
      <p>Olá! Aqui estão seus alertas:</p>
      <h3>Orçamentos</h3>
      ${budgetAlerts.length ? `<ul>${budgetAlerts.map((b) =>
        `<li>${b.category_key}: gasto ${b.spent.toFixed(2)} / limite ${Number(b.monthly_limit).toFixed(2)}</li>`
      ).join('')}</ul>` : '<p>Sem alertas de orçamento 🎉</p>'}
      <h3>Faturas</h3>
      ${invoiceAlerts.length ? `<ul>${invoiceAlerts.map((i) =>
        `<li>Cartão ${i.card_id} • vence em ${buildDateLabel(i.vencimento_date)} • total ${Number(i.total).toFixed(2)}</li>`
      ).join('')}</ul>` : '<p>Sem faturas abertas 🎉</p>'}
    </div>
  `;

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': brevoKey,
    },
    body: JSON.stringify({
      sender: { email: fromEmail, name: fromName },
      to: [{ email: user.email }],
      subject: 'FinFlow • Alertas do mês',
      htmlContent: html,
    }),
  });
  if (!response.ok) {
    return jsonError('Falha ao enviar email via Brevo.', 500);
  }

  return jsonOk({ sent: true });
}
