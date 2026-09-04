/* ===========================
   BELEZZA — PDV DEDICADO
   pdv.js
=========================== */

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : window.location.origin;

async function apiFetch(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.erro || `Erro ${res.status}`);
  }
  return res.json();
}

// ── Estado global ─────────────────────────────────────────
let DB = { servicos: [], produtos: [], clientes: [], profissionais: [], transacoes: [], agendamentos: [] };
let cart        = [];
let cartIdCtr   = 0;
let tabAtual    = 'servicos';
let catAtual    = 'Todos';
let caixaTab    = 'caixa';
let clienteSel  = null;
let pgtoSel     = 'dinheiro';
let vendaNum    = 1;
let obsAberta   = false;

function today() { return new Date().toISOString().slice(0, 10); }
function fmt(v)  { return 'R$ ' + parseFloat(v||0).toFixed(2).replace('.', ','); }
function ini(nome) { return (nome||'?')[0].toUpperCase(); }

// ── Carrega dados da API ──────────────────────────────────
async function loadAll() {
  try {
    const [servicos, produtos, clientes, profissionais, transacoes, agendamentos] = await Promise.all([
      apiFetch('/api/servicos'),
      apiFetch('/api/produtos'),
      apiFetch('/api/clientes'),
      apiFetch('/api/profissionais'),
      apiFetch('/api/transacoes'),
      apiFetch('/api/agendamentos'),
    ]);
    DB.servicos       = servicos;
    DB.produtos       = produtos;
    DB.clientes       = clientes;
    DB.profissionais  = profissionais;
    DB.transacoes     = transacoes;
    DB.agendamentos   = agendamentos;
  } catch(e) {
    toast('Erro ao carregar dados da API', 'error');
  }
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadAll();
  carregarUsuario();
  atualizarVendaNum();
  pdvRender();
  renderClientesFreq();
  renderPgtoGrid();
  renderResumoDia();
});

function carregarUsuario() {
  try {
    const u = JSON.parse(sessionStorage.getItem('belezza_user') || '{}');
    if (u.nome) {
      document.getElementById('pdvUserName').textContent = u.nome;
      document.getElementById('pdvUserRole').textContent = u.email || u.role || '';
      const av = document.getElementById('pdvAvatar');
      if (u.foto) {
        av.innerHTML = `<img src="${u.foto}" />`;
      } else {
        av.textContent = ini(u.nome);
      }
    }
  } catch(e) {}
}

function atualizarVendaNum() {
  const num = String(vendaNum).padStart(6, '0');
  document.getElementById('pdvVendaNum').textContent  = `Venda #PDV-${num}`;
  document.getElementById('pdvVendaBadge').textContent = `Venda #PDV-${num}`;
}

// ── Tabs ──────────────────────────────────────────────────
function setTab(tab) {
  tabAtual = tab;
  catAtual = 'Todos';
  document.getElementById('tabServicos').classList.toggle('active', tab === 'servicos');
  document.getElementById('tabProdutos').classList.toggle('active', tab === 'produtos');
  pdvRender();
}

function setCaixaTab(tab) {
  caixaTab = tab;
  document.getElementById('tabCaixa').classList.toggle('active', tab === 'caixa');
  document.getElementById('tabComanda').classList.toggle('active', tab === 'comanda');
}

// ── Render principal ──────────────────────────────────────
function pdvRender() {
  const search = (document.getElementById('pdvSearch')?.value || '').toLowerCase();

  const itens = tabAtual === 'servicos'
    ? DB.servicos.filter(s => s.ativo)
    : DB.produtos;

  // Categorias
  const cats = ['Todos', ...new Set(itens.map(i => i.categoria).filter(Boolean))];
  const catsEl = document.getElementById('pdvCats');
  catsEl.innerHTML = cats.map(c => `
    <button class="pdv-cat-btn ${catAtual === c ? 'active' : ''}" onclick="setCategoria('${c}')">${c}</button>
  `).join('');

  // Filtro
  const filtrado = itens.filter(i => {
    const matchCat  = catAtual === 'Todos' || i.categoria === catAtual;
    const matchBusc = !search || i.nome.toLowerCase().includes(search) || (i.categoria||'').toLowerCase().includes(search);
    return matchCat && matchBusc;
  });

  const grid = document.getElementById('pdvGrid');
  if (!filtrado.length) {
    grid.innerHTML = '<div class="pdv-loading">Nenhum item encontrado</div>';
    return;
  }
  grid.innerHTML = filtrado.map(i => `
    <div class="pdv-card" onclick="addToCart(${i.id}, '${escapar(i.nome)}', ${i.preco}, '${i.emoji||'📦'}', ${i.duracao||0})">
      <div class="pdv-card-img">${i.emoji || '📦'}</div>
      <div class="pdv-card-nome">${i.nome}</div>
      ${i.duracao ? `<div class="pdv-card-dur">${i.duracao} min</div>` : ''}
      <div class="pdv-card-preco">${fmt(i.preco)}</div>
      <button class="pdv-card-add" onclick="event.stopPropagation();addToCart(${i.id},'${escapar(i.nome)}',${i.preco},'${i.emoji||'📦'}',${i.duracao||0})">+</button>
    </div>
  `).join('');
}

function setCategoria(cat) {
  catAtual = cat;
  pdvRender();
}

function escapar(s) { return (s||'').replace(/'/g, "\\'"); }

// ── Clientes frequentes ───────────────────────────────────
function renderClientesFreq() {
  const top = DB.clientes.slice(0, 6);
  document.getElementById('pdvClientesList').innerHTML = top.map(c => `
    <div class="pdv-cliente-chip" onclick="selecionarCliente(${c.id})">
      <div class="pdv-cliente-chip-av">${ini(c.nome)}</div>
      <span>${c.nome.split(' ')[0]}</span>
    </div>
  `).join('') || '<span style="font-size:.8rem;color:var(--gray-400)">Nenhum cliente cadastrado</span>';
}

// ── Seleção de cliente ────────────────────────────────────
function selecionarCliente(id) {
  clienteSel = DB.clientes.find(c => c.id === id) || null;
  atualizarClienteUI();
  fecharModalCliente();
}

function atualizarClienteUI() {
  const av   = document.getElementById('pdvClienteAvatar');
  const nome = document.getElementById('pdvClienteNome');
  const tel  = document.getElementById('pdvClienteTel');
  const wa   = document.getElementById('pdvBtnWhats');
  if (clienteSel) {
    av.innerHTML   = `<div class="pdv-cliente-chip-av" style="width:36px;height:36px;font-size:.85rem">${ini(clienteSel.nome)}</div>`;
    nome.textContent = clienteSel.nome;
    tel.textContent  = clienteSel.telefone || '';
    if (clienteSel.telefone) {
      wa.style.display = 'flex';
      wa.onclick = () => {
        const num = clienteSel.telefone.replace(/\D/g, '');
        window.open(`https://wa.me/55${num}`, '_blank');
      };
    } else { wa.style.display = 'none'; }
  } else {
    av.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    nome.textContent = 'Nenhum cliente selecionado';
    tel.textContent  = '';
    wa.style.display = 'none';
  }
}

// ── Modal cliente ─────────────────────────────────────────
function abrirModalCliente() {
  document.getElementById('modalClienteOverlay').classList.add('open');
  document.getElementById('modalClienteSearch').value = '';
  renderModalClientes();
  setTimeout(() => document.getElementById('modalClienteSearch').focus(), 100);
}
function fecharModalCliente() {
  document.getElementById('modalClienteOverlay').classList.remove('open');
}
function renderModalClientes() {
  const q = document.getElementById('modalClienteSearch').value.toLowerCase();
  const lista = DB.clientes.filter(c =>
    !q || c.nome.toLowerCase().includes(q) || (c.telefone||'').includes(q)
  );
  document.getElementById('modalClienteList').innerHTML = lista.map(c => `
    <div class="pdv-modal-cli" onclick="selecionarCliente(${c.id})">
      <div class="pdv-modal-cli-av">${ini(c.nome)}</div>
      <div class="pdv-modal-cli-info">
        <strong>${c.nome}</strong>
        <small>${c.telefone || ''}</small>
      </div>
    </div>
  `).join('') || '<div style="padding:16px;text-align:center;color:var(--gray-400);font-size:.875rem">Nenhum cliente encontrado</div>';
}

// ── Carrinho ──────────────────────────────────────────────
function addToCart(id, nome, preco, emoji, duracao) {
  const existing = cart.find(i => i.id === id);
  if (existing) { existing.qty++; }
  else { cart.push({ id, tmpId: ++cartIdCtr, nome, preco, emoji, duracao, qty: 1, proId: null }); }
  renderCart();
  atualizarTotais();
  toast(`${nome} adicionado`, 'success');
}

function changeQty(tmpId, delta) {
  const item = cart.find(i => i.tmpId === tmpId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(i => i.tmpId !== tmpId);
  renderCart();
  atualizarTotais();
}

function removerItem(tmpId) {
  cart = cart.filter(i => i.tmpId !== tmpId);
  renderCart();
  atualizarTotais();
}

function setProItem(tmpId, proId) {
  const item = cart.find(i => i.tmpId === tmpId);
  if (item) item.proId = proId ? parseInt(proId) : null;
}

function renderCart() {
  const el = document.getElementById('pdvCartItems');
  if (!cart.length) {
    el.innerHTML = `
      <div class="pdv-cart-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
        <p>Carrinho vazio</p>
        <small>Adicione serviços ou produtos</small>
      </div>`;
    return;
  }
  const proOptions = DB.profissionais.filter(p => p.status !== 'inativo')
    .map(p => `<option value="${p.id}">${p.nome.split(' ')[0]}</option>`).join('');

  el.innerHTML = cart.map(item => `
    <div class="pdv-cart-item">
      <div>
        <div class="pdv-cart-item-nome">${item.emoji} ${item.nome}</div>
        ${item.duracao ? `<div class="pdv-cart-item-dur">${item.duracao} min</div>` : ''}
      </div>
      <select class="pdv-cart-pro-sel" onchange="setProItem(${item.tmpId}, this.value)">
        <option value="">Profissional</option>
        ${proOptions}
      </select>
      <div class="pdv-cart-qty">
        <button class="pdv-qty-btn" onclick="changeQty(${item.tmpId}, -1)">−</button>
        <span style="min-width:16px;text-align:center;font-size:.8rem">${item.qty}</span>
        <button class="pdv-qty-btn" onclick="changeQty(${item.tmpId}, 1)">+</button>
      </div>
      <div class="pdv-cart-unit">${fmt(item.preco)}</div>
      <div class="pdv-cart-total">${fmt(item.preco * item.qty)}</div>
      <button class="pdv-cart-del" onclick="removerItem(${item.tmpId})">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
      </button>
    </div>
  `).join('');
}

function atualizarTotais() {
  const subtotal  = cart.reduce((s, i) => s + i.preco * i.qty, 0);
  const desconto  = parseFloat(document.getElementById('pdvDesconto')?.value  || 0);
  const acrescimo = parseFloat(document.getElementById('pdvAcrescimo')?.value || 0);
  const total     = Math.max(subtotal - desconto + acrescimo, 0);

  document.getElementById('pdvSubtotal').textContent = fmt(subtotal);
  document.getElementById('pdvTotal').textContent    = fmt(total);
  calcTroco();
}

function calcTroco() {
  const desconto  = parseFloat(document.getElementById('pdvDesconto')?.value  || 0);
  const acrescimo = parseFloat(document.getElementById('pdvAcrescimo')?.value || 0);
  const subtotal  = cart.reduce((s, i) => s + i.preco * i.qty, 0);
  const total     = Math.max(subtotal - desconto + acrescimo, 0);
  const recebido  = parseFloat(document.getElementById('pdvValorRecebido')?.value || 0);
  const troco     = Math.max(recebido - total, 0);
  const trocoEl   = document.getElementById('pdvTroco');
  if (trocoEl) trocoEl.textContent = fmt(troco);
}

// ── Formas de pagamento ───────────────────────────────────
const PGTOS = [
  { key: 'dinheiro', label: 'Dinheiro', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>' },
  { key: 'cartao',   label: 'Cartão',   icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>' },
  { key: 'pix',      label: 'PIX',      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M17 7L7 17M7 7h10v10"/></svg>' },
  { key: 'outros',   label: 'Outros',   icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' },
];

function renderPgtoGrid() {
  document.getElementById('pdvPgtoGrid').innerHTML = PGTOS.map(p => `
    <button class="pdv-pgto-btn ${pgtoSel === p.key ? 'active' : ''}" onclick="selecionarPgto('${p.key}')">
      ${p.icon} ${p.label}
    </button>
  `).join('');
}

function selecionarPgto(key) {
  pgtoSel = key;
  renderPgtoGrid();
}

// ── Observação ────────────────────────────────────────────
function toggleObs() {
  obsAberta = !obsAberta;
  document.getElementById('pdvObs').style.display = obsAberta ? 'block' : 'none';
}

// ── Nova venda ────────────────────────────────────────────
function novaVenda() {
  cart       = [];
  clienteSel = null;
  pgtoSel    = 'dinheiro';
  vendaNum++;
  document.getElementById('pdvDesconto').value  = 0;
  document.getElementById('pdvAcrescimo').value = 0;
  if (document.getElementById('pdvValorRecebido'))
    document.getElementById('pdvValorRecebido').value = '';
  atualizarVendaNum();
  atualizarClienteUI();
  renderCart();
  atualizarTotais();
  renderPgtoGrid();
  toast('Nova venda iniciada', 'success');
}

function cancelarVenda() {
  if (!cart.length) return;
  if (confirm('Cancelar a venda atual? Os itens serão removidos.')) novaVenda();
}

// ── Finalizar venda ───────────────────────────────────────
async function finalizarVenda() {
  if (!cart.length) { toast('Carrinho vazio', 'error'); return; }

  const desconto  = parseFloat(document.getElementById('pdvDesconto').value  || 0);
  const acrescimo = parseFloat(document.getElementById('pdvAcrescimo').value || 0);
  const subtotal  = cart.reduce((s, i) => s + i.preco * i.qty, 0);
  const total     = Math.max(subtotal - desconto + acrescimo, 0);
  const obs       = document.getElementById('pdvObs').value || '';

  const btn = document.querySelector('.pdv-btn-finalizar');
  btn.disabled = true;
  btn.textContent = 'Salvando...';

  try {
    // Registra transação financeira
    await apiFetch('/api/transacoes', {
      method: 'POST',
      body: JSON.stringify({
        tipo:      'entrada',
        descricao: `Venda PDV (${cart.map(i => i.nome).join(', ')})${clienteSel ? ' — ' + clienteSel.nome : ''}`,
        data:      today(),
        valor:     total,
        forma:     pgtoSel,
        categoria: 'venda',
      }),
    });

    // Cria agendamento/atendimento para cada item de serviço com profissional
    for (const item of cart) {
      if (item.proId && clienteSel) {
        const serv = DB.servicos.find(s => s.id === item.id);
        if (serv) {
          await apiFetch('/api/agendamentos', {
            method: 'POST',
            body: JSON.stringify({
              clienteId: clienteSel.id,
              proId:     item.proId,
              servicoId: serv.id,
              data:      today(),
              hora:      new Date().toTimeString().slice(0, 5),
              duracao:   serv.duracao || 60,
              valor:     serv.preco * item.qty,
              status:    'finalizado',
              obs,
            }),
          });
        }
      }
    }

    toast(`Venda finalizada! ${fmt(total)} via ${pgtoSel.toUpperCase()}`, 'success');
    novaVenda();
    await loadAll();
    renderResumoDia();
  } catch(e) {
    toast(e.message || 'Erro ao finalizar venda', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Finalizar Venda`;
  }
}

// ── Resumo do dia ─────────────────────────────────────────
function renderResumoDia() {
  const hoje = today();
  const d = new Date();
  const diasSemana = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  document.getElementById('pdvResumoData').textContent =
    `${diasSemana[d.getDay()]}, ${d.toLocaleDateString('pt-BR')}`;

  const transHoje = DB.transacoes.filter(t => t.data === hoje && t.tipo === 'entrada');
  const vendas    = transHoje.reduce((s, t) => s + t.valor, 0);
  const atend     = DB.agendamentos.filter(a => a.data === hoje && a.status === 'finalizado').length;
  const ticket    = atend > 0 ? vendas / atend : 0;

  document.getElementById('pdvResumoVendas').textContent  = fmt(vendas);
  document.getElementById('pdvResumoAtend').textContent   = atend;
  document.getElementById('pdvResumoTicket').textContent  = fmt(ticket);
}

// ── Toast ─────────────────────────────────────────────────
function toast(msg, tipo = 'success') {
  const el = document.getElementById('pdvToast');
  el.textContent = msg;
  el.className   = `pdv-toast ${tipo} show`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3000);
}
