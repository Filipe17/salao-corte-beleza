/* ===========================
   BELEZZA — API BRIDGE
   Integração com backend Railway
   Inclua este arquivo no HTML
   ANTES de data.js, pages.js e app.js
=========================== */

// Detecta a URL base automaticamente:
// — Em produção (Railway): mesma origem do frontend
// — Em desenvolvimento local: mantém localhost:5000
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

// ── Carrega todos os dados do backend para o DB ───────────
async function loadAllFromAPI() {
  try {
    const [clientes, profissionais, servicos, produtos, agendamentos, transacoes, dashboard] =
      await Promise.all([
        apiFetch('/api/clientes'),
        apiFetch('/api/profissionais'),
        apiFetch('/api/servicos'),
        apiFetch('/api/produtos'),
        apiFetch('/api/agendamentos'),
        apiFetch('/api/transacoes'),
        apiFetch('/api/dashboard'),
      ]);

    DB.clientes       = clientes;
    DB.profissionais  = profissionais;
    DB.servicos       = servicos;
    DB.produtos       = produtos;
    DB.agendamentos   = agendamentos;
    DB.transacoes     = transacoes;

    // Atualiza faturamento mensal do dashboard se vier da API
    if (dashboard.faturamentoMes !== undefined) {
      // Mantém o array de gráfico mockado (API não tem endpoint de série histórica)
      // mas atualiza o último mês com o valor real
      const ultimoMes = DB.faturamentoMensal[DB.faturamentoMensal.length - 1];
      if (ultimoMes) ultimoMes.valor = dashboard.faturamentoMes;
    }

    console.log('✅ Dados carregados do banco:', {
      clientes: clientes.length,
      profissionais: profissionais.length,
      servicos: servicos.length,
      produtos: produtos.length,
      agendamentos: agendamentos.length,
      transacoes: transacoes.length,
    });
  } catch (e) {
    console.warn('⚠️ Falha ao carregar dados da API, usando dados locais:', e.message);
    // Se a API falhar, o DB já tem os dados mockados do data.js — sistema continua
  }
}

// ── Recarrega dados e re-renderiza a página atual ─────────
async function reloadAndNavigate(page) {
  await loadAllFromAPI();
  navigate(page);
}

// ════════════════════════════════════════════════════════
// SOBRESCREVE AS FUNÇÕES DE ESCRITA DO pages.js
// Cada função abaixo chama a API e depois recarrega
// ════════════════════════════════════════════════════════

// ── CLIENTES ──────────────────────────────────────────────
async function saveCliente() {
  const nome = document.getElementById('nc_nome').value.trim();
  if (!nome) { showToast('Informe o nome do cliente', 'error'); return; }
  try {
    await apiFetch('/api/clientes', {
      method: 'POST',
      body: JSON.stringify({
        nome,
        telefone: document.getElementById('nc_tel').value,
        email:    document.getElementById('nc_email').value,
        observacoes: document.getElementById('nc_obs').value,
      }),
    });
    closeModal();
    showToast('Cliente cadastrado!', 'success');
    await reloadAndNavigate('clientes');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ── AGENDAMENTOS ──────────────────────────────────────────
async function saveNewAppointment() {
  const cliId   = parseInt(document.getElementById('na_cli').value);
  const proId   = parseInt(document.getElementById('na_pro').value);
  const servId  = parseInt(document.getElementById('na_serv').value);
  const data    = document.getElementById('na_data').value;
  const hora    = document.getElementById('na_hora').value;
  const horaFim = document.getElementById('na_hora_fim')?.value || '';
  const obs     = document.getElementById('na_obs').value;

  if (!cliId || !proId || !servId || !data || !hora) {
    showToast('Preencha todos os campos obrigatórios', 'error');
    return;
  }

  // Calcular duração pela diferença início/fim
  let duracao = 60;
  if (hora && horaFim) {
    const [h1, m1] = hora.split(':').map(Number);
    const [h2, m2] = horaFim.split(':').map(Number);
    const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diff > 0) duracao = diff;
  }

  try {
    await apiFetch('/api/agendamentos', {
      method: 'POST',
      body: JSON.stringify({ clienteId:cliId, proId, servicoId:servId, data, hora, hora_fim:horaFim, duracao, obs }),
    });
    closeModal();
    showToast('Agendamento criado com sucesso!', 'success');
    await reloadAndNavigate('agenda');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function finalizeAppointment(id) {
  try {
    await apiFetch(`/api/agendamentos/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'finalizado', formaPgto: 'dinheiro' }),
    });
    closeModal();
    showToast('Atendimento finalizado!', 'success');
    await reloadAndNavigate('agenda');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function cancelAppointment(id) {
  closeModal();
  confirmDialog('Deseja cancelar este agendamento?', async () => {
    try {
      await apiFetch(`/api/agendamentos/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelado' }),
      });
      showToast('Agendamento cancelado', 'warning');
      await reloadAndNavigate('agenda');
    } catch (e) {
      showToast(e.message, 'error');
    }
  });
}

// ── SERVIÇOS ──────────────────────────────────────────────
async function saveServico() {
  const nome = document.getElementById('ns_nome').value;
  if (!nome) { showToast('Informe o nome', 'error'); return; }
  try {
    await apiFetch('/api/servicos', {
      method: 'POST',
      body: JSON.stringify({
        nome,
        categoria: document.getElementById('ns_cat').value,
        preco:     parseFloat(document.getElementById('ns_preco').value) || 0,
        duracao:   parseInt(document.getElementById('ns_dur').value) || 60,
        comissao:  parseInt(document.getElementById('ns_com').value) || 40,
        emoji:     document.getElementById('ns_emoji').value || '💅',
      }),
    });
    closeModal();
    showToast('Serviço cadastrado!', 'success');
    await reloadAndNavigate('servicos');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function toggleServico(id) {
  const s = DB.servicos.find(x => x.id === id);
  if (!s) return;
  try {
    await apiFetch(`/api/servicos/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ativo: !s.ativo }),
    });
    await reloadAndNavigate('servicos');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ── ESTOQUE ───────────────────────────────────────────────
async function saveEntrada(id) {
  const qty = parseInt(document.getElementById('es_qty').value) || 0;
  try {
    await apiFetch(`/api/produtos/${id}/entrada`, {
      method: 'POST',
      body: JSON.stringify({ qtd: qty }),
    });
    closeModal();
    showToast(`+${qty} unidades adicionadas!`, 'success');
    await reloadAndNavigate('estoque');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ── FINANCEIRO ────────────────────────────────────────────
async function saveTransacao(tipo) {
  const desc = document.getElementById('nt_desc').value;
  const val  = parseFloat(document.getElementById('nt_val').value) || 0;
  if (!desc || !val) { showToast('Preencha todos os campos', 'error'); return; }
  try {
    await apiFetch('/api/transacoes', {
      method: 'POST',
      body: JSON.stringify({
        tipo,
        descricao: desc,
        valor:     val,
        forma:     document.getElementById('nt_forma').value,
        categoria: 'manual',
      }),
    });
    closeModal();
    showToast(`${tipo === 'entrada' ? 'Entrada' : 'Saída'} lançada!`, 'success');
    await reloadAndNavigate('financeiro');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ── PDV — checkout ────────────────────────────────────────
async function checkoutPDV() {
  if (!cart.length) { showToast('Carrinho vazio', 'error'); return; }
  const total = cart.reduce((s, i) => s + i.preco * i.qty, 0);
  try {
    await apiFetch('/api/transacoes', {
      method: 'POST',
      body: JSON.stringify({
        tipo:      'entrada',
        descricao: `Venda PDV (${cart.map(i => i.nome).join(', ')})`,
        data:      today(),
        valor:     total,
        forma:     selectedPayment,
        categoria: 'venda',
      }),
    });
    cart = [];
    showToast(`Venda finalizada! ${formatCurrency(total)} — ${selectedPayment.toUpperCase()}`, 'success');
    await reloadAndNavigate('pdv');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ── Init: carrega dados antes de renderizar ───────────────
// Substitui o navigate inicial do app.js
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadAllFromAPI();
  } catch(e) {
    console.warn('Falha ao carregar API, usando dados locais:', e);
  }
  navigate('dashboard');
});
