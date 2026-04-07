const CATS_RECEITA = [
  { key: 'salario', label: 'Salário', emoji: '💼' },
  { key: 'freelance', label: 'Freelance', emoji: '💻' },
  { key: 'investimento', label: 'Investimento', emoji: '📈' },
  { key: 'aluguel_rec', label: 'Aluguel Recebido', emoji: '🏠' },
  { key: 'bonus', label: 'Bônus', emoji: '🎁' },
  { key: 'outros', label: 'Outros', emoji: '📦' },
];

const CATS_DESPESA = [
  { key: 'moradia', label: 'Moradia', emoji: '🏠' },
  { key: 'alimentacao', label: 'Alimentação', emoji: '🍽️' },
  { key: 'transporte', label: 'Transporte', emoji: '🚗' },
  { key: 'saude', label: 'Saúde', emoji: '💊' },
  { key: 'educacao', label: 'Educação', emoji: '📚' },
  { key: 'lazer', label: 'Lazer', emoji: '🎮' },
  { key: 'vestuario', label: 'Vestuário', emoji: '👕' },
  { key: 'servicos', label: 'Serviços/Assinaturas', emoji: '📱' },
  { key: 'investimento', label: 'Investimento', emoji: '💰' },
  { key: 'pet', label: 'Pet', emoji: '🐾' },
  { key: 'beleza', label: 'Beleza/Higiene', emoji: '💆' },
  { key: 'presentes', label: 'Presentes', emoji: '🎁' },
  { key: 'outros', label: 'Outros', emoji: '📦' },
];

const CAT_COLORS = {
  moradia: '#74b9ff',
  alimentacao: '#ffd166',
  transporte: '#a29bfe',
  saude: '#00e5a0',
  educacao: '#fdcb6e',
  lazer: '#ff6b6b',
  vestuario: '#ffa502',
  servicos: '#74b9ff',
  investimento: '#00e5a0',
  salario: '#00e5a0',
  freelance: '#74b9ff',
  aluguel_rec: '#a29bfe',
  bonus: '#ffd166',
  pet: '#fd79a8',
  beleza: '#e17055',
  presentes: '#fd79a8',
  outros: '#b2bec3',
};

const state = {
  transactions: [],
  goals: [],
  cards: [],
  investments: [],
  recurring: [],
  invoices: [],
  categories: [],
  budgets: [],
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  chartMode: 'mes',
  filterText: '',
  charts: {
    receitasDespesas: null,
    categorias: null,
    anual: null,
  },
};

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

window.FIN_INIT = () => {
  if (window.FIN_INITED) return;
  window.FIN_INITED = true;

  document.getElementById('monthSel').value = state.currentMonth;
  document.getElementById('anoLabel').textContent = state.currentYear;
  document.getElementById('inputData').value = new Date().toISOString().split('T')[0];

  document.getElementById('monthSel').addEventListener('change', changeMonth);
  document.getElementById('filterInput').addEventListener('input', handleFilter);
  document.getElementById('modalOverlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });
  document.getElementById('modalMetaOverlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModalMeta(); });
  document.getElementById('modalCardOverlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModalCard(); });
  document.getElementById('inputMetodo').addEventListener('change', toggleCartaoField);
  document.getElementById('cardVencimento').addEventListener('input', handleCardDates);
  document.getElementById('cardFechamento').addEventListener('input', handleCardDates);
  document.getElementById('modalInvestOverlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModalInvestimento(); });
  document.getElementById('modalInvestUpdateOverlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModalInvestimentoUpdate(); });
  document.getElementById('modalRecorrenciaOverlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModalRecorrencia(); });
  document.getElementById('recMetodo').addEventListener('change', toggleRecCartaoField);
  document.getElementById('recTipo').addEventListener('change', handleRecTipo);
  document.getElementById('modalCategoriaOverlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModalCategoria(); });
  document.getElementById('catTipo').addEventListener('change', handleCatTipo);
  document.getElementById('modalBudgetOverlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModalBudget(); });

  loadData();
};

async function fetchJson(url, options = {}) {
  if (!window.FIN_TOKEN) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${window.FIN_TOKEN}`,
      ...(options.headers || {}),
    },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.status === 'error') {
    const message = payload.message || 'Erro inesperado na API.';
    throw new Error(message);
  }
  return payload.data;
}

function setStatus(text, kind) {
  const el = document.getElementById('appStatus');
  el.textContent = text;
  el.classList.remove('status-ok', 'status-loading', 'status-error');
  if (kind) el.classList.add(`status-${kind}`);
}

function setLoading(isLoading) {
  document.querySelectorAll('.btn-add, .btn-submit').forEach((btn) => {
    btn.disabled = isLoading;
    btn.style.opacity = isLoading ? '0.6' : '';
    btn.style.cursor = isLoading ? 'not-allowed' : '';
  });
}

async function loadData() {
  setStatus('Carregando...', 'loading');
  setLoading(true);
  try {
    await fetchJson('/api/recurring/ensure', { method: 'POST' });
    await fetchJson('/api/goals/auto', {
      method: 'POST',
      body: JSON.stringify({ month: state.currentMonth, year: state.currentYear }),
    });

    const [transactions, goals, cards, investments, recurring, invoices, categories, budgets] = await Promise.all([
      fetchJson('/api/transactions'),
      fetchJson('/api/goals'),
      fetchJson('/api/cards'),
      fetchJson('/api/investments'),
      fetchJson('/api/recurring'),
      fetchJson(`/api/invoices?year=${state.currentYear}&month=${state.currentMonth}`),
      fetchJson('/api/categories'),
      fetchJson('/api/budgets'),
    ]);
    state.transactions = transactions;
    state.goals = goals;
    state.cards = cards;
    state.investments = investments;
    state.recurring = recurring;
    state.invoices = invoices;
    state.categories = categories;
    state.budgets = budgets;
    setStatus('Online', 'ok');
    render();
  } catch (error) {
    setStatus('Erro ao conectar', 'error');
    console.error(error);
  } finally {
    setLoading(false);
  }
}

async function refreshInvoices() {
  try {
    state.invoices = await fetchJson(`/api/invoices?year=${state.currentYear}&month=${state.currentMonth}`);
  } catch (error) {
    console.error(error);
  }
}

async function changeMonth() {
  state.currentMonth = parseInt(document.getElementById('monthSel').value, 10);
  await refreshInvoices();
  render();
}

function handleFilter(e) {
  state.filterText = e.target.value.toLowerCase().trim();
  render();
}

function filteredTransactions() {
  return state.transactions.filter((t) => {
    const date = new Date(t.data);
    const matchesMonth = date.getMonth() === state.currentMonth && date.getFullYear() === state.currentYear;
    if (!matchesMonth) return false;
    if (!state.filterText) return true;
    const text = `${t.descricao} ${t.categoria}`.toLowerCase();
    return text.includes(state.filterText);
  });
}

function getCategoriesByTipo(tipo) {
  const base = tipo === 'receita' ? CATS_RECEITA : CATS_DESPESA;
  const custom = state.categories.filter((c) => c.tipo === tipo).map((c) => ({
    key: `custom_${c.id}`,
    label: c.nome,
    emoji: '🏷️',
    color: c.cor || null,
    custom: true,
  }));
  return [...custom, ...base];
}

function getCategoryMeta(tipo, key) {
  if (key && String(key).startsWith('custom_')) {
    const id = Number(String(key).replace('custom_', ''));
    const cat = state.categories.find((c) => c.id === id);
    if (cat) return { label: cat.nome, emoji: '🏷️', color: cat.cor || null };
  }
  const base = tipo === 'receita' ? CATS_RECEITA : CATS_DESPESA;
  const found = base.find((c) => c.key === key);
  if (found) return { label: found.label, emoji: found.emoji, color: CAT_COLORS[key] || null };
  return { label: key, emoji: '📦', color: null };
}

function renderBudgets() {
  const grid = document.getElementById('budgetGrid');
  if (!grid) return;
  if (state.budgets.length === 0) {
    grid.innerHTML = `<div class="empty-state"><span class="empty-icon">📉</span>Nenhum orçamento cadastrado.</div>`;
    return;
  }

  const spending = {};
  state.transactions.forEach((t) => {
    const d = new Date(t.data);
    if (d.getFullYear() !== state.currentYear || d.getMonth() !== state.currentMonth) return;
    if (t.tipo !== 'despesa') return;
    spending[t.categoria] = (spending[t.categoria] || 0) + t.valor;
  });

  grid.innerHTML = state.budgets.map((b) => {
    const spent = spending[b.categoryKey] || 0;
    const ratio = Math.min(spent / b.monthlyLimit, 1);
    const alertAt = b.alertThreshold || 0.8;
    const alertLabel = spent >= b.monthlyLimit ? 'Estouro de orçamento' : spent >= b.monthlyLimit * alertAt ? 'Alerta de orçamento' : '';
    return `<div class="budget-card">
      <div class="budget-title">${getCategoryMeta('despesa', b.categoryKey).label}</div>
      <div class="budget-meta">Limite: ${fmt(b.monthlyLimit)} • Gasto: ${fmt(spent)}</div>
      <div class="budget-bar"><div class="budget-bar-fill" style="width:${ratio * 100}%;"></div></div>
      <div class="budget-alert">${alertLabel}</div>
      <div style="margin-top:8px">
        <button class="btn-edit" onclick="editarBudget(${b.id})" title="Editar">✎</button>
        <button class="btn-del" onclick="deletarBudget(${b.id})" title="Excluir">✕</button>
      </div>
    </div>`;
  }).join('');
}

function render() {
  const all = filteredTransactions();
  const receitas = all.filter((t) => t.tipo === 'receita');
  const despesas = all.filter((t) => t.tipo === 'despesa');
  const totRec = receitas.reduce((s, t) => s + t.valor, 0);
  const totDesp = despesas.reduce((s, t) => s + t.valor, 0);
  const saldo = totRec - totDesp;
  const taxa = totRec > 0 ? Math.round((saldo / totRec) * 100) : 0;

  setText('totalReceitas', fmt(totRec));
  setText('qtdReceitas', `${receitas.length} lançamento${receitas.length !== 1 ? 's' : ''}`);
  setText('totalDespesas', fmt(totDesp));
  setText('qtdDespesas', `${despesas.length} lançamento${despesas.length !== 1 ? 's' : ''}`);
  setText('saldoMes', fmt(saldo));
  setText('saldoSub', saldo >= 0 ? '✓ Positivo' : '⚠ Negativo');
  document.getElementById('saldoMes').style.color = saldo >= 0 ? 'var(--accent4)' : 'var(--accent2)';
  setText('taxaEconomia', `${taxa}%`);
  setText('economiaSub', taxa >= 20 ? '🟢 Ótima economia' : taxa >= 10 ? '🟡 Pode melhorar' : '🔴 Atenção');

  const maxV = Math.max(totRec, totDesp, 1);
  document.getElementById('barReceitas').style.width = `${(totRec / maxV) * 100}%`;
  document.getElementById('barDespesas').style.width = `${(totDesp / maxV) * 100}%`;
  document.getElementById('barSaldo').style.width = `${Math.min(Math.abs(saldo) / maxV * 100, 100)}%`;
  document.getElementById('barEconomia').style.width = `${Math.min(Math.max(taxa, 0), 100)}%`;

  renderTabela('tbodyReceitas', receitas, false);
  renderTabela('tbodyDespesas', despesas, true);
  renderCats(despesas, totDesp);
  renderChartReceitasDespesas();
  renderChartCategorias(despesas);
  renderMetas();
  renderCards();
  renderInvestimentos();
  renderComparativo();
  renderAnual();
  renderRecorrencias();
  renderCategorias();
  renderBudgets();
}

function renderTabela(tbodyId, items, showStatus) {
  const tb = document.getElementById(tbodyId);
  if (items.length === 0) {
    tb.innerHTML = `<tr><td colspan="5"><div class="empty-state"><span class="empty-icon">📭</span>Nenhum lançamento neste mês.</div></td></tr>`;
    return;
  }

  tb.innerHTML = items.map((t) => {
    const catObj = getCategoryMeta(t.tipo, t.categoria);
    const statusHtml = showStatus
      ? `<span class="td-status status-${t.status || 'pago'}">${(t.status || 'pago').toUpperCase()}</span>`
      : `<span class="td-date">${fmtDate(t.data)}</span>`;
    return `<tr>
      <td class="td-desc">${escHtml(t.descricao)}</td>
      <td><span class="td-cat cat-${t.categoria}">${catObj.emoji} ${catObj.label}</span></td>
      <td class="td-value ${t.tipo === 'receita' ? 'value-pos' : 'value-neg'}">${fmt(t.valor)}</td>
      ${showStatus ? `<td>${statusHtml}</td>` : `<td class="td-date">${fmtDate(t.data)}</td>`}
      <td>
        <button class="btn-edit" onclick="editarLancamento(${t.id})" title="Editar">✎</button>
        <button class="btn-del" onclick="deletar(${t.id})" title="Excluir">✕</button>
      </td>
    </tr>`;
  }).join('');
}

function renderCats(despesas, total) {
  const grid = document.getElementById('catGrid');
  if (despesas.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="padding:30px"><span class="empty-icon">📊</span>Adicione despesas para ver o breakdown.</div>`;
    return;
  }
  const map = {};
  despesas.forEach((t) => {
    if (!map[t.categoria]) map[t.categoria] = 0;
    map[t.categoria] += t.valor;
  });
  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
  grid.innerHTML = sorted.map(([key, val]) => {
    const catObj = getCategoryMeta('despesa', key);
    const pct = total > 0 ? Math.round(val / total * 100) : 0;
    const color = catObj.color || CAT_COLORS[key] || '#b2bec3';
    return `<div class="cat-item">
      <div class="cat-item-top">
        <span class="cat-emoji">${catObj.emoji}</span>
        <span class="cat-pct">${pct}%</span>
      </div>
      <div class="cat-name">${catObj.label}</div>
      <div class="cat-amount">${fmt(val)}</div>
      <div class="cat-progress">
        <div class="cat-progress-fill" style="width:${pct}%;background:${color}"></div>
      </div>
    </div>`;
  }).join('');
}

function renderChartReceitasDespesas() {
  const ctx = document.getElementById('chartReceitasDespesas');
  let labels;
  let recVals;
  let despVals;

  if (state.chartMode === 'mes') {
    const weeks = ['S1', 'S2', 'S3', 'S4', 'S5'];
    recVals = [0, 0, 0, 0, 0];
    despVals = [0, 0, 0, 0, 0];
    filteredTransactions().forEach((t) => {
      const day = new Date(t.data).getDate();
      const wk = Math.min(Math.floor((day - 1) / 7), 4);
      if (t.tipo === 'receita') recVals[wk] += t.valor;
      else despVals[wk] += t.valor;
    });
    labels = weeks;
  } else {
    labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    recVals = Array(12).fill(0);
    despVals = Array(12).fill(0);
    state.transactions
      .filter((t) => new Date(t.data).getFullYear() === state.currentYear)
      .forEach((t) => {
        const month = new Date(t.data).getMonth();
        if (t.tipo === 'receita') recVals[month] += t.valor;
        else despVals[month] += t.valor;
      });
  }

  const data = {
    labels,
    datasets: [
      {
        label: 'Receitas',
        data: recVals,
        backgroundColor: 'rgba(0,229,160,0.7)',
        borderRadius: 6,
      },
      {
        label: 'Despesas',
        data: despVals,
        backgroundColor: 'rgba(255,107,107,0.7)',
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600 },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#6b7fa3', font: { size: 10 } } },
      y: { grid: { color: '#1e2d45' }, ticks: { color: '#6b7fa3', font: { size: 10 } } },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${fmt(context.parsed.y || 0)}`,
        },
      },
    },
  };

  if (state.charts.receitasDespesas) {
    state.charts.receitasDespesas.data = data;
    state.charts.receitasDespesas.options = options;
    state.charts.receitasDespesas.update();
  } else {
    state.charts.receitasDespesas = new Chart(ctx, { type: 'bar', data, options });
  }
}

function renderChartCategorias(despesas) {
  const ctx = document.getElementById('chartCategorias');
  if (!ctx) return;

  const map = {};
  despesas.forEach((t) => {
    if (!map[t.categoria]) map[t.categoria] = 0;
    map[t.categoria] += t.valor;
  });
  const labels = Object.keys(map);
  const dataValues = Object.values(map);
  const colors = labels.map((key) => CAT_COLORS[key] || '#b2bec3');

  const data = {
    labels,
    datasets: [
      {
        data: dataValues,
        backgroundColor: colors,
        borderWidth: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { position: 'bottom', labels: { color: '#6b7fa3', font: { size: 10 } } },
      tooltip: {
        callbacks: {
          label: (context) => `${context.label}: ${fmt(context.parsed || 0)}`,
        },
      },
    },
  };

  if (state.charts.categorias) {
    state.charts.categorias.data = data;
    state.charts.categorias.options = options;
    state.charts.categorias.update();
  } else {
    state.charts.categorias = new Chart(ctx, { type: 'doughnut', data, options });
  }
}

function renderMetas() {
  const grid = document.getElementById('metasGrid');
  if (state.goals.length === 0) {
    grid.innerHTML = `<div class="empty-state"><span class="empty-icon">🎯</span>Nenhuma meta definida.</div>`;
    return;
  }
  grid.innerHTML = state.goals.map((m) => {
    const pct = m.alvo > 0 ? Math.min(Math.round((m.atual / m.alvo) * 100), 100) : 0;
    return `<div class="meta-card">
      <div class="meta-top">
        <div>
          <div class="meta-name">${escHtml(m.nome)}</div>
          <div class="meta-target">Meta: ${fmt(m.alvo)}</div>
          <div class="meta-target">Contribuição: ${m.contribPercent || 0}%</div>
        </div>
        <div>
          <button class="btn-edit" onclick="editarMeta(${m.id})" title="Editar">✎</button>
          <button class="btn-del" onclick="deletarMeta(${m.id})" title="Excluir">✕</button>
        </div>
      </div>
      <div class="meta-current">${fmt(m.atual)}</div>
      <div class="meta-bar"><div class="meta-bar-fill" style="width:${pct}%;${pct >= 100 ? 'background:var(--accent3)' : ''}"></div></div>
      <div class="meta-pct">${pct}% concluído${pct >= 100 ? ' 🎉' : ''}</div>
    </div>`;
  }).join('');
}

function renderInvestimentos() {
  const grid = document.getElementById('investGrid');
  if (!grid) return;
  if (state.investments.length === 0) {
    grid.innerHTML = `<div class="empty-state"><span class="empty-icon">💹</span>Nenhum investimento cadastrado.</div>`;
    return;
  }

  grid.innerHTML = state.investments.map((inv) => {
    const retorno = inv.aporteInicial > 0 ? ((inv.valorAtual - inv.aporteInicial) / inv.aporteInicial) * 100 : 0;
    const retornoLabel = `${retorno >= 0 ? '+' : ''}${retorno.toFixed(1)}%`;
    const history = (inv.history || []).slice(-3).map((h) => `${fmtDate(h.data)} • ${fmt(h.valor)}`).join('<br/>');
    return `<div class="invest-card">
      <div class="invest-top">
        <div>
          <div class="invest-name">${escHtml(inv.nome)}</div>
          <div class="invest-meta">Início: ${fmtDate(inv.dataInicio)}</div>
        </div>
        <div>
          <button class="btn-edit" onclick="editarInvestimento(${inv.id})" title="Editar">✎</button>
          <button class="btn-del" onclick="deletarInvestimento(${inv.id})" title="Excluir">✕</button>
        </div>
      </div>
      <div class="invest-amount">${fmt(inv.valorAtual)}</div>
      <div class="invest-return">Rentabilidade: ${retornoLabel}</div>
      <div class="invest-history">${history || 'Sem histórico recente.'}</div>
      <button class="btn-add" style="margin-top:10px" onclick="openModalInvestimentoUpdate(${inv.id})">Atualizar Valor</button>
    </div>`;
  }).join('');
}

function renderRecorrencias() {
  const grid = document.getElementById('recorrenciaGrid');
  if (!grid) return;
  if (state.recurring.length === 0) {
    grid.innerHTML = `<div class="empty-state"><span class="empty-icon">🔁</span>Nenhuma recorrência cadastrada.</div>`;
    return;
  }
  grid.innerHTML = state.recurring.map((r) => {
    return `<div class="rec-card">
      <div class="rec-title">${escHtml(r.descricao)}</div>
      <div class="rec-meta">${r.tipo} • Dia ${r.dayOfMonth} • ${r.categoria}</div>
      <div class="rec-value">${fmt(r.valor)}</div>
      <div class="rec-meta">Início: ${fmtDate(r.startDate)}${r.endDate ? ` • Fim: ${fmtDate(r.endDate)}` : ''}</div>
      <div style="margin-top:8px">
        <button class="btn-edit" onclick="editarRecorrencia(${r.id})" title="Editar">✎</button>
        <button class="btn-del" onclick="deletarRecorrencia(${r.id})" title="Excluir">✕</button>
      </div>
    </div>`;
  }).join('');
}

function renderComparativo() {
  const current = getMonthTotals(state.currentYear, state.currentMonth);
  const { year: prevYear, month: prevMonth } = getPreviousMonth(state.currentYear, state.currentMonth);
  const previous = getMonthTotals(prevYear, prevMonth);

  setText('compRecAtual', fmt(current.receitas));
  setText('compRecPrev', fmt(previous.receitas));
  setText('compDespAtual', fmt(current.despesas));
  setText('compDespPrev', fmt(previous.despesas));
  setText('compSaldoAtual', fmt(current.saldo));
  setText('compSaldoPrev', fmt(previous.saldo));

  setDelta('compRecDelta', current.receitas, previous.receitas);
  setDelta('compDespDelta', current.despesas, previous.despesas, true);
  setDelta('compSaldoDelta', current.saldo, previous.saldo);

  const monthLabel = (m) => ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][m];
  setText('compPeriodo', `${monthLabel(state.currentMonth)} vs ${monthLabel(prevMonth)} ${prevYear}`);
}

function renderAnual() {
  const currentYear = state.currentYear;
  const prevYear = currentYear - 1;
  const currentTotals = getYearTotals(currentYear);
  const prevTotals = getYearTotals(prevYear);

  setText('annualReceitas', fmt(currentTotals.receitas));
  setText('annualDespesas', fmt(currentTotals.despesas));
  setText('annualSaldo', fmt(currentTotals.saldo));

  setDelta('annualReceitasDelta', currentTotals.receitas, prevTotals.receitas);
  setDelta('annualDespesasDelta', currentTotals.despesas, prevTotals.despesas, true);
  setDelta('annualSaldoDelta', currentTotals.saldo, prevTotals.saldo);

  const labels = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const monthlyRec = Array(12).fill(0);
  const monthlyDesp = Array(12).fill(0);
  state.transactions.forEach((t) => {
    const d = new Date(t.data);
    if (d.getFullYear() !== currentYear) return;
    const m = d.getMonth();
    if (t.tipo === 'receita') monthlyRec[m] += t.valor;
    else monthlyDesp[m] += t.valor;
  });

  setText('annualPeriodo', `Ano ${currentYear} vs ${prevYear}`);

  const ctx = document.getElementById('chartAnual');
  if (!ctx) return;

  const data = {
    labels,
    datasets: [
      { label: 'Receitas', data: monthlyRec, borderColor: 'rgba(0,229,160,0.9)', backgroundColor: 'rgba(0,229,160,0.2)', tension: 0.3 },
      { label: 'Despesas', data: monthlyDesp, borderColor: 'rgba(255,107,107,0.9)', backgroundColor: 'rgba(255,107,107,0.2)', tension: 0.3 },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { color: '#6b7fa3', font: { size: 10 } } } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#6b7fa3', font: { size: 10 } } },
      y: { grid: { color: '#1e2d45' }, ticks: { color: '#6b7fa3', font: { size: 10 } } },
    },
  };

  if (state.charts.anual) {
    state.charts.anual.data = data;
    state.charts.anual.options = options;
    state.charts.anual.update();
  } else {
    state.charts.anual = new Chart(ctx, { type: 'line', data, options });
  }
}

function getYearTotals(year) {
  const items = state.transactions.filter((t) => {
    const d = new Date(t.data);
    return d.getFullYear() === year;
  });
  const receitas = items.filter((t) => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0);
  const despesas = items.filter((t) => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0);
  return { receitas, despesas, saldo: receitas - despesas };
}

function getMonthTotals(year, month) {
  const items = state.transactions.filter((t) => {
    const d = new Date(t.data);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const receitas = items.filter((t) => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0);
  const despesas = items.filter((t) => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0);
  return { receitas, despesas, saldo: receitas - despesas };
}

function getPreviousMonth(year, month) {
  if (month === 0) return { year: year - 1, month: 11 };
  return { year, month: month - 1 };
}

function setDelta(id, current, previous, invert = false) {
  const el = document.getElementById(id);
  if (!el) return;
  const diff = current - previous;
  const pct = previous > 0 ? (diff / previous) * 100 : 0;
  const sign = diff >= 0 ? '+' : '';
  const label = previous === 0 ? '—' : `${sign}${pct.toFixed(1)}%`;
  el.textContent = label;
  el.style.color = invert
    ? (diff <= 0 ? 'var(--accent)' : 'var(--accent2)')
    : (diff >= 0 ? 'var(--accent)' : 'var(--accent2)');
}

function renderCards() {
  const grid = document.getElementById('cardsGrid');
  if (!grid) return;
  if (state.cards.length === 0) {
    grid.innerHTML = `<div class="empty-state"><span class="empty-icon">💳</span>Nenhum cartão cadastrado.</div>`;
    return;
  }

  const invoices = state.invoices.length ? state.invoices : buildInvoicesForMonth();
  grid.innerHTML = state.cards.map((card) => {
    const invoice = invoices.find((i) => i.cardId === card.id);
    const total = invoice ? invoice.total : 0;
    const vencimento = invoice?.vencimentoDate ? fmtDate(invoice.vencimentoDate) : `Dia ${card.vencimentoDia}`;
    const fechamento = invoice?.fechamentoDate ? fmtDate(invoice.fechamentoDate) : `Dia ${card.fechamentoDia}`;
    const dueDate = invoice?.vencimentoDate ? new Date(invoice.vencimentoDate) : buildDateFromCycle(card.vencimentoDia, state.currentMonth, state.currentYear);
    const closeDate = invoice?.fechamentoDate ? new Date(invoice.fechamentoDate) : buildDateFromCycle(card.fechamentoDia, state.currentMonth, state.currentYear);
    const dueInfo = getDateHighlightInfo(dueDate, 'due');
    const closeInfo = getDateHighlightInfo(closeDate, 'close');
    const status = invoice?.status || getInvoiceStatus(closeDate);
    return `<div class="card-chip">
      <div class="card-chip-top">
        <div>
          <div class="card-chip-name">${escHtml(card.nome)}</div>
          <div class="card-chip-meta">${escHtml(card.bandeira)} • Final ${escHtml(card.final)}</div>
        </div>
        <div>
          <button class="btn-edit" onclick="editarCartao(${card.id})" title="Editar">✎</button>
          <button class="btn-del" onclick="deletarCartao(${card.id})" title="Excluir">✕</button>
        </div>
      </div>
      <div class="card-chip-amount">${fmt(total)}</div>
      <div class="card-chip-due ${closeInfo.className}">Fechamento: ${fechamento} <span class="chip-label">${closeInfo.label}</span></div>
      <div class="card-chip-due ${dueInfo.className}">Vencimento: ${vencimento} <span class="chip-label">${dueInfo.label}</span></div>
      <div class="card-chip-due">
        Fatura: <span class="invoice-status ${status === 'aberta' ? 'invoice-open' : 'invoice-closed'}">${status}</span>
      </div>
    </div>`;
  }).join('');
}

function buildInvoicesForMonth() {
  const invoicesMap = {};
  state.transactions
    .filter((t) => t.tipo === 'despesa' && t.metodoPagamento === 'credito' && t.cardId)
    .forEach((t) => {
      const card = state.cards.find((c) => c.id === t.cardId);
      if (!card) return;
      const invoice = resolveInvoiceCycle(new Date(t.data), card);
      const key = `${t.cardId}-${invoice.cycleYear}-${invoice.cycleMonth}`;
    if (!invoicesMap[key]) {
    invoicesMap[key] = {
      cardId: t.cardId,
      total: 0,
      cycleMonth: invoice.cycleMonth,
      cycleYear: invoice.cycleYear,
      vencimento: buildDueDateLabel(card.vencimentoDia, invoice.dueMonth, invoice.dueYear),
      fechamento: buildDueDateLabel(card.fechamentoDia, invoice.cycleMonth, invoice.cycleYear),
      dueDate: buildDateFromCycle(card.vencimentoDia, invoice.dueMonth, invoice.dueYear),
      closeDate: buildDateFromCycle(card.fechamentoDia, invoice.cycleMonth, invoice.cycleYear),
      status: getInvoiceStatus(buildDateFromCycle(card.fechamentoDia, invoice.cycleMonth, invoice.cycleYear)),
    };
    }
    invoicesMap[key].total += t.valor;
  });

  return Object.values(invoicesMap).filter((invoice) => (
    invoice.cycleMonth === state.currentMonth && invoice.cycleYear === state.currentYear
  ));
}

function buildDueDateLabel(day, monthIndex, year) {
  const month = monthIndex + 1;
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

function buildDateFromCycle(day, monthIndex, year) {
  return new Date(year, monthIndex, day);
}

function getDateHighlightInfo(targetDate, type) {
  if (!targetDate) return '';
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffMs = targetDate.getTime() - startOfToday.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const labels = {
    due: { today: 'Vence hoje', soon: 'Falta 1 dia', days: (d) => `Faltam ${d} dias`, past: 'Vencido' },
    close: { today: 'Fecha hoje', soon: 'Falta 1 dia', days: (d) => `Faltam ${d} dias`, past: 'Fechado' },
  };
  const text = labels[type] || labels.due;
  if (diffDays < 0) return { className: 'due-past', label: 'Vencido' };
  if (diffDays < 0) return { className: 'due-past', label: text.past };
  if (diffDays === 0) return { className: 'due-today', label: text.today };
  if (diffDays === 1) return { className: 'due-soon', label: text.soon };
  if (diffDays <= 7) return { className: 'due-warning', label: text.days(diffDays) };
  return { className: '', label: '' };
}

function getInvoiceStatus(closeDate) {
  if (!closeDate) return 'aberta';
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return closeDate >= startOfToday ? 'aberta' : 'fechada';
}

function handleCardDates() {
  const vencimentoInput = document.getElementById('cardVencimento');
  const fechamentoInput = document.getElementById('cardFechamento');
  if (!vencimentoInput || !fechamentoInput) return;
  const vencimento = parseInt(vencimentoInput.value, 10);
  const fechamento = parseInt(fechamentoInput.value, 10);
  if (Number.isNaN(vencimento)) return;

  const suggested = Math.max(1, vencimento - 5);
  if (Number.isNaN(fechamento)) {
    fechamentoInput.value = suggested;
    return;
  }
  if (fechamento >= vencimento) {
    fechamentoInput.value = suggested;
  }
}

function resolveInvoiceCycle(transactionDate, card) {
  const closeDay = card.fechamentoDia || 1;
  const year = transactionDate.getFullYear();
  const month = transactionDate.getMonth();
  const day = transactionDate.getDate();

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
  if (card.vencimentoDia <= closeDay) {
    dueMonth += 1;
    if (dueMonth > 11) {
      dueMonth = 0;
      dueYear += 1;
    }
  }

  return { cycleMonth, cycleYear, dueMonth, dueYear };
}

function openModal(tipo, item = null) {
  document.getElementById('modalTipo').value = tipo;
  document.getElementById('editId').value = item ? item.id : '';
  document.getElementById('modalTitleText').textContent = item
    ? `${tipo === 'receita' ? '💰' : '💳'} Editar ${tipo === 'receita' ? 'Receita' : 'Despesa'}`
    : `${tipo === 'receita' ? '💰' : '💳'} Nova ${tipo === 'receita' ? 'Receita' : 'Despesa'}`;

  const catSel = document.getElementById('inputCat');
  const cats = getCategoriesByTipo(tipo);
  catSel.innerHTML = cats.map((c) => `<option value="${c.key}">${c.emoji} ${c.label}</option>`).join('');
  document.getElementById('groupStatus').style.display = tipo === 'despesa' ? '' : 'none';

  document.getElementById('inputDesc').value = item ? item.descricao : '';
  document.getElementById('inputValor').value = item ? item.valor : '';
  document.getElementById('inputData').value = item ? item.data.split('T')[0] : new Date().toISOString().split('T')[0];
  document.getElementById('inputCat').value = item ? item.categoria : cats[0].key;
  document.getElementById('inputStatus').value = item ? item.status || 'pago' : 'pago';
  document.getElementById('inputMetodo').value = item ? item.metodoPagamento || 'debito' : (tipo === 'receita' ? 'transferencia' : 'debito');
  fillCartSelect(item ? item.cardId : null);
  toggleCartaoField();

  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function fillCartSelect(selectedId) {
  const select = document.getElementById('inputCartao');
  if (!select) return;
  if (state.cards.length === 0) {
    select.innerHTML = '<option value="">Nenhum cartão cadastrado</option>';
    return;
  }
  select.innerHTML = state.cards
    .map((c) => `<option value="${c.id}">${c.nome} • ${c.bandeira} • ${c.final}</option>`)
    .join('');
  if (selectedId) {
    select.value = String(selectedId);
  }
}

function toggleCartaoField() {
  const metodo = document.getElementById('inputMetodo').value;
  const group = document.getElementById('groupCartao');
  if (!group) return;
  group.style.display = metodo === 'credito' ? '' : 'none';
}

async function salvarLancamento() {
  const tipo = document.getElementById('modalTipo').value;
  const descricao = document.getElementById('inputDesc').value.trim();
  const valor = parseFloat(document.getElementById('inputValor').value);
  const data = document.getElementById('inputData').value;
  const categoria = document.getElementById('inputCat').value;
  const status = document.getElementById('inputStatus').value;
  const metodoPagamento = document.getElementById('inputMetodo').value;
  const cardId = document.getElementById('inputCartao').value || null;
  const editId = document.getElementById('editId').value;

  if (!descricao || Number.isNaN(valor) || valor <= 0 || !data) {
    alert('Preencha todos os campos corretamente.');
    return;
  }
  if (metodoPagamento === 'credito' && !cardId) {
    alert('Selecione um cartão de crédito.');
    return;
  }

  const payload = { descricao, valor, tipo, categoria, data, status, metodoPagamento, cardId };

  setLoading(true);
  try {
    if (editId) {
      await fetchJson(`/api/transactions/${editId}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await fetchJson('/api/transactions', { method: 'POST', body: JSON.stringify(payload) });
    }
    await loadData();
    closeModal();
  } catch (error) {
    setStatus('Erro ao salvar', 'error');
    alert(error.message);
  } finally {
    setLoading(false);
  }
}

async function deletar(id) {
  if (!confirm('Excluir este lançamento?')) return;
  setLoading(true);
  try {
    await fetchJson(`/api/transactions/${id}`, { method: 'DELETE' });
    await loadData();
  } catch (error) {
    setStatus('Erro ao excluir', 'error');
    alert(error.message);
  } finally {
    setLoading(false);
  }
}

function editarLancamento(id) {
  const item = state.transactions.find((t) => t.id === id);
  if (!item) return;
  openModal(item.tipo, item);
}

function openModalMeta(meta = null) {
  document.getElementById('metaEditId').value = meta ? meta.id : '';
  document.getElementById('metaNome').value = meta ? meta.nome : '';
  document.getElementById('metaAlvo').value = meta ? meta.alvo : '';
  document.getElementById('metaAtual').value = meta ? meta.atual : '';
  document.getElementById('metaPercent').value = meta ? (meta.contribPercent || 0) : '';
  document.getElementById('modalMetaOverlay').classList.add('open');
}

function closeModalMeta() {
  document.getElementById('modalMetaOverlay').classList.remove('open');
}

async function salvarMeta() {
  const nome = document.getElementById('metaNome').value.trim();
  const alvo = parseFloat(document.getElementById('metaAlvo').value);
  const atual = parseFloat(document.getElementById('metaAtual').value) || 0;
  const contribPercent = parseFloat(document.getElementById('metaPercent').value) || 0;
  const editId = document.getElementById('metaEditId').value;

  if (!nome || Number.isNaN(alvo) || alvo <= 0) {
    alert('Preencha todos os campos.');
    return;
  }

  const payload = { nome, alvo, atual, contribPercent };
  setLoading(true);
  try {
    if (editId) {
      await fetchJson(`/api/goals/${editId}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await fetchJson('/api/goals', { method: 'POST', body: JSON.stringify(payload) });
    }
    await loadData();
    closeModalMeta();
  } catch (error) {
    setStatus('Erro ao salvar', 'error');
    alert(error.message);
  } finally {
    setLoading(false);
  }
}

async function deletarMeta(id) {
  if (!confirm('Excluir esta meta?')) return;
  setLoading(true);
  try {
    await fetchJson(`/api/goals/${id}`, { method: 'DELETE' });
    await loadData();
  } catch (error) {
    setStatus('Erro ao excluir', 'error');
    alert(error.message);
  } finally {
    setLoading(false);
  }
}

function editarMeta(id) {
  const meta = state.goals.find((g) => g.id === id);
  if (!meta) return;
  openModalMeta(meta);
}

function renderCategorias() {
  const grid = document.getElementById('categoriaGrid');
  if (!grid) return;
  if (state.categories.length === 0) {
    grid.innerHTML = `<div class="empty-state"><span class="empty-icon">🏷️</span>Nenhuma categoria personalizada.</div>`;
    return;
  }
  grid.innerHTML = state.categories.map((c) => {
    return `<div class="cat-chip">
      <div>
        <div class="cat-chip-name">${escHtml(c.nome)}</div>
        <div class="cat-chip-meta">${c.tipo} • ${c.cor || 'sem cor'}</div>
      </div>
      <div>
        <button class="btn-edit" onclick="editarCategoria(${c.id})" title="Editar">✎</button>
        <button class="btn-del" onclick="deletarCategoria(${c.id})" title="Excluir">✕</button>
      </div>
    </div>`;
  }).join('');
}

function openModalCategoria(cat = null) {
  document.getElementById('catEditId').value = cat ? cat.id : '';
  document.getElementById('catTitle').textContent = cat ? '🏷️ Editar Categoria' : '🏷️ Nova Categoria';
  document.getElementById('catNome').value = cat ? cat.nome : '';
  document.getElementById('catTipo').value = cat ? cat.tipo : 'despesa';
  document.getElementById('catCor').value = cat ? cat.cor || '' : '';
  document.getElementById('modalCategoriaOverlay').classList.add('open');
}

function closeModalCategoria() {
  document.getElementById('modalCategoriaOverlay').classList.remove('open');
}

function handleCatTipo() {}

async function salvarCategoria() {
  const nome = document.getElementById('catNome').value.trim();
  const tipo = document.getElementById('catTipo').value;
  const cor = document.getElementById('catCor').value.trim() || null;
  const editId = document.getElementById('catEditId').value;

  if (!nome) {
    alert('Preencha o nome da categoria.');
    return;
  }

  const payload = { nome, tipo, cor };
  setLoading(true);
  try {
    if (editId) {
      await fetchJson(`/api/categories/${editId}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await fetchJson('/api/categories', { method: 'POST', body: JSON.stringify(payload) });
    }
    await loadData();
    closeModalCategoria();
  } catch (error) {
    setStatus('Erro ao salvar categoria', 'error');
    alert(error.message);
  } finally {
    setLoading(false);
  }
}

async function deletarCategoria(id) {
  if (!confirm('Excluir esta categoria?')) return;
  setLoading(true);
  try {
    await fetchJson(`/api/categories/${id}`, { method: 'DELETE' });
    await loadData();
  } catch (error) {
    setStatus('Erro ao excluir categoria', 'error');
    alert(error.message);
  } finally {
    setLoading(false);
  }
}

function editarCategoria(id) {
  const cat = state.categories.find((c) => c.id === id);
  if (!cat) return;
  openModalCategoria(cat);
}

function openModalBudget(budget = null) {
  document.getElementById('budgetEditId').value = budget ? budget.id : '';
  document.getElementById('budgetTitle').textContent = budget ? '📉 Editar Orçamento' : '📉 Novo Orçamento';
  const options = getCategoriesByTipo('despesa')
    .map((c) => `<option value="${c.key}">${c.emoji} ${c.label}</option>`)
    .join('');
  document.getElementById('budgetCategory').innerHTML = options;
  document.getElementById('budgetCategory').value = budget ? budget.categoryKey : document.getElementById('budgetCategory').value;
  document.getElementById('budgetLimit').value = budget ? budget.monthlyLimit : '';
  document.getElementById('budgetThreshold').value = budget ? Math.round((budget.alertThreshold || 0.8) * 100) : 80;
  document.getElementById('modalBudgetOverlay').classList.add('open');
}

function closeModalBudget() {
  document.getElementById('modalBudgetOverlay').classList.remove('open');
}

async function salvarBudget() {
  const categoryKey = document.getElementById('budgetCategory').value;
  const monthlyLimit = parseFloat(document.getElementById('budgetLimit').value);
  const alertThreshold = parseFloat(document.getElementById('budgetThreshold').value) / 100;
  const editId = document.getElementById('budgetEditId').value;

  if (!categoryKey || Number.isNaN(monthlyLimit) || Number.isNaN(alertThreshold)) {
    alert('Preencha todos os campos do orçamento.');
    return;
  }

  const payload = { categoryKey, monthlyLimit, alertThreshold };
  setLoading(true);
  try {
    if (editId) {
      await fetchJson(`/api/budgets/${editId}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await fetchJson('/api/budgets', { method: 'POST', body: JSON.stringify(payload) });
    }
    await loadData();
    closeModalBudget();
  } catch (error) {
    setStatus('Erro ao salvar orçamento', 'error');
    alert(error.message);
  } finally {
    setLoading(false);
  }
}

async function deletarBudget(id) {
  if (!confirm('Excluir este orçamento?')) return;
  setLoading(true);
  try {
    await fetchJson(`/api/budgets/${id}`, { method: 'DELETE' });
    await loadData();
  } catch (error) {
    setStatus('Erro ao excluir orçamento', 'error');
    alert(error.message);
  } finally {
    setLoading(false);
  }
}

function editarBudget(id) {
  const budget = state.budgets.find((b) => b.id === id);
  if (!budget) return;
  openModalBudget(budget);
}

async function enviarAlertasEmail() {
  setLoading(true);
  try {
    await fetchJson('/api/notifications/email', {
      method: 'POST',
      body: JSON.stringify({ month: state.currentMonth, year: state.currentYear }),
    });
    setStatus('Alertas enviados', 'ok');
  } catch (error) {
    setStatus('Erro ao enviar alertas', 'error');
    alert(error.message);
  } finally {
    setLoading(false);
  }
}

function openModalCard(card = null) {
  document.getElementById('cardEditId').value = card ? card.id : '';
  document.getElementById('cardNome').value = card ? card.nome : '';
  document.getElementById('cardBandeira').value = card ? card.bandeira : '';
  document.getElementById('cardFinal').value = card ? card.final : '';
  document.getElementById('cardVencimento').value = card ? card.vencimentoDia : '';
  document.getElementById('cardFechamento').value = card ? card.fechamentoDia : '';
  document.getElementById('modalCardOverlay').classList.add('open');
}

function closeModalCard() {
  document.getElementById('modalCardOverlay').classList.remove('open');
}

async function salvarCartao() {
  const nome = document.getElementById('cardNome').value.trim();
  const bandeira = document.getElementById('cardBandeira').value.trim();
  const final = document.getElementById('cardFinal').value.trim();
  const vencimentoDia = parseInt(document.getElementById('cardVencimento').value, 10);
  const fechamentoDia = parseInt(document.getElementById('cardFechamento').value, 10);
  const editId = document.getElementById('cardEditId').value;

  if (!nome || !bandeira || !final || Number.isNaN(vencimentoDia) || Number.isNaN(fechamentoDia)) {
    alert('Preencha todos os campos do cartão.');
    return;
  }

  const payload = { nome, bandeira, final, vencimentoDia, fechamentoDia };
  setLoading(true);
  try {
    if (editId) {
      await fetchJson(`/api/cards/${editId}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await fetchJson('/api/cards', { method: 'POST', body: JSON.stringify(payload) });
    }
    await loadData();
    closeModalCard();
  } catch (error) {
    setStatus('Erro ao salvar cartão', 'error');
    alert(error.message);
  } finally {
    setLoading(false);
  }
}

async function deletarCartao(id) {
  if (!confirm('Excluir este cartão?')) return;
  setLoading(true);
  try {
    await fetchJson(`/api/cards/${id}`, { method: 'DELETE' });
    await loadData();
  } catch (error) {
    setStatus('Erro ao excluir cartão', 'error');
    alert(error.message);
  } finally {
    setLoading(false);
  }
}

function editarCartao(id) {
  const card = state.cards.find((c) => c.id === id);
  if (!card) return;
  openModalCard(card);
}

function openModalInvestimento(inv = null) {
  document.getElementById('investEditId').value = inv ? inv.id : '';
  document.getElementById('investTitle').textContent = inv ? '💹 Editar Investimento' : '💹 Novo Investimento';
  document.getElementById('investNome').value = inv ? inv.nome : '';
  document.getElementById('investAporte').value = inv ? inv.aporteInicial : '';
  document.getElementById('investAtual').value = inv ? inv.valorAtual : '';
  document.getElementById('investData').value = inv ? inv.dataInicio : new Date().toISOString().split('T')[0];
  document.getElementById('modalInvestOverlay').classList.add('open');
}

function closeModalInvestimento() {
  document.getElementById('modalInvestOverlay').classList.remove('open');
}

async function salvarInvestimento() {
  const nome = document.getElementById('investNome').value.trim();
  const aporteInicial = parseFloat(document.getElementById('investAporte').value);
  const valorAtual = parseFloat(document.getElementById('investAtual').value);
  const dataInicio = document.getElementById('investData').value;
  const editId = document.getElementById('investEditId').value;

  if (!nome || Number.isNaN(aporteInicial) || Number.isNaN(valorAtual) || !dataInicio) {
    alert('Preencha todos os campos do investimento.');
    return;
  }

  const payload = { nome, aporteInicial, valorAtual, dataInicio };
  setLoading(true);
  try {
    if (editId) {
      await fetchJson(`/api/investments/${editId}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await fetchJson('/api/investments', { method: 'POST', body: JSON.stringify(payload) });
    }
    await loadData();
    closeModalInvestimento();
  } catch (error) {
    setStatus('Erro ao salvar investimento', 'error');
    alert(error.message);
  } finally {
    setLoading(false);
  }
}

function openModalInvestimentoUpdate(id) {
  document.getElementById('investUpdateId').value = id;
  document.getElementById('investUpdateValor').value = '';
  document.getElementById('investUpdateData').value = new Date().toISOString().split('T')[0];
  document.getElementById('modalInvestUpdateOverlay').classList.add('open');
}

function closeModalInvestimentoUpdate() {
  document.getElementById('modalInvestUpdateOverlay').classList.remove('open');
}

async function salvarInvestimentoUpdate() {
  const id = document.getElementById('investUpdateId').value;
  const valor = parseFloat(document.getElementById('investUpdateValor').value);
  const data = document.getElementById('investUpdateData').value;
  if (!id || Number.isNaN(valor) || !data) {
    alert('Preencha os campos da atualização.');
    return;
  }
  setLoading(true);
  try {
    await fetchJson(`/api/investments/${id}/history`, { method: 'POST', body: JSON.stringify({ valor, data }) });
    await loadData();
    closeModalInvestimentoUpdate();
  } catch (error) {
    setStatus('Erro ao atualizar investimento', 'error');
    alert(error.message);
  } finally {
    setLoading(false);
  }
}

async function deletarInvestimento(id) {
  if (!confirm('Excluir este investimento?')) return;
  setLoading(true);
  try {
    await fetchJson(`/api/investments/${id}`, { method: 'DELETE' });
    await loadData();
  } catch (error) {
    setStatus('Erro ao excluir investimento', 'error');
    alert(error.message);
  } finally {
    setLoading(false);
  }
}

function editarInvestimento(id) {
  const inv = state.investments.find((i) => i.id === id);
  if (!inv) return;
  openModalInvestimento(inv);
}

function openModalRecorrencia(rec = null) {
  document.getElementById('recEditId').value = rec ? rec.id : '';
  document.getElementById('recTitle').textContent = rec ? '🔁 Editar Recorrência' : '🔁 Nova Recorrência';
  document.getElementById('recDesc').value = rec ? rec.descricao : '';
  document.getElementById('recValor').value = rec ? rec.valor : '';
  document.getElementById('recDia').value = rec ? rec.dayOfMonth : '';
  document.getElementById('recInicio').value = rec ? rec.startDate : new Date().toISOString().split('T')[0];
  document.getElementById('recFim').value = rec ? rec.endDate || '' : '';
  document.getElementById('recTipo').value = rec ? rec.tipo : 'despesa';
  handleRecTipo();
  document.getElementById('recCat').value = rec ? rec.categoria : document.getElementById('recCat').value;
  document.getElementById('recMetodo').value = rec ? rec.metodoPagamento : 'debito';
  fillRecCartSelect(rec ? rec.cardId : null);
  toggleRecCartaoField();
  document.getElementById('modalRecorrenciaOverlay').classList.add('open');
}

function closeModalRecorrencia() {
  document.getElementById('modalRecorrenciaOverlay').classList.remove('open');
}

function handleRecTipo() {
  const tipo = document.getElementById('recTipo').value;
  const cats = getCategoriesByTipo(tipo);
  const catSel = document.getElementById('recCat');
  catSel.innerHTML = cats.map((c) => `<option value="${c.key}">${c.emoji} ${c.label}</option>`).join('');
}

function fillRecCartSelect(selectedId) {
  const select = document.getElementById('recCartao');
  if (!select) return;
  if (state.cards.length === 0) {
    select.innerHTML = '<option value="">Nenhum cartão cadastrado</option>';
    return;
  }
  select.innerHTML = state.cards
    .map((c) => `<option value="${c.id}">${c.nome} • ${c.bandeira} • ${c.final}</option>`)
    .join('');
  if (selectedId) select.value = String(selectedId);
}

function toggleRecCartaoField() {
  const metodo = document.getElementById('recMetodo').value;
  const group = document.getElementById('groupRecCartao');
  if (!group) return;
  group.style.display = metodo === 'credito' ? '' : 'none';
}

async function salvarRecorrencia() {
  const descricao = document.getElementById('recDesc').value.trim();
  const valor = parseFloat(document.getElementById('recValor').value);
  const dayOfMonth = parseInt(document.getElementById('recDia').value, 10);
  const startDate = document.getElementById('recInicio').value;
  const endDate = document.getElementById('recFim').value || null;
  const tipo = document.getElementById('recTipo').value;
  const categoria = document.getElementById('recCat').value;
  const metodoPagamento = document.getElementById('recMetodo').value;
  const cardId = document.getElementById('recCartao').value || null;
  const editId = document.getElementById('recEditId').value;

  if (!descricao || Number.isNaN(valor) || Number.isNaN(dayOfMonth) || !startDate) {
    alert('Preencha todos os campos da recorrência.');
    return;
  }

  const payload = { descricao, valor, dayOfMonth, startDate, endDate, tipo, categoria, metodoPagamento, cardId };
  setLoading(true);
  try {
    if (editId) {
      await fetchJson(`/api/recurring/${editId}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await fetchJson('/api/recurring', { method: 'POST', body: JSON.stringify(payload) });
    }
    await loadData();
    closeModalRecorrencia();
  } catch (error) {
    setStatus('Erro ao salvar recorrência', 'error');
    alert(error.message);
  } finally {
    setLoading(false);
  }
}

async function deletarRecorrencia(id) {
  if (!confirm('Excluir esta recorrência?')) return;
  setLoading(true);
  try {
    await fetchJson(`/api/recurring/${id}`, { method: 'DELETE' });
    await loadData();
  } catch (error) {
    setStatus('Erro ao excluir recorrência', 'error');
    alert(error.message);
  } finally {
    setLoading(false);
  }
}

function editarRecorrencia(id) {
  const rec = state.recurring.find((r) => r.id === id);
  if (!rec) return;
  openModalRecorrencia(rec);
}

function setChart(mode) {
  state.chartMode = mode;
  document.querySelectorAll('.tab').forEach((t, i) => {
    t.classList.toggle('active', (mode === 'mes' && i === 0) || (mode === 'ano' && i === 1));
  });
  renderChartReceitasDespesas();
}

function fmt(value) {
  return currencyFormatter.format(value || 0);
}

function fmtDate(d) {
  if (!d) return '';
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function escHtml(text) {
  return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
