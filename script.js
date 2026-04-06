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
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  chartMode: 'mes',
  filterText: '',
  charts: {
    receitasDespesas: null,
    categorias: null,
  },
};

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('monthSel').value = state.currentMonth;
  document.getElementById('anoLabel').textContent = state.currentYear;
  document.getElementById('inputData').value = new Date().toISOString().split('T')[0];

  document.getElementById('monthSel').addEventListener('change', changeMonth);
  document.getElementById('filterInput').addEventListener('input', handleFilter);
  document.getElementById('modalOverlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });
  document.getElementById('modalMetaOverlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModalMeta(); });
  document.getElementById('modalCardOverlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModalCard(); });
  document.getElementById('inputMetodo').addEventListener('change', toggleCartaoField);

  loadData();
});

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
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
    const [transactions, goals, cards] = await Promise.all([
      fetchJson('/api/transactions'),
      fetchJson('/api/goals'),
      fetchJson('/api/cards'),
    ]);
    state.transactions = transactions;
    state.goals = goals;
    state.cards = cards;
    setStatus('Online', 'ok');
    render();
  } catch (error) {
    setStatus('Erro ao conectar', 'error');
    console.error(error);
  } finally {
    setLoading(false);
  }
}

function changeMonth() {
  state.currentMonth = parseInt(document.getElementById('monthSel').value, 10);
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
}

function renderTabela(tbodyId, items, showStatus) {
  const tb = document.getElementById(tbodyId);
  if (items.length === 0) {
    tb.innerHTML = `<tr><td colspan="5"><div class="empty-state"><span class="empty-icon">📭</span>Nenhum lançamento neste mês.</div></td></tr>`;
    return;
  }

  tb.innerHTML = items.map((t) => {
    const catList = t.tipo === 'receita' ? CATS_RECEITA : CATS_DESPESA;
    const catObj = catList.find((c) => c.key === t.categoria) || { label: t.categoria, emoji: '📦' };
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
    const catObj = CATS_DESPESA.find((c) => c.key === key) || { label: key, emoji: '📦' };
    const pct = total > 0 ? Math.round(val / total * 100) : 0;
    const color = CAT_COLORS[key] || '#b2bec3';
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

function renderCards() {
  const grid = document.getElementById('cardsGrid');
  if (!grid) return;
  if (state.cards.length === 0) {
    grid.innerHTML = `<div class="empty-state"><span class="empty-icon">💳</span>Nenhum cartão cadastrado.</div>`;
    return;
  }

  const invoices = buildInvoicesForMonth();
  grid.innerHTML = state.cards.map((card) => {
    const invoice = invoices.find((i) => i.cardId === card.id);
    const total = invoice ? invoice.total : 0;
    const vencimento = invoice ? invoice.vencimento : `Dia ${card.vencimentoDia}`;
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
      <div class="card-chip-due">Vencimento: ${vencimento}</div>
    </div>`;
  }).join('');
}

function buildInvoicesForMonth() {
  const invoicesMap = {};
  state.transactions
    .filter((t) => t.tipo === 'despesa' && t.metodoPagamento === 'credito' && t.cardId)
    .forEach((t) => {
      const date = new Date(t.data);
      if (date.getMonth() !== state.currentMonth || date.getFullYear() !== state.currentYear) return;
      if (!invoicesMap[t.cardId]) {
        invoicesMap[t.cardId] = { cardId: t.cardId, total: 0 };
      }
      invoicesMap[t.cardId].total += t.valor;
    });

  return Object.values(invoicesMap).map((invoice) => {
    const card = state.cards.find((c) => c.id === invoice.cardId);
    if (!card) return invoice;
    return {
      ...invoice,
      vencimento: buildDueDateLabel(card.vencimentoDia),
    };
  });
}

function buildDueDateLabel(day) {
  const month = state.currentMonth + 1;
  const year = state.currentYear;
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

function openModal(tipo, item = null) {
  document.getElementById('modalTipo').value = tipo;
  document.getElementById('editId').value = item ? item.id : '';
  document.getElementById('modalTitleText').textContent = item
    ? `${tipo === 'receita' ? '💰' : '💳'} Editar ${tipo === 'receita' ? 'Receita' : 'Despesa'}`
    : `${tipo === 'receita' ? '💰' : '💳'} Nova ${tipo === 'receita' ? 'Receita' : 'Despesa'}`;

  const catSel = document.getElementById('inputCat');
  const cats = tipo === 'receita' ? CATS_RECEITA : CATS_DESPESA;
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
  document.getElementById('modalMetaOverlay').classList.add('open');
}

function closeModalMeta() {
  document.getElementById('modalMetaOverlay').classList.remove('open');
}

async function salvarMeta() {
  const nome = document.getElementById('metaNome').value.trim();
  const alvo = parseFloat(document.getElementById('metaAlvo').value);
  const atual = parseFloat(document.getElementById('metaAtual').value) || 0;
  const editId = document.getElementById('metaEditId').value;

  if (!nome || Number.isNaN(alvo) || alvo <= 0) {
    alert('Preencha todos os campos.');
    return;
  }

  const payload = { nome, alvo, atual };
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

function openModalCard(card = null) {
  document.getElementById('cardEditId').value = card ? card.id : '';
  document.getElementById('cardNome').value = card ? card.nome : '';
  document.getElementById('cardBandeira').value = card ? card.bandeira : '';
  document.getElementById('cardFinal').value = card ? card.final : '';
  document.getElementById('cardVencimento').value = card ? card.vencimentoDia : '';
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
  const editId = document.getElementById('cardEditId').value;

  if (!nome || !bandeira || !final || Number.isNaN(vencimentoDia)) {
    alert('Preencha todos os campos do cartão.');
    return;
  }

  const payload = { nome, bandeira, final, vencimentoDia };
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
