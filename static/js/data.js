/* ===========================
   BELEZZA — MOCK DATA
=========================== */

const DB = {

  // ---- Clientes ----
  clientes: [
    { id:1, nome:'Ana Paula Ferreira', telefone:'(11) 99234-5678', email:'ana@email.com', dataCadastro:'2024-01-10', ultimaVisita:'2025-08-28', totalGasto:1840, visitas:14, observacoes:'Alergia a acetona', avatar:'A' },
    { id:2, nome:'Beatriz Santos',     telefone:'(11) 98765-4321', email:'bea@email.com', dataCadastro:'2024-03-15', ultimaVisita:'2025-08-30', totalGasto:3200, visitas:28, observacoes:'Prefere horário manhã', avatar:'B' },
    { id:3, nome:'Carla Oliveira',     telefone:'(11) 97654-3210', email:'carla@email.com', dataCadastro:'2024-05-20', ultimaVisita:'2025-08-25', totalGasto:980, visitas:8, observacoes:'', avatar:'C' },
    { id:4, nome:'Diana Rodrigues',    telefone:'(11) 96543-2109', email:'diana@email.com', dataCadastro:'2024-07-01', ultimaVisita:'2025-07-30', totalGasto:560, visitas:5, observacoes:'', avatar:'D' },
    { id:5, nome:'Erika Mendes',       telefone:'(11) 95432-1098', email:'erika@email.com', dataCadastro:'2024-09-12', ultimaVisita:'2025-08-20', totalGasto:2100, visitas:18, observacoes:'Cliente VIP', avatar:'E' },
    { id:6, nome:'Fernanda Costa',     telefone:'(11) 94321-0987', email:'fer@email.com', dataCadastro:'2025-01-05', ultimaVisita:'2025-08-31', totalGasto:440, visitas:4, observacoes:'', avatar:'F' },
    { id:7, nome:'Gabriela Lima',      telefone:'(11) 93210-9876', email:'gabi@email.com', dataCadastro:'2025-02-18', ultimaVisita:'2025-08-29', totalGasto:1250, visitas:11, observacoes:'', avatar:'G' },
    { id:8, nome:'Helena Vieira',      telefone:'(11) 92109-8765', email:'hel@email.com', dataCadastro:'2025-04-22', ultimaVisita:'2025-08-27', totalGasto:720, visitas:6, observacoes:'Unhas quebradiças', avatar:'H' },
  ],

  // ---- Profissionais ----
  profissionais: [
    { id:1, nome:'Camila Rocha',  funcao:'Manicure & Pedicure', telefone:'(11) 91234-5678', comissao:45, atendimentosMes:62, faturamentoMes:5580, servicos:['Manicure','Pedicure','Nail art'], horario:'Seg-Sex 8h-18h', status:'ativo', avatar:'C' },
    { id:2, nome:'Larissa Dias',  funcao:'Cabeleireira',        telefone:'(11) 90987-6543', comissao:40, atendimentosMes:38, faturamentoMes:8320, servicos:['Corte','Coloração','Escova'], horario:'Ter-Sáb 9h-19h', status:'ativo', avatar:'L' },
    { id:3, nome:'Patrícia Alves',funcao:'Esteticista',         telefone:'(11) 90876-5432', comissao:50, atendimentosMes:24, faturamentoMes:4200, servicos:['Limpeza de pele','Sobrancelha','Design'], horario:'Qua-Dom 10h-18h', status:'ativo', avatar:'P' },
    { id:4, nome:'Renata Souza',  funcao:'Manicure',            telefone:'(11) 90765-4321', comissao:42, atendimentosMes:55, faturamentoMes:4950, servicos:['Manicure','Pedicure','Gel'], horario:'Seg-Sáb 9h-17h', status:'ferias', avatar:'R' },
  ],

  // ---- Serviços ----
  servicos: [
    { id:1, nome:'Manicure simples',  categoria:'Unhas',   preco:40,   duracao:45, comissao:45, emoji:'💅', ativo:true },
    { id:2, nome:'Pedicure simples',  categoria:'Unhas',   preco:50,   duracao:60, comissao:45, emoji:'🦶', ativo:true },
    { id:3, nome:'Alongamento gel',   categoria:'Unhas',   preco:150,  duracao:120,comissao:40, emoji:'✨', ativo:true },
    { id:4, nome:'Nail art (por unha)',categoria:'Unhas',  preco:10,   duracao:10, comissao:50, emoji:'🎨', ativo:true },
    { id:5, nome:'Corte feminino',    categoria:'Cabelo',  preco:80,   duracao:60, comissao:40, emoji:'✂️', ativo:true },
    { id:6, nome:'Escova progressiva',categoria:'Cabelo',  preco:220,  duracao:180,comissao:38, emoji:'💇', ativo:true },
    { id:7, nome:'Coloração',         categoria:'Cabelo',  preco:180,  duracao:120,comissao:40, emoji:'🎨', ativo:true },
    { id:8, nome:'Sobrancelha design',categoria:'Estética',preco:35,   duracao:30, comissao:50, emoji:'👁️', ativo:true },
    { id:9, nome:'Limpeza de pele',   categoria:'Estética',preco:120,  duracao:90, comissao:48, emoji:'🧖', ativo:true },
    { id:10,nome:'Depilação buço',    categoria:'Estética',preco:25,   duracao:15, comissao:50, emoji:'🌿', ativo:true },
    { id:11,nome:'Maquiagem social',  categoria:'Maquiagem',preco:120, duracao:60, comissao:45, emoji:'💄', ativo:true },
    { id:12,nome:'Maquiagem noiva',   categoria:'Maquiagem',preco:350, duracao:120,comissao:40, emoji:'👰', ativo:false },
  ],

  // ---- Produtos (estoque) ----
  produtos: [
    { id:1,  nome:'Base coat Essie',         categoria:'Unhas',     qtd:3,  minimo:5,  unidade:'un', custo:18,  preco:45 },
    { id:2,  nome:'Esmalte Risqué Rosa',     categoria:'Unhas',     qtd:12, minimo:8,  unidade:'un', custo:8,   preco:18 },
    { id:3,  nome:'Acetona 1L',              categoria:'Unhas',     qtd:2,  minimo:4,  unidade:'un', custo:12,  preco:25 },
    { id:4,  nome:'Gel UV transparente',     categoria:'Gel',       qtd:4,  minimo:3,  unidade:'un', custo:35,  preco:80 },
    { id:5,  nome:'Lâmpada UV 36W',          categoria:'Equipamento',qtd:1, minimo:2,  unidade:'un', custo:120, preco:280 },
    { id:6,  nome:'Shampoo profissional 5L', categoria:'Cabelo',    qtd:8,  minimo:3,  unidade:'un', custo:65,  preco:140 },
    { id:7,  nome:'Tinta louro claro',       categoria:'Coloração', qtd:2,  minimo:4,  unidade:'un', custo:28,  preco:65 },
    { id:8,  nome:'Hidratante facial 200ml', categoria:'Estética',  qtd:6,  minimo:3,  unidade:'un', custo:38,  preco:90 },
    { id:9,  nome:'Cera depilatória 1kg',    categoria:'Depilação', qtd:1,  minimo:3,  unidade:'un', custo:42,  preco:95 },
    { id:10, nome:'Descartável pé',          categoria:'Unhas',     qtd:80, minimo:20, unidade:'par', custo:0.5, preco:2 },
  ],

  // ---- Agendamentos ----
  agendamentos: [
    { id:1,  clienteId:1, proId:1, servicoId:1, data:'2025-09-01', hora:'08:00', duracao:45, status:'confirmado', valor:40,  obs:'' },
    { id:2,  clienteId:2, proId:2, servicoId:5, data:'2025-09-01', hora:'09:00', duracao:60, status:'confirmado', valor:80,  obs:'Quer franja' },
    { id:3,  clienteId:3, proId:3, servicoId:8, data:'2025-09-01', hora:'09:30', duracao:30, status:'confirmado', valor:35,  obs:'' },
    { id:4,  clienteId:4, proId:1, servicoId:2, data:'2025-09-01', hora:'10:00', duracao:60, status:'pendente',   valor:50,  obs:'' },
    { id:5,  clienteId:5, proId:2, servicoId:7, data:'2025-09-01', hora:'11:00', duracao:120,status:'confirmado', valor:180, obs:'Mecha highlight' },
    { id:6,  clienteId:6, proId:1, servicoId:3, data:'2025-09-01', hora:'13:00', duracao:120,status:'pendente',   valor:150, obs:'' },
    { id:7,  clienteId:7, proId:3, servicoId:9, data:'2025-09-01', hora:'14:00', duracao:90, status:'confirmado', valor:120, obs:'' },
    { id:8,  clienteId:8, proId:2, servicoId:6, data:'2025-09-01', hora:'15:30', duracao:180,status:'confirmado', valor:220, obs:'Progressiva light' },
    { id:9,  clienteId:1, proId:1, servicoId:1, data:'2025-09-02', hora:'08:30', duracao:45, status:'confirmado', valor:40,  obs:'' },
    { id:10, clienteId:2, proId:3, servicoId:8, data:'2025-09-02', hora:'10:00', duracao:30, status:'confirmado', valor:35,  obs:'' },
  ],

  // ---- Financeiro ----
  transacoes: [
    { id:1,  tipo:'entrada', descricao:'Manicure Ana Paula',    data:'2025-09-01', valor:40,  forma:'pix',     categoria:'servico' },
    { id:2,  tipo:'entrada', descricao:'Coloração Beatriz',     data:'2025-09-01', valor:180, forma:'cartao',  categoria:'servico' },
    { id:3,  tipo:'entrada', descricao:'Venda esmalte',         data:'2025-09-01', valor:18,  forma:'dinheiro',categoria:'produto' },
    { id:4,  tipo:'saida',   descricao:'Compra acetona',        data:'2025-09-01', valor:24,  forma:'pix',     categoria:'estoque' },
    { id:5,  tipo:'entrada', descricao:'Sobrancelha Carla',     data:'2025-08-31', valor:35,  forma:'pix',     categoria:'servico' },
    { id:6,  tipo:'saida',   descricao:'Conta de luz',          data:'2025-08-31', valor:280, forma:'debito',  categoria:'fixo' },
    { id:7,  tipo:'entrada', descricao:'Escova Diana',          data:'2025-08-30', valor:220, forma:'cartao',  categoria:'servico' },
    { id:8,  tipo:'saida',   descricao:'Material manicure',     data:'2025-08-30', valor:150, forma:'pix',     categoria:'estoque' },
    { id:9,  tipo:'entrada', descricao:'Gel Erika',             data:'2025-08-29', valor:150, forma:'dinheiro',categoria:'servico' },
    { id:10, tipo:'saida',   descricao:'Internet / telefone',   data:'2025-08-29', valor:120, forma:'debito',  categoria:'fixo' },
  ],

  // ---- Faturamento mensal (para gráfico) ----
  faturamentoMensal: [
    { mes:'Abr', valor:9200 },
    { mes:'Mai', valor:11400 },
    { mes:'Jun', valor:10800 },
    { mes:'Jul', valor:13200 },
    { mes:'Ago', valor:15600 },
    { mes:'Set', valor:3400 },
  ],

  // ---- Atendimentos realizados ----
  atendimentos: [
    { id:1, agendamentoId:1, clienteId:1, proId:1, servicoId:1, data:'2025-08-28', valor:40, desconto:0, produtos:[], status:'finalizado', formaPgto:'pix' },
    { id:2, agendamentoId:5, clienteId:5, proId:2, servicoId:7, data:'2025-08-29', valor:180, desconto:0, produtos:[], status:'finalizado', formaPgto:'cartao' },
  ],
};

// Helpers
function getCliente(id) { return DB.clientes.find(c => c.id === id); }
function getProfissional(id) { return DB.profissionais.find(p => p.id === id); }
function getServico(id) { return DB.servicos.find(s => s.id === id); }
function getProduto(id) { return DB.produtos.find(p => p.id === id); }

function formatCurrency(v) {
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}
function formatDate(str) {
  const [y,m,d] = str.split('-');
  return `${d}/${m}/${y}`;
}
function today() {
  return new Date().toISOString().slice(0,10);
}
function generateId(arr) {
  return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1;
}

// Low stock
function getLowStock() {
  return DB.produtos.filter(p => p.qtd <= p.minimo);
}

// Today's appointments
function getTodaySchedule() {
  const t = today();
  return DB.agendamentos
    .filter(a => a.data === t)
    .sort((a,b) => a.hora.localeCompare(b.hora));
}
