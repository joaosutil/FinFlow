const express = require('express');
const cors = require('cors');
const path = require('path');
const prisma = require('./prismaClient');
const transactionsRoutes = require('./routes/transactions');
const goalsRoutes = require('./routes/goals');
const cardsRoutes = require('./routes/cards');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/transactions', transactionsRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/cards', cardsRoutes);

app.use(express.static(path.join(__dirname, '..')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

async function seedIfNeeded() {
  const [transactionsCount, goalsCount] = await Promise.all([
    prisma.transaction.count(),
    prisma.goal.count(),
  ]);

  if (transactionsCount === 0) {
    const cards = await prisma.card.findMany();
    let cardId = cards[0]?.id;
    if (!cardId) {
      const created = await prisma.card.create({
        data: { nome: 'Cartão Titanium', bandeira: 'Visa', final: '4242', vencimentoDia: 10 },
      });
      cardId = created.id;
    }
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const base = [
      { tipo: 'receita', descricao: 'Salário', valor: 5500, data: `${year}-${month}-05`, categoria: 'salario', status: 'pago', metodoPagamento: 'transferencia' },
      { tipo: 'receita', descricao: 'Freelance Design', valor: 1200, data: `${year}-${month}-12`, categoria: 'freelance', status: 'pago', metodoPagamento: 'pix' },
      { tipo: 'despesa', descricao: 'Aluguel', valor: 1500, data: `${year}-${month}-01`, categoria: 'moradia', status: 'pago', metodoPagamento: 'transferencia' },
      { tipo: 'despesa', descricao: 'Supermercado', valor: 620, data: `${year}-${month}-08`, categoria: 'alimentacao', status: 'pago', metodoPagamento: 'credito', cardId },
      { tipo: 'despesa', descricao: 'Combustível', valor: 280, data: `${year}-${month}-10`, categoria: 'transporte', status: 'pago', metodoPagamento: 'debito' },
      { tipo: 'despesa', descricao: 'Academia + Streaming', valor: 120, data: `${year}-${month}-05`, categoria: 'servicos', status: 'pago', metodoPagamento: 'credito', cardId },
      { tipo: 'despesa', descricao: 'Consulta médica', valor: 200, data: `${year}-${month}-15`, categoria: 'saude', status: 'pendente', metodoPagamento: 'boleto' },
      { tipo: 'despesa', descricao: 'Restaurante', valor: 180, data: `${year}-${month}-18`, categoria: 'lazer', status: 'pago', metodoPagamento: 'credito', cardId },
      { tipo: 'despesa', descricao: 'Curso online', valor: 150, data: `${year}-${month}-20`, categoria: 'educacao', status: 'pago', metodoPagamento: 'credito', cardId },
      { tipo: 'despesa', descricao: 'Conta de Luz', valor: 220, data: `${year}-${month}-07`, categoria: 'moradia', status: 'pago', metodoPagamento: 'boleto' },
    ];

    await prisma.transaction.createMany({
      data: base.map((item) => ({ ...item, data: new Date(item.data) })),
    });
  }

  if (goalsCount === 0) {
    await prisma.goal.createMany({
      data: [
        { nome: 'Fundo de Emergência', alvo: 20000, atual: 8500 },
        { nome: 'Viagem nas Férias', alvo: 5000, atual: 1800 },
        { nome: 'Novo Notebook', alvo: 3500, atual: 3500 },
      ],
    });
  }
}

async function start() {
  await seedIfNeeded();
  app.listen(PORT, () => {
    console.log(`FinFlow rodando em http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error('Erro ao iniciar servidor:', error);
  process.exit(1);
});
