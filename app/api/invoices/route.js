import { getUserOrThrow, jsonError, jsonOk } from '../_utils';

function buildDate(year, month, day) {
  return new Date(year, month, day);
}

function resolveCycle(date, card) {
  const closeDay = card.fechamento_dia;
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  let cycleMonth = month;
  let cycleYear = year;
  if (day > closeDay) {
    cycleMonth += 1;
    if (cycleMonth > 11) {
      cycleMonth = 0;
      cycleYear += 1;
    }
  }

  let dueMonth = cycleMonth;
  let dueYear = cycleYear;
  if (card.vencimento_dia <= closeDay) {
    dueMonth += 1;
    if (dueMonth > 11) {
      dueMonth = 0;
      dueYear += 1;
    }
  }

  return { cycleMonth, cycleYear, dueMonth, dueYear };
}

export async function GET(req) {
  const { supabase, user, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get('year'));
  const month = Number(searchParams.get('month'));
  if (Number.isNaN(year) || Number.isNaN(month)) {
    return jsonError('Ano/mês inválidos.');
  }

  const { data: cards, error: cardsError } = await supabase
    .from('cards')
    .select('*')
    .eq('user_id', user.id);
  if (cardsError) return jsonError('Erro ao buscar cartões.', 500);

  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .eq('tipo', 'despesa')
    .eq('metodo_pagamento', 'credito');
  if (txError) return jsonError('Erro ao buscar transações.', 500);

  const invoices = [];
  for (const card of cards) {
    const closeDate = buildDate(year, month, card.fechamento_dia);
    const status = closeDate >= new Date() ? 'aberta' : 'fechada';

    let total = 0;
    transactions.forEach((t) => {
      if (t.card_id !== card.id) return;
      const cycle = resolveCycle(new Date(t.data), card);
      if (cycle.cycleYear === year && cycle.cycleMonth === month) {
        total += Number(t.valor);
      }
    });

    invoices.push({
      cardId: card.id,
      cycleYear: year,
      cycleMonth: month,
      total,
      status,
      fechamentoDate: closeDate.toISOString().slice(0, 10),
      vencimentoDate: buildDate(
        cycleDueYear(card, year, month),
        cycleDueMonth(card, month),
        card.vencimento_dia
      ).toISOString().slice(0, 10),
    });
  }

  return jsonOk(invoices);
}

function cycleDueMonth(card, cycleMonth) {
  const dueMonth = card.vencimento_dia <= card.fechamento_dia ? cycleMonth + 1 : cycleMonth;
  return dueMonth > 11 ? 0 : dueMonth;
}

function cycleDueYear(card, cycleYear, cycleMonth) {
  const dueMonth = card.vencimento_dia <= card.fechamento_dia ? cycleMonth + 1 : cycleMonth;
  if (dueMonth > 11) return cycleYear + 1;
  return cycleYear;
}
