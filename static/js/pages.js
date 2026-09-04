/* ===========================
   BELEZZA — PAGE RENDERERS
=========================== */

/* ===================== DASHBOARD ===================== */
let agendaView = 'day';
let agendaDate = new Date();

// ── Usuário logado e permissões da agenda ────────────────
function getUsuarioLogado() {
  try { return JSON.parse(sessionStorage.getItem('belezza_user') || '{}'); } catch(e) { return {}; }
}
function podeEditarAgenda(proId) {
  const u = getUsuarioLogado();
  if (!u.role) return true; // sem login = dev mode
  if (['administrador','gerente','recepcionista'].includes(u.role)) return true;
  // Profissional só edita a própria coluna
  // Compara pelo nome do usuário com o nome do profissional
  const pro = DB.profissionais.find(p => p.id === proId);
  return pro && u.nome && pro.nome.toLowerCase().includes(u.nome.split(' ')[0].toLowerCase());
}
function isAdmin() {
  const u = getUsuarioLogado();
  return !u.role || ['administrador','gerente'].includes(u.role);
}


// ── Atualizar painel de hoje na sidebar ──────────────────
function atualizarSidebarHoje() {
  const hoje = new Date().toISOString().slice(0,10);
  const ags  = (DB.agendamentos || []).filter(a => a.data === hoje);
  const set  = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  set('hojeAgendados',  ags.filter(a => ['confirmado','pendente'].includes(a.status)).length);
  set('hojeAndamento',  ags.filter(a => a.status === 'emandamento').length);
  set('hojeConcluidos', ags.filter(a => a.status === 'finalizado').length);
  set('hojeCancelados', ags.filter(a => a.status === 'cancelado').length);
}

// ══════════════════════════════════════════════════════════
// FORMULÁRIO UNIFICADO DE AGENDAMENTO / ATENDIMENTO
// ══════════════════════════════════════════════════════════

let _naServicos = []; // lista de serviços adicionados
let _naModo     = 'agenda'; // 'agenda' | 'atendimento'

function openNewAppointment(modo = 'agenda', horaInicial = null) {
  _naModo     = modo;
  _naServicos = [];

  const titulo    = modo === 'agenda' ? 'Novo Agendamento' : 'Novo Atendimento';
  const btnLabel  = modo === 'agenda' ? '💾 Salvar Agendamento' : '▶ Iniciar Atendimento';
  const statusOpts = modo === 'agenda'
    ? '<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="na_status" value="confirmado" checked /> Agendado</label><label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="na_status" value="confirmado2" /> Confirmado</label>'
    : '';

  const cliOptions = DB.clientes.map(c => `<option value="${c.id}">${c.nome} — ${c.telefone||''}</option>`).join('');
  const proOptions = DB.profissionais.filter(p=>p.ativo!==false).map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
  const servOptions = DB.servicos.filter(s=>s.ativo).map(s => `<option value="${s.id}" data-preco="${s.preco}" data-dur="${s.duracao}">${s.nome} — ${formatCurrency(s.preco)}</option>`).join('');

  openModal({
    title: titulo,
    size: 'lg',
    body: `
      <div class="grid grid-2" style="gap:12px">
        <div class="form-group">
          <label class="form-label">Cliente <span style="color:var(--danger)">*</span></label>
          <div class="search-input">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <select class="form-control" id="na_cli" style="padding-left:36px">
              <option value="">Buscar cliente...</option>${cliOptions}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Profissional <span style="color:var(--danger)">*</span></label>
          <select class="form-control" id="na_pro"><option value="">Selecionar...</option>${proOptions}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Data <span style="color:var(--danger)">*</span></label>
          <input type="date" class="form-control" id="na_data" value="${today()}" />
        </div>
        <div class="form-group">
          <label class="form-label">Horário <span style="color:var(--danger)">*</span></label>
          <input type="time" class="form-control" id="na_hora" value="${horaInicial||'09:00'}" />
        </div>
      </div>

      <!-- Serviços -->
      <div style="margin-top:4px">
        <label class="form-label">Serviços <span style="color:var(--danger)">*</span></label>
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <select class="form-control" id="na_serv_sel" style="flex:1">
            <option value="">Selecionar serviço...</option>${servOptions}
          </select>
          <button class="btn btn-outline" onclick="naAdicionarServico()" type="button" style="white-space:nowrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Adicionar
          </button>
        </div>
        <div id="na_servicos_lista" style="display:flex;flex-direction:column;gap:6px;min-height:40px"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--gray-100);padding-top:10px;margin-top:8px">
          <div style="font-size:0.82rem;color:var(--gray-500)">Duração total: <strong id="na_duracao_total">0 min</strong></div>
          <div style="font-size:0.95rem;font-weight:700;color:var(--primary)">Total: <span id="na_total">R$ 0,00</span></div>
        </div>
      </div>

      <div class="form-group" style="margin-top:12px">
        <label class="form-label">Observações</label>
        <textarea class="form-control" id="na_obs" rows="2" placeholder="Alguma observação sobre o atendimento..."></textarea>
      </div>

      ${statusOpts ? `<div style="display:flex;gap:20px;margin-top:8px;font-size:0.875rem">${statusOpts}</div>` : ''}
    `,
    footer: `
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="naSalvar()">${btnLabel}</button>
    `
  });

  // Atualizar total ao trocar serviço
  setTimeout(() => {
    document.getElementById('na_serv_sel')?.addEventListener('change', naAtualizarTotal);
  }, 100);
}

function naAdicionarServico() {
  const sel   = document.getElementById('na_serv_sel');
  const id    = parseInt(sel.value);
  const opt   = sel.options[sel.selectedIndex];
  if (!id) { showToast('Selecione um serviço', 'error'); return; }
  if (_naServicos.find(s => s.id === id)) { showToast('Serviço já adicionado', 'error'); return; }

  const preco = parseFloat(opt.dataset.preco) || 0;
  const dur   = parseInt(opt.dataset.dur) || 30;
  const nome  = opt.text.split(' — ')[0];

  _naServicos.push({ id, nome, preco, duracao: dur });
  sel.value = '';
  naRenderServicos();
}

function naRemoverServico(id) {
  _naServicos = _naServicos.filter(s => s.id !== id);
  naRenderServicos();
}

function naRenderServicos() {
  const lista = document.getElementById('na_servicos_lista');
  if (!lista) return;
  if (_naServicos.length === 0) {
    lista.innerHTML = '<div style="text-align:center;color:var(--gray-400);font-size:0.82rem;padding:8px">Nenhum serviço adicionado</div>';
  } else {
    lista.innerHTML = _naServicos.map(s => `
      <div style="display:flex;align-items:center;gap:10px;background:var(--gray-50);border-radius:8px;padding:8px 12px">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
        <span style="flex:1;font-size:0.875rem;font-weight:500">${s.nome}</span>
        <span style="font-size:0.8rem;color:var(--gray-500)">${s.duracao} min</span>
        <span style="font-size:0.875rem;font-weight:600;color:var(--primary);min-width:70px;text-align:right">${formatCurrency(s.preco)}</span>
        <button onclick="naRemoverServico(${s.id})" style="background:none;border:none;cursor:pointer;color:var(--gray-400);padding:2px" title="Remover">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>`).join('');
  }
  naAtualizarTotal();
}

function naAtualizarTotal() {
  const total   = _naServicos.reduce((s,x) => s+x.preco, 0);
  const duracao = _naServicos.reduce((s,x) => s+x.duracao, 0);
  const totalEl = document.getElementById('na_total');
  const durEl   = document.getElementById('na_duracao_total');
  if (totalEl) totalEl.textContent = formatCurrency(total);
  if (durEl)   durEl.textContent   = duracao + ' min';

  // Calcular hora de fim automaticamente
  const horaEl = document.getElementById('na_hora');
  if (horaEl && horaEl.value && duracao > 0) {
    const [h, m] = horaEl.value.split(':').map(Number);
    const fim = h * 60 + m + duracao;
    // só para referência visual — não temos campo hora_fim no novo modal
  }
}

async function naSalvar() {
  const cliId  = parseInt(document.getElementById('na_cli')?.value);
  const proId  = parseInt(document.getElementById('na_pro')?.value);
  const data   = document.getElementById('na_data')?.value;
  const hora   = document.getElementById('na_hora')?.value;
  const obs    = document.getElementById('na_obs')?.value || '';

  if (!cliId) { showToast('Selecione o cliente', 'error'); return; }
  if (!proId) { showToast('Selecione o profissional', 'error'); return; }
  if (!data)  { showToast('Informe a data', 'error'); return; }
  if (!hora)  { showToast('Informe o horário', 'error'); return; }
  if (_naServicos.length === 0) { showToast('Adicione pelo menos um serviço', 'error'); return; }

  const durTotal  = _naServicos.reduce((s,x) => s+x.duracao, 0);
  const valorTotal= _naServicos.reduce((s,x) => s+x.preco, 0);
  const [h, m]    = hora.split(':').map(Number);
  const fimMin    = h * 60 + m + durTotal;
  const horaFim   = `${String(Math.floor(fimMin/60)%24).padStart(2,'0')}:${String(fimMin%60).padStart(2,'0')}`;
  const status    = _naModo === 'atendimento' ? 'emandamento' : 'confirmado';

  // Usar o primeiro serviço como principal (sistema atual só tem 1 por agendamento)
  const servPrincipal = _naServicos[0];

  try {
    if (typeof apiFetch === 'function') {
      await apiFetch('/api/agendamentos', {
        method: 'POST',
        body: JSON.stringify({
          clienteId: cliId, proId, servicoId: servPrincipal.id,
          data, hora, hora_fim: horaFim, duracao: durTotal,
          valor: valorTotal, status, obs,
        }),
      });
    } else {
      // Modo local (sem API)
      DB.agendamentos.push({
        id: generateId(DB.agendamentos),
        clienteId: cliId, proId, servicoId: servPrincipal.id,
        data, hora, hora_fim: horaFim, duracao: durTotal,
        valor: valorTotal, status, obs,
      });
    }
    closeModal();
    const msg = _naModo === 'atendimento' ? 'Atendimento iniciado!' : 'Agendamento criado!';
    showToast(msg, 'success');
    if (typeof atualizarSidebarHoje === 'function') atualizarSidebarHoje();
    if (_naModo === 'atendimento') navigate('atendimento');
    else navigate('agenda');
  } catch(e) {
    showToast(e.message || 'Erro ao salvar', 'error');
  }
}

function renderDashboard() {
  const low = getLowStock();
  const schedule = getTodaySchedule();
  const totalHoje = schedule.filter(a=>a.status==='confirmado').reduce((s,a)=>s+a.valor,0);
  const totalMes = DB.transacoes.filter(t=>t.tipo==='entrada').reduce((s,t)=>s+t.valor,0);

  const chartBars = DB.faturamentoMensal.map(m => {
    const pct = Math.round((m.valor / 16000) * 100);
    return `<div class="chart-bar-group">
      <div class="chart-bar" style="height:${pct}%" title="${m.mes}: ${formatCurrency(m.valor)}"></div>
      <span class="chart-label">${m.mes}</span>
    </div>`;
  }).join('');

  const scheduleHtml = schedule.slice(0,6).map(a => {
    const cli = getCliente(a.clienteId);
    const serv = getServico(a.servicoId);
    const pro = getProfissional(a.proId);
    return `<div class="schedule-item">
      <span class="schedule-time">${a.hora}</span>
      <div class="schedule-info">
        <div class="schedule-name">${cli?.nome || '—'}</div>
        <div class="schedule-service">${serv?.nome || '—'}</div>
      </div>
      <div>
        <div class="schedule-pro">${pro?.nome?.split(' ')[0] || ''}</div>
        ${statusBadge(a.status)}
      </div>
    </div>`;
  }).join('');

  const lowHtml = low.length
    ? low.map(p => `<div class="stock-alert-item">
        <div class="stock-prod">${p.nome}</div>
        <div>
          <div class="stock-qty">${p.qtd} ${p.unidade}</div>
          <div class="stock-min">mín: ${p.minimo}</div>
        </div>
      </div>`).join('')
    : '<div class="empty-state" style="padding:20px"><p>Estoque OK ✓</p></div>';

  return `
  <div class="dashboard-hero">
    <div class="hero-greeting">Bem-vinda de volta 👋</div>
    <div class="hero-title">Belezza Salão de Beleza</div>
    <div class="hero-stats">
      <div>
        <div class="hero-stat-value">${formatCurrency(totalHoje)}</div>
        <div class="hero-stat-label">Faturamento hoje</div>
      </div>
      <div>
        <div class="hero-stat-value">${schedule.filter(a=>a.status==='confirmado').length}</div>
        <div class="hero-stat-label">Agendamentos hoje</div>
      </div>
      <div>
        <div class="hero-stat-value">${DB.clientes.length}</div>
        <div class="hero-stat-label">Clientes ativos</div>
      </div>
    </div>
  </div>

  <div class="quick-actions mb-24">
    <button class="quick-action-btn" onclick="navigate('agenda')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
      Novo Agendamento
    </button>
    <button class="quick-action-btn" onclick="navigate('pdv')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
      Nova Venda
    </button>
    <button class="quick-action-btn" onclick="navigate('clientes')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
      Cadastrar Cliente
    </button>
    <button class="quick-action-btn" onclick="navigate('caixa')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
      Fechar Caixa
    </button>
  </div>

  <div class="grid grid-4 mb-24">
    <div class="stat-card">
      <div class="stat-icon pink">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
      </div>
      <div class="stat-body">
        <div class="stat-label">Faturamento mês</div>
        <div class="stat-value">${formatCurrency(totalMes)}</div>
        <div class="stat-change up">▲ 18% vs mês anterior</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon purple">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
      </div>
      <div class="stat-body">
        <div class="stat-label">Atendimentos mês</div>
        <div class="stat-value">179</div>
        <div class="stat-change up">▲ 12% vs mês anterior</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon green">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
      </div>
      <div class="stat-body">
        <div class="stat-label">Clientes ativos</div>
        <div class="stat-value">${DB.clientes.length}</div>
        <div class="stat-change up">▲ 3 novos</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon amber">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
      </div>
      <div class="stat-body">
        <div class="stat-label">Alertas estoque</div>
        <div class="stat-value">${low.length}</div>
        <div class="stat-change down">▼ Atenção necessária</div>
      </div>
    </div>
  </div>

  <div class="grid grid-2">
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Faturamento — Últimos meses</div>
          <div class="card-subtitle">Receita bruta por mês</div>
        </div>
        <span class="badge badge-green">+18%</span>
      </div>
      <div class="card-body">
        <div class="chart-area">${chartBars}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">Agenda de hoje</div>
        <button class="btn btn-sm btn-outline" onclick="navigate('agenda')">Ver tudo</button>
      </div>
      <div class="card-body" style="padding-top:8px">
        ${scheduleHtml || '<div class="empty-state"><p>Nenhum agendamento hoje</p></div>'}
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">Alertas de estoque</div>
        <button class="btn btn-sm btn-outline" onclick="navigate('estoque')">Ver estoque</button>
      </div>
      <div class="card-body" style="padding-top:8px">${lowHtml}</div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">Top serviços do mês</div>
      </div>
      <div class="card-body" style="padding-top:12px">
        ${[
          {nome:'Manicure simples', qtd:62, pct:87},
          {nome:'Escova progressiva', qtd:38, pct:53},
          {nome:'Coloração', qtd:31, pct:44},
          {nome:'Pedicure simples', qtd:28, pct:39},
          {nome:'Sobrancelha design', qtd:24, pct:34},
        ].map(s => `
          <div style="margin-bottom:12px">
            <div class="flex-between mb-4" style="margin-bottom:4px">
              <span style="font-size:.82rem;color:var(--gray-700)">${s.nome}</span>
              <span style="font-size:.78rem;font-weight:600;color:var(--gray-800)">${s.qtd}x</span>
            </div>
            <div class="progress"><div class="progress-bar" style="width:${s.pct}%"></div></div>
          </div>`).join('')}
      </div>
    </div>
  </div>`;
}

/* ===================== AGENDA ===================== */
function renderAgenda() {
  const dayStr  = agendaDate.toISOString().slice(0,10);
  const dateLabel = agendaDate.toLocaleDateString('pt-BR', {day:'numeric', month:'long', year:'numeric'});
  const weekLabel = agendaDate.toLocaleDateString('pt-BR', {weekday:'long'});
  const hours   = ['08','09','10','11','12','13','14','15','16','17','18','19'];
  const dayApts = DB.agendamentos.filter(a => a.data === dayStr);
  const uLogado  = getUsuarioLogado();
  const todosPos = DB.profissionais.filter(p => p.ativo !== false);
  // Profissional só vê a própria coluna
  const pros = (uLogado.role === 'profissional')
    ? todosPos.filter(p => uLogado.nome && p.nome.toLowerCase().includes(uLogado.nome.split(' ')[0].toLowerCase())) || todosPos
    : todosPos;

  // Mini calendário
  function miniCal() {
    const m = agendaDate.getMonth(), y = agendaDate.getFullYear();
    const mesNome = agendaDate.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
    const first = new Date(y,m,1).getDay();
    const days  = new Date(y,m+1,0).getDate();
    const hoje  = new Date().toISOString().slice(0,10);
    let cells = '';
    for(let i=0;i<first;i++) cells += '<div></div>';
    for(let d=1;d<=days;d++){
      const ds = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isHoje = ds===hoje, isSel = ds===dayStr;
      const hasApt = DB.agendamentos.some(a=>a.data===ds);
      cells += `<div class="mini-cal-day ${isHoje?'hoje':''} ${isSel?'sel':''} ${hasApt?'has-apt':''}"
        onclick="agendaDate=new Date('${ds}T12:00');navigate('agenda')">${d}</div>`;
    }
    return `<div class="mini-cal">
      <div class="mini-cal-header">
        <button onclick="agendaDate=new Date(agendaDate.getFullYear(),agendaDate.getMonth()-1,1);navigate('agenda')">‹</button>
        <span style="text-transform:capitalize;font-weight:600;font-size:0.82rem">${mesNome}</span>
        <button onclick="agendaDate=new Date(agendaDate.getFullYear(),agendaDate.getMonth()+1,1);navigate('agenda')">›</button>
      </div>
      <div class="mini-cal-grid">
        ${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d=>`<div class="mini-cal-wday">${d}</div>`).join('')}
        ${cells}
      </div>
    </div>`;
  }

  // Colunas dos profissionais
  function colsPros() {
    return pros.map((pro, pi) => {
      const proApts = dayApts.filter(a => a.proId === pro.id);
      const slots = hours.map(h => {
        const slotApts = proApts.filter(a => a.hora && a.hora.startsWith(h+':'));
        const blocks = slotApts.map(a => {
          const cli  = getCliente(a.clienteId);
          const serv = getServico(a.servicoId);
          const topPx  = (parseInt((a.hora.split(':')[1]||'0')) / 60) * 64;
          const durMin = a.duracao || 60;
          const heightPx = Math.max((durMin / 60) * 64 - 2, 28);
          const statusColors = {confirmado:'#c084fc',pendente:'#fbbf24',finalizado:'#34d399',cancelado:'#f87171',emandamento:'#60a5fa'};
          const cor = statusColors[a.status] || '#c084fc';
          return `<div class="apt-block" style="top:${topPx}px;height:${heightPx}px;border-left:3px solid ${cor};background:${cor}18"
            onclick="openAppointmentDetail(${a.id})">
            <div style="font-weight:600;font-size:0.75rem;color:var(--gray-800);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${cli?.nome?.split(' ').slice(0,2).join(' ')||''}</div>
            <div style="font-size:0.7rem;color:var(--gray-500);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${serv?.nome||''}</div>
            <div style="font-size:0.68rem;color:${cor};font-weight:500">${a.hora} - ${a.hora_fim||''}</div>
            <button class="apt-menu-btn" onclick="event.stopPropagation()">⋮</button>
          </div>`;
        }).join('');
        return `<div class="agenda-pro-slot" style="height:64px;position:relative;border-bottom:1px solid var(--gray-100)">${blocks}</div>`;
      }).join('');
      return `<div class="agenda-pro-col">
        <div class="agenda-pro-header">
          ${avatarHtml(pro.nome,'',pi)}
          <div>
            <div style="font-weight:600;font-size:0.82rem">${pro.nome}</div>
            <div style="font-size:0.72rem;color:var(--gray-400)">${pro.especialidade||pro.cargo||'Profissional'}</div>
          </div>
        </div>
        ${slots}
      </div>`;
    }).join('');
  }

  return `
  <div class="page-header">
    <div class="page-header-left"><h1>Agenda</h1></div>
    <div class="page-header-right">
      <button class="btn btn-primary" onclick="openNewAppointment()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Novo Agendamento
      </button>
    </div>
  </div>

  <!-- Breadcrumb -->
  <div style="display:flex;align-items:center;gap:6px;font-size:0.8rem;color:var(--gray-400);margin-bottom:16px">
    <span>Home</span>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="9 18 15 12 9 6"/></svg>
    <span style="color:var(--primary);font-weight:500">Agenda</span>
  </div>

  <div class="agenda-nova-layout">
    <!-- Área principal -->
    <div class="agenda-nova-main">
      <!-- Toolbar -->
      <div class="agenda-nova-toolbar">
        <div style="display:flex;align-items:center;gap:8px">
          <button class="agenda-nav-btn" onclick="agendaBack()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button class="btn btn-sm btn-outline" onclick="agendaToday()" style="padding:6px 14px">Hoje</button>
          <button class="agenda-nav-btn" onclick="agendaNext()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <div style="margin-left:8px">
            <div style="font-weight:700;font-size:1rem;color:var(--gray-800)">${dateLabel}</div>
            <div style="font-size:0.78rem;color:var(--gray-400);text-transform:capitalize">${weekLabel}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="view-toggle">
            <button class="view-toggle-btn ${agendaView==='day'?'active':''}" onclick="setAgendaView('day')">Dia</button>
            <button class="view-toggle-btn ${agendaView==='week'?'active':''}" onclick="setAgendaView('week')">Semana</button>
            <button class="view-toggle-btn ${agendaView==='month'?'active':''}" onclick="setAgendaView('month')">Mês</button>
          </div>
          <select class="form-control" style="width:auto;font-size:0.82rem;padding:7px 12px">
            <option>Todos os profissionais</option>
            ${pros.map(p=>`<option>${p.nome}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Grade de horários com colunas por profissional -->
      <div class="agenda-pro-grid-wrap">
        <!-- Header profissionais -->
        <div class="agenda-pro-grid-header">
          <div class="agenda-time-label-header"></div>
          ${pros.map((pro,pi)=>`
            <div class="agenda-pro-header-cell ${!isAdmin() && !podeEditarAgenda(pro.id) ? 'col-bloqueada' : ''}">
              ${avatarHtml(pro.nome,'avatar-sm',pi)}
              <div>
                <div style="font-weight:600;font-size:0.82rem">${pro.nome}</div>
                <div style="font-size:0.72rem;color:var(--gray-400)">${pro.especialidade||pro.cargo||'Profissional'}</div>
              </div>
              ${!isAdmin() && !podeEditarAgenda(pro.id) ? '<svg viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" stroke-width="2" width="14" height="14" style="margin-left:auto"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>' : ''}
            </div>`).join('')}
        </div>

        <!-- Corpo com horários -->
        <div class="agenda-pro-grid-body">
          <!-- Coluna de horas -->
          <div class="agenda-time-col">
            ${hours.map(h=>`<div class="agenda-time-cell">${h}:00</div>`).join('')}
          </div>
          <!-- Colunas dos profissionais -->
          ${pros.map((pro,pi) => {
            const proApts = dayApts.filter(a => a.proId === pro.id);
            const bloqueada = !isAdmin() && !podeEditarAgenda(pro.id);
            return `<div class="agenda-pro-body-col ${bloqueada ? 'col-bloqueada' : ''}">
              ${hours.map(h => {
                const slotApts = proApts.filter(a => a.hora && a.hora.startsWith(h+':'));
                const blocks = slotApts.map(a => {
                  const cli  = getCliente(a.clienteId);
                  const serv = getServico(a.servicoId);
                  const topPx    = (parseInt((a.hora.split(':')[1]||'0')) / 60) * 64;
                  const durMin   = a.duracao || 60;
                  const heightPx = Math.max((durMin / 60) * 64 - 2, 30);
                  const statusColors = {confirmado:'#c084fc',pendente:'#fbbf24',finalizado:'#34d399',cancelado:'#f87171',emandamento:'#60a5fa',confirmado:'#a78bfa'};
                  const cor = statusColors[a.status] || '#a78bfa';
                  return `<div class="apt-block" style="top:${topPx}px;height:${heightPx}px;border-left:3px solid ${cor};background:${cor}20"
                    onclick="${bloqueada ? '' : 'openAppointmentDetail('+a.id+')'}"
                    title="${bloqueada ? 'Sem permissão para editar' : ''}">
                    <div style="font-weight:600;font-size:0.74rem;color:var(--gray-800);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${cli?.nome?.split(' ').slice(0,2).join(' ')||'—'}</div>
                    <div style="font-size:0.7rem;color:var(--gray-500);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${serv?.nome||''}</div>
                    <div style="font-size:0.68rem;color:${cor};font-weight:500">${a.hora}${a.hora_fim?' - '+a.hora_fim:''}</div>
                  </div>`;
                }).join('');
                return `<div class="agenda-body-slot" style="position:relative">${blocks}</div>`;
              }).join('')}
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- Painel lateral direito -->
    <div class="agenda-nova-sidebar">
      <!-- Mini calendário -->
      ${miniCal()}

      <!-- Filtros -->
      <div class="card" style="margin-top:16px">
        <div class="card-header" style="padding:14px 16px 10px">
          <div class="card-title" style="font-size:0.9rem">Filtros</div>
          <button style="font-size:0.78rem;color:var(--primary);background:none;border:none;cursor:pointer">Limpar filtros</button>
        </div>
        <div class="card-body" style="padding:0 16px 16px">
          <div class="form-group">
            <label class="form-label" style="font-size:0.78rem">Profissional</label>
            <select class="form-control" style="font-size:0.82rem">
              <option>Todos os profissionais</option>
              ${pros.map(p=>`<option>${p.nome}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:0.78rem">Serviço</label>
            <select class="form-control" style="font-size:0.82rem">
              <option>Todos os serviços</option>
              ${DB.servicos.filter(s=>s.ativo).map(s=>`<option>${s.nome}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:0.78rem">Situação</label>
            <select class="form-control" style="font-size:0.82rem">
              <option>Todas</option>
              <option>Agendado</option>
              <option>Confirmado</option>
              <option>Em andamento</option>
              <option>Concluído</option>
              <option>Cancelado</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label" style="font-size:0.78rem">Período</label>
            <select class="form-control" style="font-size:0.82rem">
              <option>Dia inteiro</option>
              <option>Manhã</option>
              <option>Tarde</option>
              <option>Noite</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Legenda -->
      <div class="card" style="margin-top:16px">
        <div class="card-header" style="padding:14px 16px 10px"><div class="card-title" style="font-size:0.9rem">Legenda</div></div>
        <div class="card-body" style="padding:0 16px 14px;display:flex;flex-direction:column;gap:8px">
          ${[
            {cor:'#a78bfa',label:'Agendado'},
            {cor:'#34d399',label:'Confirmado'},
            {cor:'#60a5fa',label:'Em andamento'},
            {cor:'#6ee7b7',label:'Concluído'},
            {cor:'#f87171',label:'Cancelado'},
          ].map(l=>`<div style="display:flex;align-items:center;gap:8px;font-size:0.8rem;color:var(--gray-600)">
            <div style="width:12px;height:12px;border-radius:50%;background:${l.cor};flex-shrink:0"></div>
            ${l.label}
          </div>`).join('')}
        </div>
      </div>

      <!-- Imprimir -->
      <button class="btn btn-outline" style="width:100%;margin-top:16px;font-size:0.82rem" onclick="window.print()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Imprimir Agenda
      </button>
    </div>
  </div>`;
}


function agendaBack() {
  agendaDate = new Date(agendaDate);
  agendaDate.setDate(agendaDate.getDate() - 1);
  navigate('agenda');
}
function agendaNext() {
  agendaDate = new Date(agendaDate);
  agendaDate.setDate(agendaDate.getDate() + 1);
  navigate('agenda');
}
function agendaToday() {
  agendaDate = new Date();
  navigate('agenda');
}
function setAgendaView(v) {
  agendaView = v;
  navigate('agenda');
}
function openAppointmentDetail(id) {
  const a = DB.agendamentos.find(x => x.id === id);
  if (!a) return;
  const cli  = getCliente(a.clienteId);
  const pro  = getProfissional(a.proId);
  const serv = getServico(a.servicoId);
  openModal({
    title: 'Detalhe do Agendamento',
    body: `
      <div style="display:flex;gap:16px;margin-bottom:16px">
        ${avatarHtml(cli?.nome,'avatar-lg',a.clienteId)}
        <div>
          <div style="font-weight:600;font-size:1rem">${cli?.nome||'—'}</div>
          <div style="color:var(--gray-500);font-size:.85rem">${cli?.telefone||''}</div>
        </div>
      </div>
      <div class="grid grid-2" style="gap:10px;margin-bottom:16px">
        <div class="card" style="padding:12px 16px">
          <div class="text-xs text-gray">Serviço</div>
          <div style="font-weight:600;margin-top:4px">${serv?.nome||'—'}</div>
        </div>
        <div class="card" style="padding:12px 16px">
          <div class="text-xs text-gray">Profissional</div>
          <div style="font-weight:600;margin-top:4px">${pro?.nome||'—'}</div>
        </div>
        <div class="card" style="padding:12px 16px">
          <div class="text-xs text-gray">Data / Hora</div>
          <div style="font-weight:600;margin-top:4px">${formatDate(a.data)} às ${a.hora}</div>
        </div>
        <div class="card" style="padding:12px 16px">
          <div class="text-xs text-gray">Valor</div>
          <div style="font-weight:600;color:var(--primary);font-size:1.05rem;margin-top:4px">${formatCurrency(a.valor)}</div>
        </div>
      </div>
      <div style="margin-bottom:12px">${statusBadge(a.status)}</div>
      ${a.obs ? `<div class="alert alert-info" style="font-size:.82rem">💬 ${a.obs}</div>` : ''}`,
    footer: `
      <button class="btn btn-outline" onclick="closeModal()">Fechar</button>
      <button class="btn btn-success" onclick="finalizeAppointment(${a.id})">Finalizar</button>
      <button class="btn btn-danger" onclick="cancelAppointment(${a.id})">Cancelar</button>`
  });
}
function finalizeAppointment(id) {
  const a = DB.agendamentos.find(x=>x.id===id);
  if (a) { a.status='finalizado'; closeModal(); showToast('Atendimento finalizado!','success'); navigate('agenda'); }
}
function cancelAppointment(id) {
  closeModal();
  confirmDialog('Deseja cancelar este agendamento?', () => {
    const a = DB.agendamentos.find(x=>x.id===id);
    if (a) { a.status='cancelado'; showToast('Agendamento cancelado','warning'); navigate('agenda'); }
  });
}

/* ===================== CLIENTES ===================== */
let clienteSearch = '';

function renderClientes() {
  const list = filterList(DB.clientes, clienteSearch, ['nome','telefone','email']);
  const cards = list.map((c,i) => `
    <div class="client-card" onclick="openClientDetail(${c.id})">
      ${avatarHtml(c.nome, '', i)}
      <div class="client-info">
        <div class="client-name">${c.nome}</div>
        <div class="client-meta">${c.telefone} · Última visita: ${formatDate(c.ultimaVisita)}</div>
      </div>
      <div class="client-stats">
        <div class="client-total">${formatCurrency(c.totalGasto)}</div>
        <div class="client-visits">${c.visitas} visitas</div>
      </div>
    </div>`).join('');

  return `
  <div class="page-header">
    <div class="page-header-left"><h1>Clientes</h1><p>Cadastro e histórico de clientes</p></div>
    <div class="page-header-right">
      <button class="btn btn-primary" onclick="openNewCliente()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Novo cliente
      </button>
    </div>
  </div>

  <div class="flex-between mb-20" style="flex-wrap:wrap;gap:12px">
    <div class="search-input">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" class="form-control" placeholder="Buscar clientes..." value="${clienteSearch}"
        oninput="clienteSearch=this.value;document.getElementById('clienteList').innerHTML=renderClienteList()">
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-outline btn-sm">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        Lista
      </button>
    </div>
  </div>

  <div id="clienteList" style="display:flex;flex-direction:column;gap:10px">${cards}</div>`;
}

function renderClienteList() {
  const list = filterList(DB.clientes, clienteSearch, ['nome','telefone','email']);
  return list.map((c,i) => `
    <div class="client-card" onclick="openClientDetail(${c.id})">
      ${avatarHtml(c.nome, '', i)}
      <div class="client-info">
        <div class="client-name">${c.nome}</div>
        <div class="client-meta">${c.telefone} · Última visita: ${formatDate(c.ultimaVisita)}</div>
      </div>
      <div class="client-stats">
        <div class="client-total">${formatCurrency(c.totalGasto)}</div>
        <div class="client-visits">${c.visitas} visitas</div>
      </div>
    </div>`).join('');
}

function openClientDetail(id) {
  const c = DB.clientes.find(x=>x.id===id);
  const hist = DB.agendamentos.filter(a=>a.clienteId===id).slice(-5).reverse();
  openModal({
    title: c.nome, size: 'modal-lg',
    body: `
      <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:20px">
        ${avatarHtml(c.nome,'avatar-xl',id)}
        <div>
          <div style="font-size:.85rem;color:var(--gray-500)">${c.email}</div>
          <div style="font-size:.85rem;color:var(--gray-500)">${c.telefone}</div>
          <div style="margin-top:8px;display:flex;gap:8px">
            <span class="badge badge-pink">💰 ${formatCurrency(c.totalGasto)}</span>
            <span class="badge badge-purple">${c.visitas} visitas</span>
          </div>
        </div>
      </div>
      ${c.observacoes ? `<div class="alert alert-warning" style="margin-bottom:16px;font-size:.82rem">⚠️ ${c.observacoes}</div>` : ''}
      <div class="card-title" style="margin-bottom:12px">Histórico recente</div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Data</th><th>Serviço</th><th>Profissional</th><th>Valor</th><th>Status</th></tr></thead>
          <tbody>
            ${hist.map(a => {
              const serv = getServico(a.servicoId);
              const pro = getProfissional(a.proId);
              return `<tr>
                <td>${formatDate(a.data)}</td>
                <td>${serv?.nome}</td>
                <td>${pro?.nome?.split(' ')[0]}</td>
                <td>${formatCurrency(a.valor)}</td>
                <td>${statusBadge(a.status)}</td>
              </tr>`;
            }).join('') || '<tr><td colspan="5" class="text-center text-gray">Nenhum histórico</td></tr>'}
          </tbody>
        </table>
      </div>`,
    footer: `
      <button class="btn btn-outline" onclick="closeModal()">Fechar</button>
      <button class="btn btn-primary" onclick="openNewAppointment()">Agendar</button>`
  });
}

function openNewCliente() {
  openModal({
    title: 'Novo Cliente',
    body: `
      <div class="form-group"><label class="form-label">Nome completo</label>
        <input type="text" class="form-control" id="nc_nome" placeholder="Ex: Maria Silva"></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Telefone / WhatsApp</label>
          <input type="tel" class="form-control" id="nc_tel" placeholder="(11) 99999-9999"></div>
        <div class="form-group"><label class="form-label">E-mail</label>
          <input type="email" class="form-control" id="nc_email" placeholder="email@exemplo.com"></div>
      </div>
      <div class="form-group"><label class="form-label">Observações</label>
        <textarea class="form-control" id="nc_obs" rows="2" placeholder="Alergias, preferências..."></textarea></div>`,
    footer: `
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveCliente()">Salvar</button>`
  });
}

function saveCliente() {
  const nome = document.getElementById('nc_nome').value.trim();
  if (!nome) { showToast('Informe o nome do cliente','error'); return; }
  DB.clientes.push({
    id: generateId(DB.clientes), nome,
    telefone: document.getElementById('nc_tel').value,
    email: document.getElementById('nc_email').value,
    dataCadastro: today(), ultimaVisita: today(),
    totalGasto: 0, visitas: 0,
    observacoes: document.getElementById('nc_obs').value,
    avatar: nome[0]
  });
  closeModal(); showToast('Cliente cadastrado!', 'success'); navigate('clientes');
}

/* ===================== SERVIÇOS ===================== */
function renderServicos() {
  const cats = [...new Set(DB.servicos.map(s=>s.categoria))];
  const catBtns = cats.map(c => `<button class="btn btn-sm btn-outline">${c}</button>`).join('');
  const cards = DB.servicos.map(s => `
    <div class="service-card">
      <div class="service-emoji">${s.emoji}</div>
      <div class="service-info">
        <div class="service-name">${s.nome}</div>
        <div class="service-meta">${s.categoria} · ${s.duracao} min · Comissão: ${s.comissao}%</div>
      </div>
      <div class="service-price">
        <div class="service-price-value">${formatCurrency(s.preco)}</div>
        <div class="service-duration">${statusBadge(s.ativo?'ativo':'inativo')}</div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-sm btn-ghost" onclick="editServico(${s.id})">✏️</button>
        <button class="btn btn-sm btn-ghost" onclick="toggleServico(${s.id})">${s.ativo?'🔴':'🟢'}</button>
      </div>
    </div>`).join('');

  return `
  <div class="page-header">
    <div class="page-header-left"><h1>Serviços</h1></div>
    <div class="page-header-right">
      <button class="btn btn-primary" onclick="openNewServico()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Novo serviço
      </button>
    </div>
  </div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
    <button class="btn btn-sm btn-primary">Todos</button>${catBtns}
  </div>
  <div style="display:flex;flex-direction:column;gap:10px">${cards}</div>`;
}

function openNewServico() {
  openModal({
    title: 'Novo Serviço',
    body: `
      <div class="form-row">
        <div class="form-group"><label class="form-label">Nome</label>
          <input type="text" class="form-control" id="ns_nome" placeholder="Ex: Manicure"></div>
        <div class="form-group"><label class="form-label">Categoria</label>
          <select class="form-control" id="ns_cat">
            <option>Unhas</option><option>Cabelo</option><option>Estética</option><option>Maquiagem</option></select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Preço (R$)</label>
          <input type="number" class="form-control" id="ns_preco" placeholder="0,00"></div>
        <div class="form-group"><label class="form-label">Duração (min)</label>
          <input type="number" class="form-control" id="ns_dur" placeholder="60"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Comissão (%)</label>
          <input type="number" class="form-control" id="ns_com" placeholder="40"></div>
        <div class="form-group"><label class="form-label">Emoji</label>
          <input type="text" class="form-control" id="ns_emoji" placeholder="💅"></div>
      </div>`,
    footer: `
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveServico()">Salvar</button>`
  });
}
function saveServico() {
  const nome = document.getElementById('ns_nome').value;
  if (!nome) { showToast('Informe o nome','error'); return; }
  DB.servicos.push({
    id:generateId(DB.servicos), nome,
    categoria:document.getElementById('ns_cat').value,
    preco:parseFloat(document.getElementById('ns_preco').value)||0,
    duracao:parseInt(document.getElementById('ns_dur').value)||60,
    comissao:parseInt(document.getElementById('ns_com').value)||40,
    emoji:document.getElementById('ns_emoji').value||'💅', ativo:true
  });
  closeModal(); showToast('Serviço cadastrado!','success'); navigate('servicos');
}
function toggleServico(id) {
  const s = DB.servicos.find(x=>x.id===id);
  if (s) { s.ativo = !s.ativo; navigate('servicos'); }
}
function editServico(id) { showToast('Edição em desenvolvimento','warning'); }

/* ===================== PROFISSIONAIS ===================== */
function renderProfissionais() {
  const cards = DB.profissionais.map((p,i) => `
    <div class="pro-card">
      <div class="pro-card-header">
        ${avatarHtml(p.nome,'avatar-xl',i)}
      </div>
      <div class="pro-card-body">
        <div class="pro-name">${p.nome}</div>
        <div class="pro-role">${p.funcao}</div>
        <div style="margin:10px 0 4px">${statusBadge(p.status)}</div>
        <div class="pro-stats-row">
          <div class="pro-stat">
            <div class="pro-stat-value">${p.atendimentosMes}</div>
            <div class="pro-stat-label">Atendimentos/mês</div>
          </div>
          <div class="pro-stat">
            <div class="pro-stat-value">${p.comissao}%</div>
            <div class="pro-stat-label">Comissão</div>
          </div>
          <div class="pro-stat">
            <div class="pro-stat-value">${formatCurrency(p.faturamentoMes * p.comissao/100)}</div>
            <div class="pro-stat-label">Comissão mês</div>
          </div>
        </div>
        <div style="margin-top:12px">
          <div class="text-xs text-gray" style="margin-bottom:6px">Serviços</div>
          <div style="display:flex;gap:4px;flex-wrap:wrap">
            ${p.servicos.map(s=>`<span class="badge badge-purple">${s}</span>`).join('')}
          </div>
        </div>
      </div>
      <div class="pro-card-footer" style="display:flex;justify-content:space-between;align-items:center">
        <span class="text-xs text-gray">${p.horario}</span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm btn-outline" onclick="showToast('Em desenvolvimento','warning')">Editar</button>
        </div>
      </div>
    </div>`).join('');

  return `
  <div class="page-header">
    <div class="page-header-left"><h1>Profissionais</h1></div>
    <div class="page-header-right">
      <button class="btn btn-primary" onclick="showToast('Em desenvolvimento','warning')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Nova profissional
      </button>
    </div>
  </div>
  <div class="grid grid-3" style="margin-bottom:20px">${cards}</div>
  
  <div class="card">
    <div class="card-header"><div class="card-title">Comissões do mês</div></div>
    <div class="card-body" style="padding-top:8px">
      <div class="table-wrapper" style="border:none;box-shadow:none">
        <table>
          <thead><tr><th>Profissional</th><th>Atendimentos</th><th>Faturamento</th><th>Comissão %</th><th>A receber</th></tr></thead>
          <tbody>
            ${DB.profissionais.map(p=>`
              <tr>
                <td><div style="font-weight:500">${p.nome}</div><div class="text-xs text-gray">${p.funcao}</div></td>
                <td>${p.atendimentosMes}</td>
                <td>${formatCurrency(p.faturamentoMes)}</td>
                <td>${p.comissao}%</td>
                <td><strong style="color:var(--primary)">${formatCurrency(p.faturamentoMes * p.comissao/100)}</strong></td>
              </tr>`).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td>${DB.profissionais.reduce((s,p)=>s+p.atendimentosMes,0)}</td>
              <td>${formatCurrency(DB.profissionais.reduce((s,p)=>s+p.faturamentoMes,0))}</td>
              <td>—</td>
              <td>${formatCurrency(DB.profissionais.reduce((s,p)=>s+(p.faturamentoMes*p.comissao/100),0))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>`;
}

/* ===================== PDV ===================== */
let cart = [];
let selectedPayment = 'pix';
let pdvSearch = '';

function renderPDV() {
  const prods = [...DB.servicos.filter(s=>s.ativo), ...DB.produtos.map(p=>({...p, nome: p.nome, preco: p.preco, emoji:'📦', tipo:'produto'}))];
  const filtered = filterList(prods, pdvSearch, ['nome','categoria']);

  const tiles = filtered.map(p => `
    <div class="product-tile" onclick="addToCart(${p.id},'${p.nome}',${p.preco},'${p.emoji}')">
      <div class="product-emoji">${p.emoji}</div>
      <div class="product-name">${p.nome}</div>
      <div class="product-price">${formatCurrency(p.preco)}</div>
    </div>`).join('');

  const cartItems = cart.map(item => `
    <div class="cart-item">
      <span class="cart-item-name">${item.emoji} ${item.nome}</span>
      <div class="cart-item-qty">
        <button class="qty-btn" onclick="changeQty(${item.tmpId},-1)">−</button>
        <span style="font-size:.85rem;min-width:16px;text-align:center">${item.qty}</span>
        <button class="qty-btn" onclick="changeQty(${item.tmpId},1)">+</button>
      </div>
      <span class="cart-item-price">${formatCurrency(item.preco * item.qty)}</span>
    </div>`).join('');

  const subtotal = cart.reduce((s,i)=>s+i.preco*i.qty,0);
  const disc = 0;
  const total = subtotal - disc;

  const payIcons = {
    pix: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 7L7 17M7 7h10v10"/></svg>',
    cartao: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
    dinheiro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
  };

  return `
  

  <div class="pdv-layout">
    <div class="pdv-products">
      <div class="flex-between mb-20" style="flex-wrap:wrap;gap:10px">
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-sm btn-primary">Todos</button>
          <button class="btn btn-sm btn-outline">Unhas</button>
          <button class="btn btn-sm btn-outline">Cabelo</button>
          <button class="btn btn-sm btn-outline">Estética</button>
          <button class="btn btn-sm btn-outline">Produtos</button>
        </div>
        <div class="search-input">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" class="form-control" placeholder="Buscar..." value="${pdvSearch}"
            oninput="pdvSearch=this.value;navigate('pdv')">
        </div>
      </div>
      <div class="product-grid">${tiles}</div>
    </div>

    <div class="pdv-cart">
      <div class="cart-header">
        <h3>🛒 Carrinho <span style="color:var(--gray-400);font-weight:400">(${cart.length} itens)</span></h3>
      </div>
      <div class="cart-items">
        ${cart.length ? cartItems : '<div class="empty-state"><p>Adicione serviços ou produtos</p></div>'}
      </div>
      <div class="cart-total-area">
        <div class="cart-total-row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
        <div class="cart-total-row"><span>Desconto</span><span>—</span></div>
        <div class="cart-total-row big"><span>Total</span><span>${formatCurrency(total)}</span></div>
      </div>
      <div class="payment-methods">
        ${Object.entries(payIcons).map(([k,icon])=>`
          <div class="payment-method ${selectedPayment===k?'active':''}" onclick="selectPayment('${k}')">
            ${icon}${k.charAt(0).toUpperCase()+k.slice(1)}
          </div>`).join('')}
      </div>
      <div class="cart-actions">
        <button class="btn btn-primary btn-lg btn-block" onclick="checkoutPDV()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Finalizar Venda — ${formatCurrency(total)}
        </button>
        <button class="btn btn-outline btn-block" onclick="clearCart()">Limpar carrinho</button>
      </div>
    </div>
  </div>`;
}

let cartIdCtr = 0;
function addToCart(id, nome, preco, emoji) {
  const existing = cart.find(i=>i.id===id);
  if (existing) { existing.qty++; }
  else { cart.push({ id, tmpId:++cartIdCtr, nome, preco, emoji, qty:1 }); }
  showToast(`${nome} adicionado`, 'success', 1500);
  navigate('pdv');
}
function changeQty(tmpId, delta) {
  const item = cart.find(i=>i.tmpId===tmpId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(i=>i.tmpId!==tmpId);
  navigate('pdv');
}
function clearCart() { cart = []; navigate('pdv'); }
function selectPayment(p) { selectedPayment = p; navigate('pdv'); }
function checkoutPDV() {
  if (!cart.length) { showToast('Carrinho vazio','error'); return; }
  const total = cart.reduce((s,i)=>s+i.preco*i.qty,0);
  DB.transacoes.push({
    id:generateId(DB.transacoes), tipo:'entrada',
    descricao:`Venda PDV (${cart.map(i=>i.nome).join(', ')})`,
    data:today(), valor:total, forma:selectedPayment, categoria:'venda'
  });
  cart = [];
  showToast(`Venda finalizada! ${formatCurrency(total)} — ${selectedPayment.toUpperCase()}`,'success');
  navigate('pdv');
}

/* ===================== ESTOQUE ===================== */
function renderEstoque() {
  const low = getLowStock();
  const rows = DB.produtos.map(p => {
    const pct = Math.min(Math.round((p.qtd/Math.max(p.minimo*2,1))*100),100);
    const barCls = p.qtd<=0?'red':p.qtd<=p.minimo?'amber':'green';
    return `<tr>
      <td><strong>${p.nome}</strong></td>
      <td><span class="badge badge-gray">${p.categoria}</span></td>
      <td>
        <div class="stock-level-bar">
          <div class="progress" style="flex:1"><div class="progress-bar ${barCls}" style="width:${pct}%"></div></div>
          <strong style="color:${p.qtd<=p.minimo?'var(--danger)':'var(--gray-800)'};min-width:32px;text-align:right">${p.qtd}</strong>
        </div>
      </td>
      <td>${p.minimo} ${p.unidade}</td>
      <td>${formatCurrency(p.custo)}</td>
      <td>${formatCurrency(p.preco)}</td>
      <td>${p.qtd<=p.minimo?'<span class="badge badge-red">⚠️ Baixo</span>':'<span class="badge badge-green">OK</span>'}</td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="entradaEstoque(${p.id})">+ Entrada</button>
      </td>
    </tr>`;
  }).join('');

  return `
  <div class="page-header">
    <div class="page-header-left"><h1>PDV — Vendas</h1><p>Ponto de venda rápido</p></div>
    <div class="page-header-right">
      <button class="btn btn-outline" onclick="showToast('Em desenvolvimento','warning')">Relatório</button>
      <button class="btn btn-primary" onclick="openNewProduto()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Novo produto
      </button>
    </div>
  </div>

  ${low.length ? `<div class="alert alert-warning mb-20">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    <span><strong>${low.length} produto(s)</strong> com estoque abaixo do mínimo: ${low.map(p=>p.nome).join(', ')}</span>
  </div>` : ''}

  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Produto</th><th>Categoria</th><th>Quantidade</th><th>Mínimo</th><th>Custo</th><th>Preço venda</th><th>Status</th><th>Ação</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function entradaEstoque(id) {
  openModal({
    title: 'Entrada de Estoque', size: 'modal-sm',
    body: `<p style="font-size:.875rem;color:var(--gray-600);margin-bottom:12px">Produto: <strong>${DB.produtos.find(p=>p.id===id)?.nome}</strong></p>
      <div class="form-group"><label class="form-label">Quantidade a adicionar</label>
        <input type="number" class="form-control" id="es_qty" min="1" value="1"></div>`,
    footer: `<button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveEntrada(${id})">Confirmar</button>`
  });
}
function saveEntrada(id) {
  const qty = parseInt(document.getElementById('es_qty').value)||0;
  const p = DB.produtos.find(x=>x.id===id);
  if (p) { p.qtd += qty; }
  closeModal(); showToast(`+${qty} unidades adicionadas!`,'success'); navigate('estoque');
}
function openNewProduto() { showToast('Em desenvolvimento','warning'); }

/* ===================== FINANCEIRO ===================== */
function renderFinanceiro() {
  const entradas = DB.transacoes.filter(t=>t.tipo==='entrada').reduce((s,t)=>s+t.valor,0);
  const saidas = DB.transacoes.filter(t=>t.tipo==='saida').reduce((s,t)=>s+t.valor,0);
  const saldo = entradas - saidas;

  const rows = DB.transacoes.map(t => `
    <tr>
      <td>${formatDate(t.data)}</td>
      <td>${t.descricao}</td>
      <td><span class="badge ${t.tipo==='entrada'?'badge-green':'badge-red'}">${t.tipo==='entrada'?'Entrada':'Saída'}</span></td>
      <td>${pgBadge(t.forma)}</td>
      <td style="font-weight:600;color:${t.tipo==='entrada'?'var(--success)':'var(--danger)'}">
        ${t.tipo==='entrada'?'+':'-'}${formatCurrency(t.valor)}
      </td>
    </tr>`).join('');

  return `
  <div class="page-header">
    <div class="page-header-left"><h1>Estoque</h1></div>
    <div class="page-header-right">
      <button class="btn btn-outline" onclick="openNovaTransacao('saida')">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg> Lançar saída
      </button>
      <button class="btn btn-primary" onclick="openNovaTransacao('entrada')">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg> Lançar entrada
      </button>
    </div>
  </div>

  <div class="fin-summary">
    <div class="fin-card">
      <div class="fin-card-label">Total entradas</div>
      <div class="fin-card-value green">${formatCurrency(entradas)}</div>
      <div class="text-xs text-gray">Serviços + vendas</div>
    </div>
    <div class="fin-card">
      <div class="fin-card-label">Total saídas</div>
      <div class="fin-card-value red">${formatCurrency(saidas)}</div>
      <div class="text-xs text-gray">Custos + despesas</div>
    </div>
    <div class="fin-card">
      <div class="fin-card-label">Saldo do período</div>
      <div class="fin-card-value ${saldo>=0?'purple':'red'}">${formatCurrency(saldo)}</div>
      <div class="text-xs text-gray">Saldo atual</div>
    </div>
  </div>

  <div class="grid grid-2 mb-20">
    <div class="card">
      <div class="card-header"><div class="card-title">Formas de pagamento</div></div>
      <div class="card-body" style="padding-top:12px">
        ${[
          {forma:'PIX',      pct:48, val:entradas*0.48},
          {forma:'Cartão',   pct:32, val:entradas*0.32},
          {forma:'Dinheiro', pct:20, val:entradas*0.20},
        ].map(f=>`
          <div style="margin-bottom:14px">
            <div class="flex-between" style="margin-bottom:4px">
              <span style="font-size:.82rem">${f.forma}</span>
              <span style="font-size:.82rem;font-weight:600">${f.pct}% — ${formatCurrency(f.val)}</span>
            </div>
            <div class="progress"><div class="progress-bar" style="width:${f.pct}%"></div></div>
          </div>`).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Resumo por categoria</div></div>
      <div class="card-body" style="padding-top:12px">
        ${[
          {cat:'Serviços',  val:entradas*0.85, tipo:'entrada'},
          {cat:'Produtos',  val:entradas*0.15, tipo:'entrada'},
          {cat:'Estoque',   val:saidas*0.55,   tipo:'saida'},
          {cat:'Fixos',     val:saidas*0.45,   tipo:'saida'},
        ].map(c=>`
          <div class="flex-between" style="padding:8px 0;border-bottom:1px solid var(--gray-50)">
            <span style="font-size:.875rem">${c.cat}</span>
            <span style="font-weight:600;color:${c.tipo==='entrada'?'var(--success)':'var(--danger)'}">${c.tipo==='entrada'?'+':'-'}${formatCurrency(c.val)}</span>
          </div>`).join('')}
      </div>
    </div>
  </div>

  <div class="table-wrapper">
    <table>
      <thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Forma</th><th>Valor</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function openNovaTransacao(tipo) {
  openModal({
    title: tipo==='entrada' ? 'Nova Entrada' : 'Nova Saída',
    body: `
      <div class="form-group"><label class="form-label">Descrição</label>
        <input type="text" class="form-control" id="nt_desc" placeholder="Descreva a ${tipo}"></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Valor (R$)</label>
          <input type="number" class="form-control" id="nt_val" placeholder="0,00"></div>
        <div class="form-group"><label class="form-label">Forma de pagamento</label>
          <select class="form-control" id="nt_forma">
            <option value="pix">PIX</option><option value="cartao">Cartão</option>
            <option value="dinheiro">Dinheiro</option><option value="debito">Débito</option></select></div>
      </div>`,
    footer: `<button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveTransacao('${tipo}')">Salvar</button>`
  });
}
function saveTransacao(tipo) {
  const desc = document.getElementById('nt_desc').value;
  const val = parseFloat(document.getElementById('nt_val').value)||0;
  if (!desc || !val) { showToast('Preencha todos os campos','error'); return; }
  DB.transacoes.unshift({ id:generateId(DB.transacoes), tipo, descricao:desc, data:today(), valor:val, forma:document.getElementById('nt_forma').value, categoria:'manual' });
  closeModal(); showToast(`${tipo==='entrada'?'Entrada':'Saída'} lançada!`,'success'); navigate('financeiro');
}

/* ===================== RELATÓRIOS ===================== */
function renderRelatorios() {
  const topServicos = [
    {nome:'Manicure simples',   val:2480, pct:100},
    {nome:'Escova progressiva', val:2200, pct:89},
    {nome:'Coloração',          val:1980, pct:80},
    {nome:'Pedicure simples',   val:1400, pct:56},
    {nome:'Sobrancelha',        val:840,  pct:34},
  ];
  const topClientes = DB.clientes.sort((a,b)=>b.totalGasto-a.totalGasto).slice(0,5);
  const topPro = DB.profissionais.sort((a,b)=>b.faturamentoMes-a.faturamentoMes);

  return `
  <div class="page-header">
    <div class="page-header-left"><h1>Financeiro</h1><p>Controle de entradas e saídas</p></div>
    <div class="page-header-right">
      <select class="form-control" style="width:auto">
        <option>Setembro 2025</option><option>Agosto 2025</option><option>Julho 2025</option>
      </select>
      <button class="btn btn-outline">📥 Exportar</button>
    </div>
  </div>

  <div class="grid grid-4 mb-24">
    <div class="stat-card"><div class="stat-icon pink"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
      <div class="stat-body"><div class="stat-label">Faturamento mês</div><div class="stat-value">R$ 15.600</div><div class="stat-change up">▲ 18%</div></div></div>
    <div class="stat-card"><div class="stat-icon purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></div>
      <div class="stat-body"><div class="stat-label">Atendimentos</div><div class="stat-value">179</div><div class="stat-change up">▲ 12%</div></div></div>
    <div class="stat-card"><div class="stat-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
      <div class="stat-body"><div class="stat-label">Ticket médio</div><div class="stat-value">R$ 87,15</div><div class="stat-change up">▲ 6%</div></div></div>
    <div class="stat-card"><div class="stat-icon amber"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
      <div class="stat-body"><div class="stat-label">Novos clientes</div><div class="stat-value">24</div><div class="stat-change up">▲ 3</div></div></div>
  </div>

  <div class="grid grid-2">
    <div class="card">
      <div class="card-header"><div class="card-title">Serviços mais realizados</div></div>
      <div class="card-body" style="padding-top:16px">
        ${topServicos.map(s=>`
          <div class="report-chart-bar">
            <span class="report-chart-bar-label">${s.nome}</span>
            <div class="report-chart-bar-track"><div class="report-chart-bar-fill" style="width:${s.pct}%"></div></div>
            <span class="report-chart-bar-value">${formatCurrency(s.val)}</span>
          </div>`).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">Top clientes (por gasto)</div></div>
      <div class="card-body" style="padding-top:8px">
        ${topClientes.map((c,i)=>`
          <div class="flex-center gap-12" style="padding:8px 0;border-bottom:1px solid var(--gray-50)">
            <span style="font-size:.8rem;font-weight:700;color:var(--gray-400);min-width:16px">${i+1}</span>
            ${avatarHtml(c.nome,'avatar-sm',i)}
            <div style="flex:1"><div style="font-size:.85rem;font-weight:500">${c.nome}</div>
              <div class="text-xs text-gray">${c.visitas} visitas</div></div>
            <strong style="color:var(--primary)">${formatCurrency(c.totalGasto)}</strong>
          </div>`).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">Desempenho das profissionais</div></div>
      <div class="card-body" style="padding-top:8px">
        <div class="table-wrapper" style="border:none;box-shadow:none">
          <table>
            <thead><tr><th>Profissional</th><th>Atendimentos</th><th>Faturamento</th><th>Comissão</th></tr></thead>
            <tbody>
              ${topPro.map(p=>`
                <tr>
                  <td><div style="font-weight:500;font-size:.85rem">${p.nome}</div></td>
                  <td>${p.atendimentosMes}</td>
                  <td>${formatCurrency(p.faturamentoMes)}</td>
                  <td>${formatCurrency(p.faturamentoMes*p.comissao/100)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">Distribuição por forma de pagamento</div></div>
      <div class="card-body" style="padding-top:16px">
        ${[
          {forma:'PIX',      pct:48, cor:'#c026d3'},
          {forma:'Cartão crédito', pct:22, cor:'#7c3aed'},
          {forma:'Cartão débito',  pct:18, cor:'#a78bfa'},
          {forma:'Dinheiro', pct:12, cor:'#f9a8d4'},
        ].map(f=>`
          <div class="report-chart-bar">
            <span class="report-chart-bar-label">${f.forma}</span>
            <div class="report-chart-bar-track"><div class="report-chart-bar-fill" style="width:${f.pct}%;background:${f.cor}"></div></div>
            <span class="report-chart-bar-value">${f.pct}%</span>
          </div>`).join('')}
      </div>
    </div>
  </div>`;
}

/* ===================== ATENDIMENTO ===================== */

// ── Estado da tela de atendimentos ──────────────────────
let _atdFiltroTab    = 'todos';
let _atdFiltroSit    = 'todos';
let _atdFiltroPro    = 'todos';
let _atdFiltroBusca  = '';
let _atdPagina       = 1;
const _atdPorPagina  = 8;
let _atdSelecionado  = null;

function renderAtendimento() {
  const hoje = new Date().toISOString().slice(0,10);

  // Gerar lista de atendimentos a partir dos agendamentos
  const todos = DB.agendamentos.map((a, i) => {
    const cli  = getCliente(a.clienteId);
    const pro  = getProfissional(a.proId);
    const serv = getServico(a.servicoId);
    return { ...a, _cli: cli, _pro: pro, _serv: serv, _num: String(i+18).padStart(5,'0') };
  }).reverse();

  // Filtrar
  let lista = todos;
  if (_atdFiltroTab !== 'todos') {
    const map = { emandamento: ['emandamento'], concluidos: ['finalizado'], cancelados: ['cancelado'] };
    lista = lista.filter(a => (map[_atdFiltroTab]||[]).includes(a.status));
  }
  if (_atdFiltroSit !== 'todos') lista = lista.filter(a => a.status === _atdFiltroSit);
  if (_atdFiltroPro !== 'todos') lista = lista.filter(a => String(a.proId) === _atdFiltroPro);
  if (_atdFiltroBusca) {
    const q = _atdFiltroBusca.toLowerCase();
    lista = lista.filter(a =>
      a._cli?.nome?.toLowerCase().includes(q) ||
      a._pro?.nome?.toLowerCase().includes(q) ||
      a._serv?.nome?.toLowerCase().includes(q)
    );
  }

  const total    = lista.length;
  const paginas  = Math.max(1, Math.ceil(total / _atdPorPagina));
  if (_atdPagina > paginas) _atdPagina = 1;
  const pagLista = lista.slice((_atdPagina-1)*_atdPorPagina, _atdPagina*_atdPorPagina);

  const statusLabel = { confirmado:'Agendado', pendente:'Agendado', emandamento:'Em andamento', finalizado:'Concluído', cancelado:'Cancelado' };
  const statusBadgeClass = { confirmado:'badge-blue', pendente:'badge-amber', emandamento:'badge-amber', finalizado:'badge-green', cancelado:'badge-gray' };

  const proOptions = DB.profissionais.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');

  // Painel de detalhes do atendimento selecionado
  const sel = _atdSelecionado ? todos.find(a => a.id === _atdSelecionado) : null;
  const painelDetalhes = sel ? `
    <div class="atd-detalhe-painel">
      <div class="atd-detalhe-header">
        <div>
          <div class="atd-detalhe-num">#ATD-${sel._num}</div>
          <div style="font-size:0.78rem;color:rgba(255,255,255,0.7);margin-top:2px">
            Iniciado às ${sel.hora} · ${formatDate(sel.data)}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="badge ${statusBadgeClass[sel.status]||'badge-gray'}" style="font-size:0.72rem">${statusLabel[sel.status]||sel.status}</span>
          <button onclick="_atdSelecionado=null;navigate('atendimento')" style="background:rgba(255,255,255,0.15);border:none;border-radius:6px;padding:4px 8px;color:white;cursor:pointer;font-size:1rem">✕</button>
        </div>
      </div>
      <div class="atd-detalhe-body">
        <!-- Cliente -->
        <div class="atd-detalhe-section">
          <div class="atd-detalhe-section-title">Cliente</div>
          <div style="display:flex;align-items:center;gap:10px">
            ${avatarHtml(sel._cli?.nome||'?','',sel.clienteId)}
            <div style="flex:1">
              <div style="font-weight:600;font-size:0.875rem">${sel._cli?.nome||'—'}</div>
              <div style="font-size:0.78rem;color:var(--gray-400)">${sel._cli?.telefone||''}</div>
            </div>
            <div style="display:flex;gap:6px">
              <button class="btn-icon-sm" title="Ligar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg></button>
              <button class="btn-icon-sm" title="WhatsApp"><svg viewBox="0 0 24 24" fill="none" stroke="#25D366" stroke-width="2" width="14" height="14"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg></button>
              <button class="btn-icon-sm btn-icon-edit" title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            </div>
          </div>
        </div>
        <!-- Profissional -->
        <div class="atd-detalhe-section">
          <div class="atd-detalhe-section-title">Profissional</div>
          <div style="display:flex;align-items:center;gap:10px">
            ${avatarHtml(sel._pro?.nome||'?','',sel.proId)}
            <div style="flex:1">
              <div style="font-weight:600;font-size:0.875rem">${sel._pro?.nome||'—'}</div>
              <div style="font-size:0.78rem;color:var(--gray-400)">${sel._pro?.especialidade||sel._pro?.cargo||'Profissional'}</div>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="color:var(--gray-300)"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>
        <!-- Serviços -->
        <div class="atd-detalhe-section">
          <div class="atd-detalhe-section-title">Serviços</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <div style="display:flex;justify-content:space-between;font-size:0.82rem">
              <span style="color:var(--gray-700)">• ${sel._serv?.nome||'Serviço'}</span>
              <span style="font-weight:500">${formatCurrency(sel.valor)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;border-top:1px solid var(--gray-100);padding-top:6px;margin-top:2px">
              <span style="font-size:0.82rem;font-weight:600;color:var(--gray-700)">Total dos serviços</span>
              <span style="font-weight:700;color:var(--primary)">${formatCurrency(sel.valor)}</span>
            </div>
          </div>
        </div>
        <!-- Informações -->
        <div class="atd-detalhe-section">
          <div class="atd-detalhe-section-title">Informações</div>
          <div style="display:flex;flex-direction:column;gap:8px;font-size:0.82rem">
            <div style="display:flex;justify-content:space-between">
              <span style="color:var(--gray-500)">Forma de pagamento</span>
              <span style="font-weight:500">Cartão de Crédito</span>
            </div>
            <div style="display:flex;justify-content:space-between">
              <span style="color:var(--gray-500)">Status do pagamento</span>
              <span class="badge badge-green" style="font-size:0.72rem">Pago</span>
            </div>
            <div style="display:flex;justify-content:space-between">
              <span style="color:var(--gray-500)">Observações</span>
              <span style="color:var(--gray-400)">${sel.obs||'—'}</span>
            </div>
          </div>
        </div>
      </div>
      <!-- Botões -->
      <div class="atd-detalhe-footer">
        <button class="btn btn-outline" style="width:100%;font-size:0.82rem" onclick="window.print()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Imprimir Comanda
        </button>
        ${sel.status !== 'finalizado' && sel.status !== 'cancelado' ? `
        <button class="btn btn-primary" style="width:100%;font-size:0.82rem" onclick="finalizeAppointment(${sel.id});_atdSelecionado=null;navigate('atendimento')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
          Finalizar Atendimento
        </button>` : ''}
      </div>
    </div>` : '';

  return `
  <div class="page-header">
    <div class="page-header-left"><h1>Atendimentos</h1></div>
    <div class="page-header-right">
      <button class="btn btn-primary" onclick="openNewAppointment('atendimento')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Novo Atendimento
      </button>
    </div>
  </div>

  <div class="atd-layout ${sel ? 'com-detalhe' : ''}">
    <div class="atd-main">
      <!-- Abas de filtro -->
      <div class="atd-tabs">
        ${[
          {key:'todos',      label:'Todos'},
          {key:'emandamento',label:'Em andamento'},
          {key:'concluidos', label:'Concluídos'},
          {key:'cancelados', label:'Cancelados'},
        ].map(t => `<button class="atd-tab ${_atdFiltroTab===t.key?'active':''}" onclick="_atdFiltroTab='${t.key}';_atdPagina=1;navigate('atendimento')">${t.label}</button>`).join('')}
      </div>

      <!-- Filtros -->
      <div class="atd-filtros">
        <div class="search-input" style="flex:1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Buscar atendimento, cliente ou profissional..."
            value="${_atdFiltroBusca}"
            oninput="_atdFiltroBusca=this.value;_atdPagina=1;navigate('atendimento')" />
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:0.78rem;color:var(--gray-500)">Situação</span>
          <select class="form-control" style="width:130px;font-size:0.82rem" onchange="_atdFiltroSit=this.value;_atdPagina=1;navigate('atendimento')">
            <option value="todos" ${_atdFiltroSit==='todos'?'selected':''}>Todos</option>
            <option value="confirmado" ${_atdFiltroSit==='confirmado'?'selected':''}>Agendado</option>
            <option value="emandamento" ${_atdFiltroSit==='emandamento'?'selected':''}>Em andamento</option>
            <option value="finalizado" ${_atdFiltroSit==='finalizado'?'selected':''}>Concluído</option>
            <option value="cancelado" ${_atdFiltroSit==='cancelado'?'selected':''}>Cancelado</option>
          </select>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:0.78rem;color:var(--gray-500)">Profissional</span>
          <select class="form-control" style="width:140px;font-size:0.82rem" onchange="_atdFiltroPro=this.value;_atdPagina=1;navigate('atendimento')">
            <option value="todos" ${_atdFiltroPro==='todos'?'selected':''}>Todos</option>
            ${proOptions}
          </select>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:0.78rem;color:var(--gray-500)">Período</span>
          <div class="input-wrap" style="position:relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--gray-400)"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <input type="date" class="form-control" style="padding-left:32px;width:150px;font-size:0.82rem" value="${hoje}" />
          </div>
        </div>
      </div>

      <!-- Tabela -->
      <div class="card">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Atendimento</th>
                <th>Cliente</th>
                <th>Profissional</th>
                <th>Serviços</th>
                <th>Horário</th>
                <th>Valor</th>
                <th>Situação</th>
                <th style="text-align:center">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${pagLista.length === 0
                ? `<tr><td colspan="8" style="text-align:center;color:var(--gray-400);padding:40px">Nenhum atendimento encontrado</td></tr>`
                : pagLista.map(a => `
                <tr class="${_atdSelecionado===a.id?'atd-row-sel':''}" onclick="_atdSelecionado=${a.id};navigate('atendimento')" style="cursor:pointer">
                  <td>
                    <div style="display:flex;align-items:center;gap:8px">
                      <div style="width:32px;height:32px;border-radius:8px;background:var(--rose-50);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                        <svg viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" width="14" height="14"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      </div>
                      <div>
                        <div style="font-weight:600;font-size:0.82rem;color:var(--primary)">#ATD-${a._num}</div>
                        <div style="font-size:0.72rem;color:var(--gray-400)">${formatDate(a.data)}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px">
                      ${avatarHtml(a._cli?.nome||'?','avatar-sm',a.clienteId)}
                      <div>
                        <div style="font-weight:500;font-size:0.82rem">${a._cli?.nome||'—'}</div>
                        <div style="font-size:0.72rem;color:var(--gray-400)">${a._cli?.telefone||''}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px">
                      ${avatarHtml(a._pro?.nome||'?','avatar-sm',a.proId)}
                      <div>
                        <div style="font-weight:500;font-size:0.82rem">${a._pro?.nome||'—'}</div>
                        <div style="font-size:0.72rem;color:var(--gray-400)">${a._pro?.especialidade||a._pro?.cargo||'Profissional'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style="font-size:0.82rem;font-weight:500;color:var(--primary)">1 serviço</div>
                    <div style="font-size:0.72rem;color:var(--gray-500);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a._serv?.nome||'—'}</div>
                  </td>
                  <td style="font-size:0.82rem;white-space:nowrap">
                    <div style="font-weight:500">${a.hora}</div>
                    <div style="color:var(--gray-400)">– ${a.hora_fim||''}</div>
                  </td>
                  <td style="font-weight:600;font-size:0.875rem">${formatCurrency(a.valor)}</td>
                  <td><span class="badge ${statusBadgeClass[a.status]||'badge-gray'}" style="font-size:0.72rem">${statusLabel[a.status]||a.status}</span></td>
                  <td onclick="event.stopPropagation()">
                    <div style="display:flex;gap:4px;justify-content:center;position:relative">
                      <button class="btn-icon-sm btn-icon-edit" onclick="_atdSelecionado=${a.id};navigate('atendimento')" title="Ver detalhes">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                      <div style="position:relative">
                        <button class="btn-icon-sm" onclick="toggleAtdMenu(event,${a.id})" title="Mais opções">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                        <div class="atd-mini-menu" id="atdMenu_${a.id}">
                          <button onclick="closeAtdMenus();_atdSelecionado=${a.id};navigate('atendimento')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            Ver detalhes
                          </button>
                          ${a.status !== 'finalizado' && a.status !== 'cancelado' ? `
                          <button onclick="closeAtdMenus();atdFinalizar(${a.id})">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>
                            Finalizar
                          </button>
                          <button onclick="closeAtdMenus();atdCancelar(${a.id})" style="color:var(--danger)">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            Cancelar
                          </button>` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>

        <!-- Paginação -->
        <div class="atd-paginacao">
          <span style="font-size:0.8rem;color:var(--gray-400)">Mostrando ${Math.min((_atdPagina-1)*_atdPorPagina+1,total)} a ${Math.min(_atdPagina*_atdPorPagina,total)} de ${total} atendimentos</span>
          <div style="display:flex;gap:4px;align-items:center">
            <button class="pag-btn" onclick="_atdPagina=1;navigate('atendimento')" ${_atdPagina===1?'disabled':''}>«</button>
            <button class="pag-btn" onclick="_atdPagina=Math.max(1,_atdPagina-1);navigate('atendimento')" ${_atdPagina===1?'disabled':''}>‹</button>
            ${Array.from({length:paginas},(_,i)=>i+1).filter(p=>Math.abs(p-_atdPagina)<3).map(p=>
              `<button class="pag-btn ${p===_atdPagina?'active':''}" onclick="_atdPagina=${p};navigate('atendimento')">${p}</button>`
            ).join('')}
            <button class="pag-btn" onclick="_atdPagina=Math.min(paginas,_atdPagina+1);navigate('atendimento')" ${_atdPagina===paginas?'disabled':''}>›</button>
            <button class="pag-btn" onclick="_atdPagina=${paginas};navigate('atendimento')" ${_atdPagina===paginas?'disabled':''}>»</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Painel de detalhes -->
    ${painelDetalhes}
  </div>`;
}

function toggleAtdMenu(e, id) {
  e.stopPropagation();
  const menu = document.getElementById('atdMenu_' + id);
  const isOpen = menu.classList.contains('show');
  closeAtdMenus();
  if (!isOpen) {
    menu.classList.add('show');
    setTimeout(() => document.addEventListener('click', closeAtdMenus, { once: true }), 0);
  }
}
function closeAtdMenus() {
  document.querySelectorAll('.atd-mini-menu.show').forEach(m => m.classList.remove('show'));
}
async function atdFinalizar(id) {
  try {
    if (typeof apiFetch === 'function') {
      await apiFetch('/api/agendamentos/' + id + '/status', { method:'PATCH', body: JSON.stringify({ status:'finalizado' }) });
      await reloadAndNavigate('atendimento');
    } else {
      const a = DB.agendamentos.find(x=>x.id===id);
      if (a) { a.status='finalizado'; navigate('atendimento'); }
    }
    showToast('Atendimento finalizado!', 'success');
  } catch(e) { showToast('Erro ao finalizar', 'error'); }
}
function atdCancelar(id) {
  confirmDialog('Deseja cancelar este atendimento?', async () => {
    try {
      if (typeof apiFetch === 'function') {
        await apiFetch('/api/agendamentos/' + id + '/status', { method:'PATCH', body: JSON.stringify({ status:'cancelado' }) });
        await reloadAndNavigate('atendimento');
      } else {
        const a = DB.agendamentos.find(x=>x.id===id);
        if (a) { a.status='cancelado'; navigate('atendimento'); }
      }
      showToast('Atendimento cancelado', 'warning');
    } catch(e) { showToast('Erro ao cancelar', 'error'); }
  });
}

// CSS do mini-menu (injetado uma vez)
if (!document.getElementById('atdMiniMenuStyle')) {
  const s = document.createElement('style');
  s.id = 'atdMiniMenuStyle';
  s.textContent = `
    .atd-mini-menu {
      display: none;
      position: absolute;
      right: 0; top: calc(100% + 4px);
      background: white;
      border: 1px solid var(--gray-200);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.1);
      min-width: 150px;
      z-index: 300;
      overflow: hidden;
    }
    .atd-mini-menu.show { display: block; }
    .atd-mini-menu button {
      display: flex; align-items: center; gap: 8px;
      width: 100%; padding: 9px 14px;
      font-size: 0.82rem; font-weight: 500;
      color: var(--gray-700); font-family: var(--font-body);
      background: none; border: none; cursor: pointer;
      text-align: left; transition: background 0.12s;
    }
    .atd-mini-menu button:hover { background: var(--gray-50); }
  `;
  document.head.appendChild(s);
}

/* ===================== CONFIGURAÇÕES ===================== */
// Seção atual de configurações
let _configSecao = 'dados';

function renderConfiguracoes(secao) {
  if (secao) _configSecao = secao;
  // Marcar subitem ativo na sidebar
  setTimeout(() => {
    document.querySelectorAll('.nav-subitem').forEach(el => {
      el.classList.toggle('active', el.dataset.config === _configSecao);
    });
    // Expandir submenu se não estiver aberto
    const sub = document.getElementById('configSubmenu');
    if (sub && !sub.classList.contains('open')) {
      sub.classList.add('open');
      const arrow = document.getElementById('configArrow');
      if (arrow) arrow.style.transform = 'rotate(180deg)';
    }
  }, 0);

  const titulos = { dados:'Dados do Salão', horarios:'Horários', usuarios:'Usuários', whatsapp:'WhatsApp', perfis:'Perfis de Acesso', permissoes:'Permissões', 'formas-pagamento':'Formas de Pagamento' };
  const titulo = titulos[_configSecao] || 'Configurações';

  let conteudo = '';

  if (_configSecao === 'dados') {
    conteudo = `
    <div class="card">
      <div class="card-header"><div class="card-title">Dados do Salão</div></div>
      <div class="card-body">
        <div class="grid grid-2">
          <div class="form-group"><label class="form-label">Nome do salão</label><input type="text" class="form-control" value="Belezza Salão de Beleza"></div>
          <div class="form-group"><label class="form-label">CNPJ</label><input type="text" class="form-control" value="12.345.678/0001-90"></div>
          <div class="form-group"><label class="form-label">Telefone</label><input type="tel" class="form-control" value="(11) 3456-7890"></div>
          <div class="form-group"><label class="form-label">Instagram</label><input type="text" class="form-control" value="@belezza.salon"></div>
          <div class="form-group" style="grid-column:1/-1"><label class="form-label">Endereço</label><input type="text" class="form-control" value="Rua das Flores, 123 — São Paulo/SP"></div>
        </div>
        <button class="btn btn-primary" onclick="showToast('Configurações salvas!','success')">Salvar alterações</button>
      </div>
    </div>`;

  } else if (_configSecao === 'horarios') {
    conteudo = `
    <div class="card">
      <div class="card-header"><div class="card-title">Horário de Funcionamento</div></div>
      <div class="card-body">
        ${['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'].map((d,i)=>`
          <div class="config-row">
            <span class="config-label" style="width:90px">${d}</span>
            <div style="display:flex;gap:8px;align-items:center;flex:1">
              <input type="time" class="form-control" style="width:100px" value="${i<6?'08:00':''}">
              <span class="text-gray">às</span>
              <input type="time" class="form-control" style="width:100px" value="${i<5?'18:00':i===5?'16:00':''}">
              <label class="toggle"><input type="checkbox" ${i<6?'checked':''}><span class="toggle-slider"></span></label>
            </div>
          </div>`).join('')}
        <button class="btn btn-primary" style="margin-top:16px" onclick="showToast('Horários salvos!','success')">Salvar horários</button>
      </div>
    </div>`;

  } else if (_configSecao === 'whatsapp') {
    conteudo = `
    <div class="card">
      <div class="card-header"><div class="card-title">WhatsApp Business</div></div>
      <div class="card-body">
        <div class="config-row">
          <div><div class="config-label">Confirmação automática</div><div class="config-desc">Enviar mensagem 24h antes do agendamento</div></div>
          <label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label>
        </div>
        <div class="config-row">
          <div><div class="config-label">Lembrete de retorno</div><div class="config-desc">Avisar clientes após 30 dias sem visita</div></div>
          <label class="toggle"><input type="checkbox"><span class="toggle-slider"></span></label>
        </div>
        <div class="form-group" style="margin-top:16px">
          <label class="form-label">Número do WhatsApp Business</label>
          <input type="tel" class="form-control" placeholder="(11) 99999-9999">
        </div>
        <button class="btn btn-primary" onclick="showToast('WhatsApp configurado!','success')">Salvar</button>
      </div>
    </div>`;

  } else if (_configSecao === 'permissoes') {
    conteudo = `<div id="permissoesArea"><div class="loading-box" style="padding:40px;text-align:center;color:var(--gray-400)">Carregando...</div></div>`;

  } else if (_configSecao === 'formas-pagamento') {
    conteudo = `<div id="formasPagArea"><div class="loading-box" style="padding:40px;text-align:center;color:var(--gray-400)">Carregando...</div></div>`;

  } else if (_configSecao === 'perfis') {
    conteudo = `<div id="perfisArea"><div class="loading-box">Carregando...</div></div>`;
    setTimeout(() => renderPerfisArea(), 0);

  } else if (_configSecao === 'usuarios') {
    conteudo = `<div id="usuariosArea"><div class="loading-box">Carregando...</div></div>`;
    setTimeout(() => renderUsuariosArea(), 0);
  }

  return `
  <div class="page-header" id="configPageHeader">
    <div class="page-header-left"><h1>${titulo}</h1></div>
  </div>
  ${conteudo}`;
}

// ── Submenu de Configurações na sidebar ──────────────────
function toggleConfigMenu(e) {
  e.preventDefault();
  const sub   = document.getElementById('configSubmenu');
  const arrow = document.getElementById('configArrow');
  const isOpen = sub.classList.toggle('open');
  arrow.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
  if (isOpen && !document.querySelector('.nav-subitem.active')) {
    navigateConfig('dados');
  }
}

function navigateConfig(secao, e) {
  if (e) e.preventDefault();
  _configSecao = secao;
  // Marcar item pai como ativo
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById('navConfiguracoes')?.classList.add('active');
  // Marcar subitem
  document.querySelectorAll('.nav-subitem').forEach(el => {
    el.classList.toggle('active', el.dataset.config === secao);
  });
  // Expandir submenu
  const sub = document.getElementById('configSubmenu');
  if (sub) sub.classList.add('open');
  const arrow = document.getElementById('configArrow');
  if (arrow) arrow.style.transform = 'rotate(180deg)';
  // Atualizar título da topbar
  const titulos = { dados:'Dados do Salão', horarios:'Horários', usuarios:'Usuários', whatsapp:'WhatsApp', perfis:'Perfis de Acesso', permissoes:'Permissões', 'formas-pagamento':'Formas de Pagamento' };
  const topTitle = document.getElementById('pageTitle');
  if (topTitle) topTitle.textContent = titulos[secao] || 'Configurações';
  document.title = `${titulos[secao] || 'Configurações'} — Belezza`;
  // Renderizar
  const content = document.getElementById('pageContent');
  content.innerHTML = `<div class="page-fade">${renderConfiguracoes(secao)}</div>`;
  content.scrollTop = 0;
  // Carregar dados após HTML estar no DOM
  if (secao === 'perfis') setTimeout(async () => { await loadPerfis(); }, 0);
  if (secao === 'permissoes') setTimeout(async () => { await loadPermissoes(); }, 0);
  if (secao === 'formas-pagamento') setTimeout(async () => { await loadFormasPagamento(); }, 0);
  if (secao === 'usuarios') setTimeout(() => { renderUsuariosArea(); }, 0);
}

// ── Tela de Usuários ─────────────────────────────────────────────────────────
let _usuarios   = [];
let _usuarioEditando = null;

const PERMISSOES_LISTA = [
  { key:'dashboard',     label:'Dashboard'     },
  { key:'agenda',        label:'Agenda'        },
  { key:'clientes',      label:'Clientes'      },
  { key:'servicos',      label:'Serviços'      },
  { key:'profissionais', label:'Profissionais' },
  { key:'atendimentos',  label:'Atendimentos'  },
  { key:'pdv',           label:'PDV / Vendas'  },
  { key:'estoque',       label:'Estoque'       },
  { key:'financeiro',    label:'Financeiro'    },
  { key:'relatorios',    label:'Relatórios'    },
  { key:'configuracoes', label:'Configurações' },
];

async function loadUsuarios() {
  try {
    const res = await fetch('/api/usuarios');
    _usuarios = await res.json();
  } catch(e) { _usuarios = []; }
  renderTabelaUsuarios();
}

// ── Aba principal: lista de usuários ─────────────────────
function renderUsuariosArea() {
  const area = document.getElementById('usuariosArea');
  if (!area) return;

  area.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div>
        <p style="font-size:0.8rem;color:var(--gray-400)" id="usuariosCount">Carregando...</p>
      </div>
      <button class="btn btn-primary" onclick="abrirCadastroUsuario()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Novo Usuário
      </button>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">Usuários Cadastrados</div>
        <div class="search-input">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Buscar usuário..." oninput="renderTabelaUsuarios(this.value)" />
        </div>
      </div>
      <div class="table-wrap" id="usuariosTabelaWrap">
        <div style="text-align:center;padding:40px;color:var(--gray-400)">Carregando...</div>
      </div>
    </div>`;

  loadUsuarios();
}

function renderTabelaUsuarios(filtro = '') {
  const wrap = document.getElementById('usuariosTabelaWrap');
  if (!wrap) return;

  const roles = { gerente:'Gerente', profissional:'Profissional', recepcionista:'Recepcionista', caixa:'Caixa', administrador:'Administrador' };
  const roleColor = { gerente:'badge-purple', profissional:'badge-blue', recepcionista:'badge-amber', caixa:'badge-green', administrador:'badge-pink' };

  const lista = filtro
    ? _usuarios.filter(u => u.nome.toLowerCase().includes(filtro.toLowerCase()) || u.usuario.toLowerCase().includes(filtro.toLowerCase()))
    : _usuarios;

  const count = document.getElementById('usuariosCount');
  if (count) count.textContent = `${_usuarios.length} usuário(s) cadastrado(s)`;

  wrap.innerHTML = `
    <table class="table">
      <thead><tr>
        <th>Foto</th><th>Nome</th><th>Login</th><th>Perfil</th><th>Status</th><th>Data de Cadastro</th><th>Ações</th>
      </tr></thead>
      <tbody>
        ${lista.length === 0
          ? `<tr><td colspan="7" style="text-align:center;color:var(--gray-400);padding:32px">Nenhum usuário encontrado</td></tr>`
          : lista.map((u, i) => `
            <tr>
              <td>${u.foto
                ? `<img src="${u.foto}?t=${Date.now()}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid var(--gray-200)" />`
                : avatarHtml(u.nome, 'avatar-sm', i)}</td>
              <td style="font-weight:500">${u.nome}</td>
              <td class="text-gray">${u.usuario}</td>
              <td><span class="badge ${roleColor[u.role]||'badge-gray'}">${roles[u.role]||u.role}</span></td>
              <td>${u.ativo ? '<span class="badge badge-green">Ativo</span>' : '<span class="badge badge-gray">Inativo</span>'}</td>
              <td class="text-gray">${u.data_cadastro ? formatDate(u.data_cadastro) : '—'}</td>
              <td>
                <div style="display:flex;gap:6px">
                  <button class="btn-icon-sm btn-icon-edit" onclick="abrirCadastroUsuario(${u.id})" title="Editar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="btn-icon-sm btn-icon-delete" onclick="confirmarDesativarUsuario(${u.id},'${u.nome}')" title="${u.ativo?'Desativar':'Reativar'}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                  </button>
                </div>
              </td>
            </tr>`).join('')}
      </tbody>
    </table>`;
}

// ── Tela de cadastro / edição (substitui a aba inteira) ──
function abrirCadastroUsuario(id) {
  _fotoSelecionada = null;
  // Atualizar título da topbar
  const topTitle = document.getElementById('pageTitle');
  if (topTitle) topTitle.textContent = id ? 'Editar Usuário' : 'Cadastro de Usuário';

  _usuarioEditando = id ? _usuarios.find(u => u.id === id) : null;
  const isEdicao   = !!_usuarioEditando;
  const u          = _usuarioEditando || {};
  const permsAtivas = isEdicao ? (u.permissoes || []) : PERMISSOES_LISTA.map(p => p.key);

  const area = document.getElementById('usuariosArea');
  const fotoSalva = isEdicao && u.foto ? u.foto : null;
  area.innerHTML = `
    <h1 style="font-family:var(--font-display);font-size:1.6rem;font-weight:600;margin-bottom:8px">
      ${isEdicao ? 'Editar Usuário' : 'Cadastro de Usuário'}
    </h1>

    <!-- Breadcrumb -->
    <div class="u-breadcrumb" style="margin-bottom:24px">
      <span onclick="voltarListaUsuarios()" style="cursor:pointer;color:var(--gray-500)">Configurações</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg>
      <span onclick="voltarListaUsuarios()" style="cursor:pointer;color:var(--gray-500)">Usuários</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg>
      <span style="color:var(--primary);font-weight:500">${isEdicao ? 'Editar Usuário' : 'Novo Usuário'}</span>
    </div>

    <div class="error-msg" id="uFormErro" style="display:none;margin-bottom:16px">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span id="uFormErroTxt"></span>
    </div>

    <div class="u-cadastro-grid">

      <!-- Card Dados do Usuário -->
      <div class="card u-dados-card">
        <div class="card-header">
          <div class="card-title" style="display:flex;align-items:center;gap:8px">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" width="18" height="18"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Dados do Usuário
          </div>
        </div>
        <div class="card-body">
          <div class="u-foto-area">
            <div class="u-foto-wrap">
              <div class="u-foto-avatar" id="uFotoPreview">
                ${fotoSalva
                  ? `<img src="${fotoSalva}?t=${Date.now()}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />`
                  : avatarHtml(u.nome||'?','',0)}
              </div>
              <button class="u-foto-btn" onclick="document.getElementById('uFotoInput').click()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                Alterar Foto
              </button>
              <input type="file" id="uFotoInput" accept="image/*" style="display:none" onchange="previewFoto(event)" />
              <p style="font-size:0.72rem;color:var(--gray-400);text-align:center;margin-top:6px">JPG, PNG ou GIF<br>Máx. 2MB</p>
            </div>

            <div class="u-campos-grid">
              <div class="form-group">
                <label class="form-label">Nome completo <span style="color:var(--danger)">*</span></label>
                <input type="text" id="uNome" class="form-control" placeholder="Digite o nome completo" value="${u.nome||''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Nome de usuário (login) <span style="color:var(--danger)">*</span></label>
                <input type="text" id="uLogin" class="form-control" placeholder="Digite o nome de usuário" value="${u.usuario||''}" />
              </div>
              <div class="form-group">
                <label class="form-label">E-mail <span style="color:var(--danger)">*</span></label>
                <input type="email" id="uEmail" class="form-control" placeholder="Digite o e-mail" value="${u.email||''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Telefone</label>
                <input type="tel" id="uTelefone" class="form-control" placeholder="(00) 00000-0000" value="${u.telefone||''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Senha ${isEdicao ? '' : '<span style="color:var(--danger)">*</span>'}</label>
                <div style="position:relative">
                  <input type="password" id="uSenha" class="form-control" placeholder="${isEdicao ? 'Deixe em branco para manter' : 'Digite a senha'}" style="padding-right:42px" />
                  <button type="button" onclick="toggleUSenha('uSenha','eyeUS1')" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--gray-400);display:flex">
                    <svg id="eyeUS1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Confirmar senha ${isEdicao ? '' : '<span style="color:var(--danger)">*</span>'}</label>
                <div style="position:relative">
                  <input type="password" id="uConfirmar" class="form-control" placeholder="Confirme a senha" style="padding-right:42px" />
                  <button type="button" onclick="toggleUSenha('uConfirmar','eyeUS2')" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--gray-400);display:flex">
                    <svg id="eyeUS2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Perfil de acesso <span style="color:var(--danger)">*</span></label>
                <select id="uRole" class="form-control">
                  <option value="">Selecione o perfil</option>
                  <option value="administrador" ${u.role==='administrador'?'selected':''}>Administrador</option>
                  <option value="gerente"       ${u.role==='gerente'?'selected':''}>Gerente</option>
                  <option value="recepcionista"  ${u.role==='recepcionista'?'selected':''}>Recepcionista</option>
                  <option value="profissional"   ${u.role==='profissional'?'selected':''}>Profissional</option>
                  <option value="caixa"          ${u.role==='caixa'?'selected':''}>Caixa</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Status <span style="color:var(--danger)">*</span></label>
                <select id="uAtivo" class="form-control">
                  <option value="true"  ${u.ativo!==false?'selected':''}>Ativo</option>
                  <option value="false" ${u.ativo===false?'selected':''}>Inativo</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Card Permissões -->
      <div class="card u-perms-card">
        <div class="card-header">
          <div class="card-title" style="display:flex;align-items:center;gap:8px">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" width="18" height="18"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Permissões de Acesso
          </div>
        </div>
        <div class="card-body">
          <div class="u-perms-lista">
            ${PERMISSOES_LISTA.map(p => `
              <label class="u-perm-item">
                <input type="checkbox" class="u-perm-check" value="${p.key}"
                  ${permsAtivas.includes(p.key) ? 'checked' : ''} />
                <span>${p.label}</span>
              </label>`).join('')}
          </div>
          <div style="display:flex;gap:16px;margin-top:16px;padding-top:14px;border-top:1px solid var(--gray-100)">
            <button class="u-perm-link" onclick="marcarTodasPerms(true)">Marcar todas</button>
            <button class="u-perm-link u-perm-link-off" onclick="marcarTodasPerms(false)">Desmarcar todas</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Botões de ação -->
    <div class="u-acoes-bar">
      <button class="btn btn-primary" id="btnSalvarU" onclick="salvarUsuario()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        Salvar Usuário
      </button>
      <button class="btn btn-outline" onclick="voltarListaUsuarios()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        Cancelar
      </button>
      <button class="btn btn-outline" onclick="limparFormU()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
        Limpar
      </button>
    </div>`;
}

function voltarListaUsuarios() {
  _usuarioEditando = null;
  navigateConfig('usuarios');
}

function previewFoto(event) {
  const file = event.target.files[0];
  if (!file) return;
  // Validar tamanho (máx 2MB)
  if (file.size > 2 * 1024 * 1024) {
    showToast('Arquivo muito grande. Máximo 2MB.', 'error');
    return;
  }
  _fotoSelecionada = file;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('uFotoPreview').innerHTML =
      `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />`;
  };
  reader.readAsDataURL(file);
}

function marcarTodasPerms(marcar) {
  document.querySelectorAll('.u-perm-check').forEach(cb => cb.checked = marcar);
}

function toggleUSenha(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon  = document.getElementById(iconId);
  if (!input) return;
  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';
  icon.innerHTML = isText
    ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
    : '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>';
}

function limparFormU() {
  ['uNome','uLogin','uEmail','uTelefone','uSenha','uConfirmar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('uRole').value  = '';
  document.getElementById('uAtivo').value = 'true';
  marcarTodasPerms(true);
  const erro = document.getElementById('uFormErro');
  if (erro) erro.style.display = 'none';
}

// Arquivo de foto selecionado
let _fotoSelecionada = null;

async function salvarUsuario() {
  const nome      = document.getElementById('uNome').value.trim();
  const login     = document.getElementById('uLogin').value.trim();
  const email     = document.getElementById('uEmail').value.trim();
  const telefone  = document.getElementById('uTelefone').value.trim();
  const role      = document.getElementById('uRole').value;
  const ativo     = document.getElementById('uAtivo').value === 'true';
  const senha     = document.getElementById('uSenha').value;
  const confirmar = document.getElementById('uConfirmar').value;
  const permissoes = [...document.querySelectorAll('.u-perm-check:checked')].map(cb => cb.value);
  const btn = document.getElementById('btnSalvarU');

  // Validações
  if (!nome || !login || !role) { mostrarErroU('Preencha nome, login e perfil.'); return; }
  if (!_usuarioEditando && !senha) { mostrarErroU('Informe uma senha para o novo usuário.'); return; }
  if (senha && senha.length < 8) { mostrarErroU('A senha deve ter no mínimo 8 caracteres.'); return; }
  if (senha && senha !== confirmar) { mostrarErroU('As senhas não coincidem.'); return; }

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner-sm"></div> Salvando...';

  try {
    const body = { nome, usuario: login, email, telefone, role, ativo, permissoes };
    let usuarioId = _usuarioEditando ? _usuarioEditando.id : null;

    if (_usuarioEditando) {
      const res = await fetch(`/api/usuarios/${_usuarioEditando.id}`, {
        method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); mostrarErroU(d.erro || 'Erro ao salvar.'); return; }
      if (senha) {
        await fetch(`/api/usuarios/${_usuarioEditando.id}/senha`, {
          method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ senha }),
        });
      }
    } else {
      const res = await fetch('/api/usuarios', {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({...body, senha}),
      });
      if (!res.ok) { const d = await res.json(); mostrarErroU(d.erro || 'Erro ao criar usuário.'); return; }
      const criado = await res.json();
      usuarioId = criado.id;
    }

    // Enviar foto se foi selecionada
    if (_fotoSelecionada && usuarioId) {
      const formData = new FormData();
      formData.append('foto', _fotoSelecionada);
      await fetch(`/api/usuarios/${usuarioId}/foto`, {
        method: 'POST',
        body: formData,
      });
    }

    showToast(_usuarioEditando ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!', 'success');
    _fotoSelecionada = null;
    await loadUsuarios();
    voltarListaUsuarios();
  } catch(e) {
    mostrarErroU('Erro de conexão. Tente novamente.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Salvar Usuário';
  }
}

function mostrarErroU(msg) {
  const el = document.getElementById('uFormErro');
  if (!el) return;
  document.getElementById('uFormErroTxt').textContent = msg;
  el.style.display = 'flex';
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function confirmarDesativarUsuario(id, nome) {
  const u = _usuarios.find(x => x.id === id);
  const acao = u && u.ativo ? 'desativar' : 'reativar';
  confirmDialog(`Deseja ${acao} o usuário <strong>${nome}</strong>?`, async () => {
    try {
      await fetch(`/api/usuarios/${id}`, {
        method: 'PUT', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ ativo: !(u && u.ativo) }),
      });
      showToast(`Usuário ${acao === 'desativar' ? 'desativado' : 'reativado'}!`, 'success');
      await loadUsuarios();
    } catch(e) { showToast('Erro ao atualizar usuário.', 'error'); }
  });
}

// Estilos do submenu de configurações (injetados dinamicamente)
(function() {
  const s = document.createElement('style');
  s.textContent = `
    .nav-item-parent { cursor:pointer; }
    .nav-submenu {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.25s ease;
      padding-left: 16px;
    }
    .nav-submenu.open { max-height: 300px; }
    .nav-subitem {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 12px;
      border-radius: var(--radius-md);
      color: rgba(255,255,255,0.5);
      font-size: 0.83rem;
      cursor: pointer;
      transition: all 0.15s;
      text-decoration: none;
      margin-bottom: 2px;
    }
    .nav-subitem:hover { color: white; background: rgba(255,255,255,0.06); }
    .nav-subitem.active { color: var(--primary-light); font-weight: 500; }
    .nav-subdot { font-size: 0.6rem; opacity: 0.6; }
  `;
  document.head.appendChild(s);
})();

// ── Tela de Perfis de Acesso ─────────────────────────────
const MODULOS = [
  { key:'dashboard',      label:'Dashboard',      icon:'▦' },
  { key:'agenda',         label:'Agenda',         icon:'📅' },
  { key:'clientes',       label:'Clientes',       icon:'👥' },
  { key:'servicos',       label:'Serviços',       icon:'✦' },
  { key:'profissionais',  label:'Profissionais',  icon:'👤' },
  { key:'atendimentos',   label:'Atendimentos',   icon:'📋' },
  { key:'pdv',            label:'PDV / Vendas',   icon:'🛒' },
  { key:'estoque',        label:'Estoque',        icon:'📦' },
  { key:'financeiro',     label:'Financeiro',     icon:'💰' },
  { key:'relatorios',     label:'Relatórios',     icon:'📊' },
  { key:'configuracoes',  label:'Configurações',  icon:'⚙️' },
];
const ACOES = ['visualizar','incluir','editar','excluir','imprimir','exportar'];

let _perfis        = [];
let _perfilSel     = null; // perfil selecionado na lista
let _perfilEditando = null;

async function loadPerfis() {
  try {
    const base = (typeof API_BASE !== 'undefined') ? API_BASE : '';
    const res = await fetch(base + '/api/perfis');
    if (!res.ok) throw new Error('Erro ' + res.status);
    _perfis = await res.json();
  } catch(e) {
    console.warn('Erro ao carregar perfis:', e);
    _perfis = [];
  }

  if (!_perfilSel && _perfis.length) _perfilSel = _perfis[0];

  const area = document.getElementById('perfisArea');
  if (!area) return;

  // Re-renderizar a área inteira com os dados carregados
  _perfisCarregados = true;
  renderPerfisAreaConteudo();
}

let _perfisCarregados = false;

function renderPerfisAreaConteudo() {
  const area = document.getElementById('perfisArea');
  if (!area) return;

  const iconesPerfil = { administrador:`<svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M12 2l2.4 4.8L20 8l-4 3.9.9 5.6L12 15l-4.9 2.5.9-5.6L4 8l5.6-.8z" fill="#f43f5e" stroke="#f43f5e" stroke-width="1.5" stroke-linejoin="round"/></svg>`, gerente:`<svg viewBox="0 0 24 24" fill="none" width="22" height="22"><rect x="2" y="7" width="20" height="14" rx="2" fill="#a855f7" opacity=".15"/><rect x="2" y="7" width="20" height="14" rx="2" stroke="#a855f7" stroke-width="1.5"/><path d="M8 7V5a4 4 0 018 0v2" stroke="#a855f7" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="14" r="2" fill="#a855f7"/></svg>`, recepcionista:`<svg viewBox="0 0 24 24" fill="none" width="22" height="22"><circle cx="12" cy="8" r="4" fill="#f59e0b" opacity=".2" stroke="#f59e0b" stroke-width="1.5"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round"/></svg>`, profissional:`<svg viewBox="0 0 24 24" fill="none" width="22" height="22"><circle cx="8" cy="8" r="3" fill="#ec4899" opacity=".2" stroke="#ec4899" stroke-width="1.5"/><circle cx="16" cy="8" r="3" fill="#ec4899" opacity=".2" stroke="#ec4899" stroke-width="1.5"/><path d="M12 12l-4 4 2 2 2-2 2 2 2-2z" fill="#ec4899" stroke="#ec4899" stroke-width="1" stroke-linejoin="round"/></svg>`, caixa:`<svg viewBox="0 0 24 24" fill="none" width="22" height="22"><rect x="2" y="6" width="20" height="14" rx="2" fill="#22c55e" opacity=".15" stroke="#22c55e" stroke-width="1.5"/><circle cx="12" cy="13" r="3" fill="#22c55e" opacity=".3" stroke="#22c55e" stroke-width="1.5"/><path d="M6 10h.01M18 10h.01" stroke="#22c55e" stroke-width="2" stroke-linecap="round"/></svg>` };
  const ACOES_V = ['visualizar','incluir','editar','excluir','imprimir','exportar'];
  const MODS = [
    {key:'dashboard',label:'Dashboard',icon:'▦'},{key:'agenda',label:'Agenda',icon:'📅'},
    {key:'clientes',label:'Clientes',icon:'👥'},{key:'servicos',label:'Serviços',icon:'✦'},
    {key:'profissionais',label:'Profissionais',icon:'👤'},{key:'atendimentos',label:'Atendimentos',icon:'📋'},
    {key:'pdv',label:'PDV / Vendas',icon:'🛒'},{key:'estoque',label:'Estoque',icon:'📦'},
    {key:'financeiro',label:'Financeiro',icon:'💰'},{key:'relatorios',label:'Relatórios',icon:'📊'},
    {key:'configuracoes',label:'Configurações',icon:'⚙️'},
  ];

  area.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div>
        <p style="font-size:0.8rem;color:var(--gray-400)">${_perfis.length} perfis cadastrados</p>
      </div>
      <button class="btn btn-primary" onclick="abrirNovoPerfil()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Novo Perfil
      </button>
    </div>

    <div class="perfis-layout">
      <div class="perfis-lista-wrap">
        <div class="card-header" style="padding:16px 20px;border-bottom:1px solid var(--gray-100)">
          <div class="card-title" style="display:flex;align-items:center;gap:8px">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" width="20" height="20"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            Perfis Cadastrados
          </div>
        </div>
        <div class="perfis-lista">
          ${_perfis.length === 0 ? '<p style="padding:20px;text-align:center;color:var(--gray-400)">Nenhum perfil</p>' :
          _perfis.map(p => {
            const isSel = _perfilSel && p.id === _perfilSel.id;
            const icon  = iconesPerfil[p.nome.toLowerCase()] || `<svg viewBox="0 0 24 24" fill="none" width="22" height="22"><circle cx="12" cy="8" r="4" fill="#6366f1" opacity=".2" stroke="#6366f1" stroke-width="1.5"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#6366f1" stroke-width="1.5" stroke-linecap="round"/></svg>`;
            return `
            <div class="perfil-item ${isSel ? 'ativo' : ''}" onclick="selecionarPerfil(${p.id})">
              <div class="perfil-item-icon">${icon}</div>
              <div class="perfil-item-info">
                <div class="perfil-item-nome">
                  ${p.nome}
                  ${p.padrao ? '<span class="badge badge-pink" style="font-size:0.65rem;padding:2px 8px">Padrão</span>' : ''}
                </div>
                <div class="perfil-item-desc">${p.descricao}</div>
              </div>
              <div class="perfil-item-menu" onclick="event.stopPropagation()">
                <button class="perfil-menu-btn" onclick="togglePerfilMenu(event,${p.id})" title="Opções">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                </button>
                <div class="perfil-dropdown" id="perfilMenu_${p.id}">
                  <button class="perfil-dropdown-item" onclick="closePerfilMenus();editarPerfil(${p.id})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Editar perfil
                  </button>
                  <button class="perfil-dropdown-item" onclick="closePerfilMenus();duplicarPerfil(${p.id})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                    Duplicar perfil
                  </button>
                  <button class="perfil-dropdown-item" onclick="closePerfilMenus();definirPadrao(${p.id})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    Definir como padrão
                  </button>
                  <button class="perfil-dropdown-item" onclick="closePerfilMenus();selecionarPerfil(${p.id})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    Visualizar permissões
                  </button>
                  ${!p.padrao ? `<button class="perfil-dropdown-item perfil-dropdown-danger" onclick="closePerfilMenus();confirmarExcluirPerfil(${p.id},'${p.nome}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                    Excluir perfil
                  </button>` : ''}
                </div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="card perfis-perms-wrap">
        <div class="card-header">
          <div class="card-title">
            Permissões do Perfil:
            <span style="color:var(--primary)" id="perfisPermsTitle">${_perfilSel ? _perfilSel.nome : '—'}</span>
          </div>
          ${_perfilSel ? `<button class="btn btn-outline" style="font-size:0.8rem;padding:6px 14px" onclick="editarPerfil(${_perfilSel.id})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar Permissões
          </button>` : ''}
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Módulo</th>
                ${ACOES_V.map(a => `<th style="text-align:center;text-transform:capitalize">${a.charAt(0).toUpperCase()+a.slice(1)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${_perfilSel ? MODS.map(m => {
                const perms = (_perfilSel.permissoes && _perfilSel.permissoes[m.key]) || {};
                return `<tr>
                  <td><span style="display:flex;align-items:center;gap:8px">${m.icon} ${m.label}</span></td>
                  ${ACOES_V.map(a => `<td style="text-align:center">
                    ${perms[a]
                      ? '<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>'
                      : '<svg viewBox="0 0 24 24" fill="none" stroke="#e4e4e7" stroke-width="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'}
                  </td>`).join('')}
                </tr>`;
              }).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--gray-400);padding:32px">Selecione um perfil</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:20px">
      <div class="card-header">
        <div class="card-title">Todos os Perfis</div>
        <div class="search-input">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Buscar perfil..." oninput="filtrarPerfis(this.value)" />
        </div>
      </div>
      <div class="table-wrap" id="perfisTabelaWrap">
        ${renderTabelaPerfis(_perfis)}
      </div>
    </div>

    <div class="perfil-form-modal" id="perfilFormModal" style="display:none">
      <div class="perfil-form-card">
        <div class="card-header">
          <div class="card-title" id="perfilFormTitulo">Novo Perfil</div>
          <button class="modal-close" onclick="fecharFormPerfil()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="card-body">
          <div class="error-msg" id="perfilFormErro" style="display:none;margin-bottom:16px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/></svg>
            <span id="perfilFormErroTxt"></span>
          </div>
          <div class="grid grid-2" style="margin-bottom:16px">
            <div class="form-group">
              <label class="form-label">Nome do perfil <span style="color:var(--danger)">*</span></label>
              <input type="text" id="pNome" class="form-control" placeholder="Ex: Gerente" />
            </div>
            <div class="form-group">
              <label class="form-label">Descrição</label>
              <input type="text" id="pDesc" class="form-control" placeholder="Breve descrição" />
            </div>
          </div>
          <div style="font-weight:600;font-size:0.85rem;color:var(--gray-700);margin-bottom:10px">Permissões por módulo</div>
          <div style="overflow-x:auto">
            <table class="table" style="font-size:0.82rem">
              <thead>
                <tr>
                  <th>Módulo</th>
                  ${ACOES_V.map(a => `<th style="text-align:center;min-width:80px">
                    ${a.charAt(0).toUpperCase()+a.slice(1)}
                    <br><button onclick="marcarColuna('${a}',true)" style="font-size:0.6rem;color:var(--primary);background:none;border:none;cursor:pointer">todos</button>
                  </th>`).join('')}
                </tr>
              </thead>
              <tbody id="perfilPermsTbody"></tbody>
            </table>
          </div>
          <div style="display:flex;gap:10px;margin-top:16px">
            <button class="btn btn-primary" id="btnSalvarPerfil" onclick="salvarPerfil()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              Salvar Perfil
            </button>
            <button class="btn btn-outline" onclick="fecharFormPerfil()">Cancelar</button>
          </div>
        </div>
      </div>
    </div>`;
}

// Atualiza só a tabela sem recriar tudo

function renderTabelaPerfis(lista) {
  if (!lista || !lista.length) return '<p style="text-align:center;color:var(--gray-400);padding:32px">Nenhum perfil encontrado</p>';
  return `<table class="table">
    <thead><tr>
      <th>Perfil</th><th>Descrição</th><th>Usuários</th><th>Status</th><th>Ações</th>
    </tr></thead>
    <tbody>
      ${lista.map(p => `<tr>
        <td style="font-weight:500">${p.nome} ${p.padrao ? '<span class="badge badge-pink" style="font-size:0.65rem">Padrão</span>' : ''}</td>
        <td class="text-gray">${p.descricao || ''}</td>
        <td>${p.total_usuarios ?? 0}</td>
        <td>${p.ativo ? '<span class="badge badge-green">Ativo</span>' : '<span class="badge badge-gray">Inativo</span>'}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn-icon-sm btn-icon-edit" onclick="editarPerfil(${p.id})" title="Editar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            ${!p.padrao ? `<button class="btn-icon-sm btn-icon-delete" onclick="confirmarExcluirPerfil(${p.id},'${p.nome}')" title="Excluir">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            </button>` : ''}
          </div>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function filtrarPerfis(termo) {
  const lista = termo ? _perfis.filter(p =>
    p.nome.toLowerCase().includes(termo.toLowerCase()) ||
    (p.descricao || '').toLowerCase().includes(termo.toLowerCase())
  ) : _perfis;
  const wrap = document.getElementById('perfisTabelaWrap');
  if (wrap) wrap.innerHTML = renderTabelaPerfis(lista);
}

function renderTabelaPerfis2() {
  const wrap = document.getElementById('perfisTabelaWrap');
  if (wrap) wrap.innerHTML = renderTabelaPerfis(_perfis);
}

// Atualiza só a lista lateral
function renderListaPerfis() {
  const lista = document.getElementById('perfisListaInner');
  if (!lista) return;
  const iconesPerfil = { administrador:`<svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M12 2l2.4 4.8L20 8l-4 3.9.9 5.6L12 15l-4.9 2.5.9-5.6L4 8l5.6-.8z" fill="#f43f5e" stroke="#f43f5e" stroke-width="1.5" stroke-linejoin="round"/></svg>`, gerente:`<svg viewBox="0 0 24 24" fill="none" width="22" height="22"><rect x="2" y="7" width="20" height="14" rx="2" fill="#a855f7" opacity=".15"/><rect x="2" y="7" width="20" height="14" rx="2" stroke="#a855f7" stroke-width="1.5"/><path d="M8 7V5a4 4 0 018 0v2" stroke="#a855f7" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="14" r="2" fill="#a855f7"/></svg>`, recepcionista:`<svg viewBox="0 0 24 24" fill="none" width="22" height="22"><circle cx="12" cy="8" r="4" fill="#f59e0b" opacity=".2" stroke="#f59e0b" stroke-width="1.5"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round"/></svg>`, profissional:`<svg viewBox="0 0 24 24" fill="none" width="22" height="22"><circle cx="8" cy="8" r="3" fill="#ec4899" opacity=".2" stroke="#ec4899" stroke-width="1.5"/><circle cx="16" cy="8" r="3" fill="#ec4899" opacity=".2" stroke="#ec4899" stroke-width="1.5"/><path d="M12 12l-4 4 2 2 2-2 2 2 2-2z" fill="#ec4899" stroke="#ec4899" stroke-width="1" stroke-linejoin="round"/></svg>`, caixa:`<svg viewBox="0 0 24 24" fill="none" width="22" height="22"><rect x="2" y="6" width="20" height="14" rx="2" fill="#22c55e" opacity=".15" stroke="#22c55e" stroke-width="1.5"/><circle cx="12" cy="13" r="3" fill="#22c55e" opacity=".3" stroke="#22c55e" stroke-width="1.5"/><path d="M6 10h.01M18 10h.01" stroke="#22c55e" stroke-width="2" stroke-linecap="round"/></svg>` };
  lista.innerHTML = _perfis.map(p => {
    const isSel = _perfilSel && p.id === _perfilSel.id;
    const icon  = iconesPerfil[p.nome.toLowerCase()] || `<svg viewBox="0 0 24 24" fill="none" width="22" height="22"><circle cx="12" cy="8" r="4" fill="#6366f1" opacity=".2" stroke="#6366f1" stroke-width="1.5"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#6366f1" stroke-width="1.5" stroke-linecap="round"/></svg>`;
    return `
    <div class="perfil-item ${isSel ? 'ativo' : ''}" onclick="selecionarPerfil(${p.id})">
      <div class="perfil-item-icon">${icon}</div>
      <div class="perfil-item-info">
        <div class="perfil-item-nome">
          ${p.nome}
          ${p.padrao ? '<span class="badge badge-pink" style="font-size:0.65rem;padding:2px 8px">Padrão</span>' : ''}
        </div>
        <div class="perfil-item-desc">${p.descricao}</div>
      </div>
      <div class="perfil-item-menu" onclick="event.stopPropagation()">
        <button class="perfil-menu-btn" onclick="togglePerfilMenu(event,${p.id})" title="Opções">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        </button>
        <div class="perfil-dropdown" id="perfilMenu_${p.id}">
          <button class="perfil-dropdown-item" onclick="closePerfilMenus();editarPerfil(${p.id})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar perfil
          </button>
          <button class="perfil-dropdown-item" onclick="closePerfilMenus();duplicarPerfil(${p.id})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            Duplicar perfil
          </button>
          <button class="perfil-dropdown-item" onclick="closePerfilMenus();definirPadrao(${p.id})" ${p.padrao ? 'disabled style="opacity:0.45"' : ''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            Definir como padrão ${p.padrao ? '(atual)' : ''}
          </button>
          <button class="perfil-dropdown-item" onclick="closePerfilMenus();selecionarPerfil(${p.id})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Visualizar permissões
          </button>
          ${!p.padrao ? `<button class="perfil-dropdown-item perfil-dropdown-danger" onclick="closePerfilMenus();confirmarExcluirPerfil(${p.id},'${p.nome}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            Excluir perfil
          </button>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

// Atualiza só a view de permissões
function renderPermissoesView() {
  const wrap = document.getElementById('perfisPermsView');
  if (!wrap || !_perfilSel) return;
  const ACOES = ['visualizar','incluir','editar','excluir','imprimir','exportar'];
  const MODULOS = [
    {key:'dashboard',label:'Dashboard',icon:'▦'},{key:'agenda',label:'Agenda',icon:'📅'},
    {key:'clientes',label:'Clientes',icon:'👥'},{key:'servicos',label:'Serviços',icon:'✦'},
    {key:'profissionais',label:'Profissionais',icon:'👤'},{key:'atendimentos',label:'Atendimentos',icon:'📋'},
    {key:'pdv',label:'PDV / Vendas',icon:'🛒'},{key:'estoque',label:'Estoque',icon:'📦'},
    {key:'financeiro',label:'Financeiro',icon:'💰'},{key:'relatorios',label:'Relatórios',icon:'📊'},
    {key:'configuracoes',label:'Configurações',icon:'⚙️'},
  ];
  wrap.innerHTML = MODULOS.map(m => {
    const perms = _perfilSel.permissoes[m.key] || {};
    return `<tr>
      <td><span style="display:flex;align-items:center;gap:8px">${m.icon} ${m.label}</span></td>
      ${ACOES.map(a => `<td style="text-align:center">
        ${perms[a]
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="#e4e4e7" stroke-width="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'}
      </td>`).join('')}
    </tr>`;
  }).join('');
}

function renderPerfisArea() {
  const area = document.getElementById('perfisArea');
  if (!area) return;
  _perfisCarregados = false;
  _perfilSel = null;
  // Mostrar loading e carregar da API
  area.innerHTML = '<div class="loading-box" style="padding:40px;text-align:center;color:var(--gray-400)">Carregando perfis...</div>';
  setTimeout(async () => { await loadPerfis(); }, 0);
}

/* ===========================
   BELEZZA — PAGE RENDERERS
=========================== */

/* ===================== DASHBOARD ===================== */

// ── Menu 3 pontinhos de perfil ────────────────────────────
function togglePerfilMenu(e, id) {
  e.stopPropagation();
  const menu = document.getElementById(`perfilMenu_${id}`);
  const isOpen = menu.classList.contains('show');
  closePerfilMenus();
  if (!isOpen) {
    const btn  = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    menu.style.top  = (rect.bottom + 4) + 'px';
    menu.style.left = (rect.right - 190) + 'px';
    menu.classList.add('show');
    setTimeout(() => {
      document.addEventListener('click', closePerfilMenus, { once: true });
    }, 0);
  }
}

function closePerfilMenus() {
  document.querySelectorAll('.perfil-dropdown.show').forEach(m => m.classList.remove('show'));
}

async function duplicarPerfil(id) {
  const p = _perfis.find(x => x.id === id);
  if (!p) return;
  try {
    const base = (typeof API_BASE !== 'undefined') ? API_BASE : '';
    const res = await fetch(base + '/api/perfis', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ nome: p.nome + ' (cópia)', descricao: p.descricao, permissoes: p.permissoes, ativo: true }),
    });
    if (!res.ok) throw new Error('Erro ao duplicar');
    showToast('Perfil duplicado!', 'success');
    await loadPerfis();
  } catch(e) { showToast(e.message, 'error'); }
}

async function definirPadrao(id) {
  try {
    const base = (typeof API_BASE !== 'undefined') ? API_BASE : '';
    for (const p of _perfis) {
      if (p.padrao && p.id !== id) {
        await fetch(`${base}/api/perfis/${p.id}`, {
          method: 'PUT', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ padrao: false }),
        });
      }
    }
    await fetch(`${base}/api/perfis/${id}`, {
      method: 'PUT', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ padrao: true }),
    });
    showToast('Perfil definido como padrão!', 'success');
    await loadPerfis();
  } catch(e) { showToast('Erro ao definir padrão', 'error'); }
}

function abrirNovoPerfil() {
  _perfilEditando = null;
  document.getElementById('perfilFormTitulo').textContent = 'Novo Perfil';
  document.getElementById('pNome').value = '';
  document.getElementById('pDesc').value = '';
  document.getElementById('perfilFormErro').style.display = 'none';
  renderPermsTbody({});
  document.getElementById('perfilFormModal').style.display = 'flex';
}

function editarPerfil(id) {
  _perfilEditando = _perfis.find(p => p.id === id);
  if (!_perfilEditando) return;
  document.getElementById('perfilFormTitulo').textContent = 'Editar Perfil';
  document.getElementById('pNome').value = _perfilEditando.nome;
  document.getElementById('pDesc').value = _perfilEditando.descricao || '';
  document.getElementById('perfilFormErro').style.display = 'none';
  renderPermsTbody(_perfilEditando.permissoes || {});
  document.getElementById('perfilFormModal').style.display = 'flex';
}

function fecharFormPerfil() {
  document.getElementById('perfilFormModal').style.display = 'none';
}

function renderPermsTbody(permsAtivas) {
  const tbody = document.getElementById('perfilPermsTbody');
  if (!tbody) return;
  const MODULOS_F = [
    {key:'dashboard',label:'Dashboard'},{key:'agenda',label:'Agenda'},
    {key:'clientes',label:'Clientes'},{key:'servicos',label:'Serviços'},
    {key:'profissionais',label:'Profissionais'},{key:'atendimentos',label:'Atendimentos'},
    {key:'pdv',label:'PDV / Vendas'},{key:'estoque',label:'Estoque'},
    {key:'financeiro',label:'Financeiro'},{key:'relatorios',label:'Relatórios'},
    {key:'configuracoes',label:'Configurações'},
  ];
  const ACOES_F = ['visualizar','incluir','editar','excluir','imprimir','exportar'];
  tbody.innerHTML = MODULOS_F.map(m => `
    <tr>
      <td><strong>${m.label}</strong></td>
      ${ACOES_F.map(a => `<td style="text-align:center">
        <input type="checkbox" class="perm-check" data-mod="${m.key}" data-acao="${a}"
          ${permsAtivas[m.key]?.[a] ? 'checked' : ''}
          style="width:16px;height:16px;accent-color:var(--primary);cursor:pointer" />
      </td>`).join('')}
    </tr>`).join('');
}

function marcarColuna(acao, valor) {
  document.querySelectorAll(`.perm-check[data-acao="${acao}"]`).forEach(cb => cb.checked = valor);
}

function coletarPermissoes() {
  const perms = {};
  document.querySelectorAll('.perm-check').forEach(cb => {
    const mod = cb.dataset.mod, acao = cb.dataset.acao;
    if (!perms[mod]) perms[mod] = {};
    perms[mod][acao] = cb.checked;
  });
  return perms;
}

async function salvarPerfil() {
  const nome  = document.getElementById('pNome').value.trim();
  const desc  = document.getElementById('pDesc').value.trim();
  const perms = coletarPermissoes();
  const btn   = document.getElementById('btnSalvarPerfil');
  if (!nome) {
    document.getElementById('perfilFormErroTxt').textContent = 'Informe o nome do perfil.';
    document.getElementById('perfilFormErro').style.display = 'flex';
    return;
  }
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner-sm"></div> Salvando...';
  try {
    const base = (typeof API_BASE !== 'undefined') ? API_BASE : '';
    const body = { nome, descricao: desc, permissoes: perms };
    if (_perfilEditando) {
      const res = await fetch(`${base}/api/perfis/${_perfilEditando.id}`, {
        method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).erro || 'Erro ao salvar');
      showToast('Perfil atualizado!', 'success');
    } else {
      const res = await fetch(base + '/api/perfis', {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).erro || 'Erro ao criar');
      showToast('Perfil criado!', 'success');
    }
    fecharFormPerfil();
    await loadPerfis();
  } catch(e) {
    document.getElementById('perfilFormErroTxt').textContent = e.message;
    document.getElementById('perfilFormErro').style.display = 'flex';
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Salvar Perfil';
  }
}

function confirmarExcluirPerfil(id, nome) {
  confirmDialog(`Deseja excluir o perfil <strong>${nome}</strong>?`, async () => {
    try {
      const base = (typeof API_BASE !== 'undefined') ? API_BASE : '';
      const res = await fetch(`${base}/api/perfis/${id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); showToast(d.erro || 'Erro', 'error'); return; }
      showToast('Perfil excluído!', 'success');
      if (_perfilSel?.id === id) _perfilSel = null;
      await loadPerfis();
    } catch(e) { showToast('Erro ao excluir', 'error'); }
  });
}

function selecionarPerfil(id) {
  _perfilSel = _perfis.find(p => p.id === id);
  renderPerfisAreaConteudo();
}

// ═══════════════════════════════════════════════════════
// TELA DE PERMISSÕES
// ═══════════════════════════════════════════════════════

const PERM_MODULOS = [
  { key:'dashboard',     label:'Dashboard',     desc:'Acesso ao painel principal',        icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>' },
  { key:'agenda',        label:'Agenda',        desc:'Agendamentos e horários',            icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' },
  { key:'clientes',      label:'Clientes',      desc:'Cadastro e consulta de clientes',   icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>' },
  { key:'servicos',      label:'Serviços',      desc:'Serviços e categorias',             icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></svg>' },
  { key:'profissionais', label:'Profissionais', desc:'Cadastro de profissionais',         icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' },
  { key:'atendimentos',  label:'Atendimentos',  desc:'Controle de atendimentos',          icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' },
  { key:'pdv',           label:'PDV / Vendas',  desc:'Vendas de produtos e serviços',    icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>' },
  { key:'estoque',       label:'Estoque',       desc:'Controle de estoque',               icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>' },
  { key:'financeiro',    label:'Financeiro',    desc:'Entradas, saídas e caixa',         icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>' },
  { key:'relatorios',    label:'Relatórios',    desc:'Relatórios e indicadores',          icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>' },
  { key:'configuracoes', label:'Configurações', desc:'Configurações do sistema',          icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14"/><path d="M4.93 4.93a10 10 0 000 14.14"/></svg>' },
];
const PERM_ACOES = ['visualizar','incluir','editar','excluir','imprimir','exportar'];
const PERM_ACOES_ICONS = {
  visualizar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  incluir:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
  editar:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/></svg>',
  excluir:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
  imprimir:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
  exportar:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
};

let _permPerfis    = [];
let _permPerfilSel = null;
let _permEditando  = false;
let _permOriginal  = {};

async function loadPermissoes() {
  const area = document.getElementById('permissoesArea');
  if (!area) return;
  try {
    const base = (typeof API_BASE !== 'undefined') ? API_BASE : '';
    const res = await fetch(base + '/api/perfis');
    _permPerfis = await res.json();
  } catch(e) { _permPerfis = []; }
  if (!_permPerfilSel && _permPerfis.length) _permPerfilSel = _permPerfis[0];
  renderPermissoesArea();
}

function renderPermissoesArea() {
  const area = document.getElementById('permissoesArea');
  if (!area) return;

  const perfilAtual = _permPerfilSel || {};
  const perms = perfilAtual.permissoes || {};

  // Resumo do perfil selecionado
  const modsPermitidos = PERM_MODULOS.filter(m => perms[m.key]?.visualizar);
  const modsNegados    = PERM_MODULOS.filter(m => !perms[m.key]?.visualizar);
  const resumo = modsPermitidos.length
    ? `Pode visualizar e acessar: ${modsPermitidos.map(m=>m.label).join(', ')}.`
    : 'Sem acesso a nenhum módulo.';
  const resumoNeg = modsNegados.length
    ? `Sem acesso a: ${modsNegados.map(m=>m.label).join(', ')}.`
    : '';

  area.innerHTML = `
    <!-- Header: seletor de perfil + resumo + ações -->
    <div class="perm-header-bar">
      <div class="perm-select-wrap">
        <div style="font-size:0.8rem;font-weight:600;color:var(--gray-600);margin-bottom:6px">Selecionar perfil</div>
        <div style="position:relative">
          <select class="form-control perm-select" onchange="selecionarPermPerfil(this.value)">
            ${_permPerfis.map(p => `<option value="${p.id}" ${perfilAtual.id === p.id ? 'selected' : ''}>${p.nome}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="perm-resumo-wrap">
        <div style="font-size:0.82rem;font-weight:600;color:var(--gray-700);margin-bottom:4px">Sobre o perfil selecionado</div>
        <div style="font-size:0.8rem;color:var(--gray-500)">${resumo}</div>
        ${resumoNeg ? `<div style="font-size:0.8rem;color:var(--gray-400);margin-top:2px">${resumoNeg}</div>` : ''}
      </div>
      <div class="perm-acoes-bar">
        <button class="btn btn-outline perm-btn-sm" onclick="permMarcarTodas(true)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
          Marcar todas
        </button>
        <button class="btn btn-outline perm-btn-sm" onclick="permMarcarTodas(false)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          Desmarcar todas
        </button>
        <button class="btn btn-primary" id="btnSalvarPerms" onclick="salvarPermissoes()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          Salvar permissões
        </button>
      </div>
    </div>

    <!-- Tabela de permissões -->
    <div class="card">
      <div class="table-wrap" style="overflow-x:auto">
        <table class="table perm-table">
          <thead>
            <tr>
              <th style="min-width:200px">Módulos do Sistema</th>
              ${PERM_ACOES.map(a => `<th style="text-align:center;min-width:100px">
                <div style="display:flex;align-items:center;justify-content:center;gap:5px">
                  ${PERM_ACOES_ICONS[a]}
                  ${a.charAt(0).toUpperCase()+a.slice(1)}
                </div>
              </th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${PERM_MODULOS.map(m => {
              const mp = perms[m.key] || {};
              // Verificar se o módulo está disponível para este perfil (baseado em lógica)
              return `<tr>
                <td>
                  <div style="display:flex;align-items:center;gap:10px">
                    <span style="color:var(--primary)">${m.icon}</span>
                    <div>
                      <div style="font-weight:600;font-size:0.875rem">${m.label}</div>
                      <div style="font-size:0.75rem;color:var(--gray-400)">${m.desc}</div>
                    </div>
                  </div>
                </td>
                ${PERM_ACOES.map(a => `
                  <td style="text-align:center">
                    <input type="checkbox" class="perm-cb" data-mod="${m.key}" data-acao="${a}"
                      ${mp[a] ? 'checked' : ''}
                      style="width:18px;height:18px;accent-color:var(--primary);cursor:pointer"
                      onchange="onPermChange()" />
                  </td>`).join('')}
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Legenda -->
    <div class="perm-legenda">
      <label style="display:flex;align-items:center;gap:6px;font-size:0.8rem;color:var(--gray-600)">
        <input type="checkbox" checked disabled style="accent-color:var(--primary);width:16px;height:16px" />
        Permissão concedida
      </label>
      <label style="display:flex;align-items:center;gap:6px;font-size:0.8rem;color:var(--gray-600)">
        <input type="checkbox" disabled style="width:16px;height:16px" />
        Permissão não concedida
      </label>
    </div>`;

  // Guardar estado original para detectar mudanças
  _permOriginal = JSON.stringify(coletarPermissoesPerm());
}

function selecionarPermPerfil(id) {
  _permPerfilSel = _permPerfis.find(p => p.id === parseInt(id));
  renderPermissoesArea();
}

function onPermChange() {
  const atual = JSON.stringify(coletarPermissoesPerm());
  const btn   = document.getElementById('btnSalvarPerms');
  if (btn) btn.classList.toggle('btn-primary-pulse', atual !== _permOriginal);
}

function permMarcarTodas(valor) {
  document.querySelectorAll('.perm-cb').forEach(cb => cb.checked = valor);
  onPermChange();
}

function coletarPermissoesPerm() {
  const perms = {};
  document.querySelectorAll('.perm-cb').forEach(cb => {
    const mod = cb.dataset.mod, acao = cb.dataset.acao;
    if (!perms[mod]) perms[mod] = {};
    perms[mod][acao] = cb.checked;
  });
  return perms;
}

async function salvarPermissoes() {
  if (!_permPerfilSel) return;
  const btn  = document.getElementById('btnSalvarPerms');
  const perms = coletarPermissoesPerm();
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner-sm"></div> Salvando...';
  try {
    const base = (typeof API_BASE !== 'undefined') ? API_BASE : '';
    const res = await fetch(`${base}/api/perfis/${_permPerfilSel.id}`, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ permissoes: perms }),
    });
    if (!res.ok) throw new Error('Erro ao salvar');
    const updated = await res.json();
    // Atualizar localmente
    const idx = _permPerfis.findIndex(p => p.id === _permPerfilSel.id);
    if (idx >= 0) _permPerfis[idx] = updated;
    _permPerfilSel = updated;
    _permOriginal  = JSON.stringify(perms);
    showToast('Permissões salvas com sucesso!', 'success');
    renderPermissoesArea();
  } catch(e) {
    showToast('Erro ao salvar permissões.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Salvar permissões';
  }
}

// ═══════════════════════════════════════════════════════
// FORMAS DE PAGAMENTO
// ═══════════════════════════════════════════════════════

let _formasPag     = [];
let _fpEditando    = null;
let _fpFormAberto  = false;

const FP_TIPOS = {
  dinheiro:      { label:'Dinheiro',      cor:'#22c55e', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>' },
  pix:           { label:'PIX',           cor:'#06b6d4', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>' },
  cartao:        { label:'Cartão',        cor:'#8b5cf6', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>' },
  transferencia: { label:'Transferência', cor:'#f59e0b', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>' },
  outros:        { label:'Outros',        cor:'#6b7280', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>' },
};

async function loadFormasPagamento() {
  const area = document.getElementById('formasPagArea');
  if (!area) return;
  try {
    const base = (typeof API_BASE !== 'undefined') ? API_BASE : '';
    const res  = await fetch(base + '/api/formas-pagamento');
    _formasPag = await res.json();
  } catch(e) { _formasPag = []; }
  renderFormasPagArea();
}

function renderFormasPagArea() {
  const area = document.getElementById('formasPagArea');
  if (!area) return;

  const total   = _formasPag.length;
  const ativas  = _formasPag.filter(f => f.ativo).length;
  const inativas= total - ativas;
  const taxas   = _formasPag.filter(f => f.tipo === 'cartao' && f.taxa > 0);
  const taxaMedia = taxas.length ? (taxas.reduce((s,f)=>s+f.taxa,0)/taxas.length).toFixed(2) : '0,00';

  area.innerHTML = `
    <!-- KPIs -->
    <div class="fp-kpis">
      <div class="fp-kpi">
        <div class="fp-kpi-icon" style="background:#fce7f3"><svg viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2" width="22" height="22"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></div>
        <div><div class="fp-kpi-val">${total}</div><div class="fp-kpi-lbl">Total de Formas</div><div class="fp-kpi-sub">cadastradas</div></div>
      </div>
      <div class="fp-kpi">
        <div class="fp-kpi-icon" style="background:#dcfce7"><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" width="22" height="22"><polyline points="20 6 9 17 4 12"/></svg></div>
        <div><div class="fp-kpi-val">${ativas}</div><div class="fp-kpi-lbl">Ativas</div><div class="fp-kpi-sub">formas</div></div>
      </div>
      <div class="fp-kpi">
        <div class="fp-kpi-icon" style="background:#fef9c3"><svg viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2" width="22" height="22"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg></div>
        <div><div class="fp-kpi-val">${inativas}</div><div class="fp-kpi-lbl">Inativas</div><div class="fp-kpi-sub">formas</div></div>
      </div>
      <div class="fp-kpi">
        <div class="fp-kpi-icon" style="background:#ede9fe"><svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" width="22" height="22"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></div>
        <div><div class="fp-kpi-val">${taxaMedia.replace('.',',')}%</div><div class="fp-kpi-lbl">Cartão (média taxa)</div><div class="fp-kpi-sub">taxa média</div></div>
      </div>
    </div>

    <div class="fp-layout" id="fpLayout">
      <!-- Tabela -->
      <div class="card fp-tabela-wrap">
        <div class="card-header">
          <div class="card-title">Formas de Pagamento Cadastradas</div>
          <button class="btn btn-primary" onclick="abrirFormFP()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nova Forma de Pagamento
          </button>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr>
              <th>Forma de Pagamento</th>
              <th>Tipo</th>
              <th style="text-align:center">Taxa (%)</th>
              <th style="text-align:center">Permite Parcelamento</th>
              <th style="text-align:center">Status</th>
              <th style="text-align:center">Ações</th>
            </tr></thead>
            <tbody>
              ${_formasPag.length === 0
                ? '<tr><td colspan="6" style="text-align:center;color:var(--gray-400);padding:32px">Nenhuma forma cadastrada</td></tr>'
                : _formasPag.map(fp => {
                    const t = FP_TIPOS[fp.tipo] || FP_TIPOS.outros;
                    return `<tr>
                      <td>
                        <div style="display:flex;align-items:center;gap:10px">
                          <div style="width:36px;height:36px;border-radius:10px;background:${t.cor}20;display:flex;align-items:center;justify-content:center;color:${t.cor}">${t.icon}</div>
                          <div>
                            <div style="font-weight:600;font-size:0.875rem">${fp.nome}</div>
                            <div style="font-size:0.75rem;color:var(--gray-400)">${fp.tipo === 'dinheiro' ? 'Pagamento em espécie' : fp.tipo === 'pix' ? 'Pagamento instantâneo' : fp.tipo === 'cartao' ? fp.parcelamento ? 'Crédito à vista ou parcelado' : 'Débito à vista' : fp.tipo === 'transferencia' ? 'TED / DOC' : 'Pagamento posterior'}</div>
                          </div>
                        </div>
                      </td>
                      <td><span class="badge" style="background:${t.cor}15;color:${t.cor};border:1px solid ${t.cor}30;font-size:0.75rem">${t.label}</span></td>
                      <td style="text-align:center;font-weight:500">${fp.taxa > 0 ? fp.taxa.toFixed(2).replace('.',',')+'%' : '0%'}</td>
                      <td style="text-align:center">
                        ${fp.parcelamento
                          ? `<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><span style="color:#22c55e;display:flex;align-items:center;gap:4px;font-size:0.8rem;font-weight:500"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>Sim</span><span style="font-size:0.72rem;color:var(--gray-400)">Até ${fp.max_parcelas}x</span></div>`
                          : `<span style="color:var(--danger);display:flex;align-items:center;justify-content:center;gap:4px;font-size:0.8rem;font-weight:500"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Não</span>`}
                      </td>
                      <td style="text-align:center">${fp.ativo ? '<span class="badge badge-green">Ativo</span>' : '<span class="badge badge-gray">Inativo</span>'}</td>
                      <td style="text-align:center">
                        <div style="display:flex;gap:6px;justify-content:center">
                          <button class="btn-icon-sm btn-icon-edit" onclick="editarFP(${fp.id})" title="Editar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button class="btn-icon-sm btn-icon-delete" onclick="confirmarExcluirFP(${fp.id},'${fp.nome}')" title="Excluir">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>`;
                  }).join('')}
            </tbody>
          </table>
        </div>
        <!-- Rodapé -->
        <div style="padding:12px 20px;font-size:0.8rem;color:var(--gray-400);border-top:1px solid var(--gray-100)">
          Mostrando 1 a ${_formasPag.length} de ${_formasPag.length} formas de pagamento
        </div>
      </div>

      <!-- Formulário lateral -->
      <div class="card fp-form-wrap" id="fpFormWrap" style="display:${_fpFormAberto ? '' : 'none'}">
        <div class="card-header">
          <div class="card-title" style="color:var(--primary)" id="fpFormTitulo">Nova Forma de Pagamento</div>
          <button class="modal-close" onclick="fecharFormFP()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="card-body">
          <div class="error-msg" id="fpFormErro" style="display:none;margin-bottom:12px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/></svg>
            <span id="fpFormErroTxt"></span>
          </div>

          <div class="form-group">
            <label class="form-label">Nome da Forma de Pagamento <span style="color:var(--danger)">*</span></label>
            <input type="text" id="fpNome" class="form-control" placeholder="Ex.: Cartão de Crédito" />
          </div>
          <div class="form-group">
            <label class="form-label">Tipo <span style="color:var(--danger)">*</span></label>
            <select id="fpTipo" class="form-control">
              <option value="">Selecione o tipo</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="pix">PIX</option>
              <option value="cartao">Cartão</option>
              <option value="transferencia">Transferência</option>
              <option value="outros">Outros</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Taxa da Operadora (%)</label>
            <div style="position:relative">
              <input type="number" id="fpTaxa" class="form-control" placeholder="Ex.: 3,50" step="0.01" min="0" style="padding-right:36px" />
              <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--gray-400);font-size:0.85rem">%</span>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" style="display:flex;align-items:center;justify-content:space-between">
              Permite parcelamento?
              <label class="toggle" style="margin:0">
                <input type="checkbox" id="fpParcelamento" onchange="toggleParcelamento()" />
                <span class="toggle-slider"></span>
              </label>
            </label>
          </div>
          <div class="form-group" id="fpMaxParcelasGrupo" style="display:none">
            <label class="form-label">Número máximo de parcelas</label>
            <select id="fpMaxParcelas" class="form-control">
              <option value="">Selecione</option>
              ${[2,3,4,5,6,7,8,9,10,11,12].map(n=>`<option value="${n}">${n}x</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Conta/Caixa de destino</label>
            <select id="fpConta" class="form-control">
              <option value="">Selecione a conta ou caixa</option>
              <option value="Caixa Principal">Caixa Principal</option>
              <option value="Conta Corrente">Conta Corrente</option>
              <option value="Conta Poupança">Conta Poupança</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Status <span style="color:var(--danger)">*</span></label>
            <select id="fpAtivo" class="form-control" style="color:var(--primary)">
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>

          <button class="btn btn-primary" style="width:100%;margin-top:8px" id="btnSalvarFP" onclick="salvarFP()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
            Salvar
          </button>
          <button class="btn btn-outline" style="width:100%;margin-top:8px" onclick="fecharFormFP()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Cancelar
          </button>
        </div>
      </div>
    </div>

    <!-- Sobre -->
    <div class="fp-sobre">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:24px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;color:var(--primary)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <strong>Sobre as Formas de Pagamento</strong>
          </div>
          <p style="font-size:0.82rem;color:var(--gray-600)">As formas de pagamento cadastradas serão utilizadas no PDV, atendimentos e financeiro.</p>
          <p style="font-size:0.82rem;color:var(--gray-600);margin-top:4px">As taxas informadas são utilizadas para cálculo do valor líquido recebido.</p>
        </div>
        <!-- Ilustração -->
        <svg width="110" height="90" viewBox="0 0 110 90" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;opacity:0.85">
          <!-- Cartão -->
          <rect x="4" y="20" width="68" height="44" rx="8" fill="#fce7f3" stroke="#f9a8d4" stroke-width="1.5"/>
          <rect x="4" y="30" width="68" height="10" fill="#f9a8d4" opacity="0.5"/>
          <rect x="12" y="46" width="20" height="4" rx="2" fill="#f472b6" opacity="0.6"/>
          <rect x="12" y="53" width="14" height="3" rx="1.5" fill="#f472b6" opacity="0.4"/>
          <rect x="44" y="46" width="20" height="4" rx="2" fill="#f472b6" opacity="0.6"/>
          <!-- Chip -->
          <rect x="12" y="36" width="12" height="9" rx="2" fill="#fbbf24" opacity="0.8"/>
          <line x1="15" y1="36" x2="15" y2="45" stroke="#f59e0b" stroke-width="0.8"/>
          <line x1="18" y1="36" x2="18" y2="45" stroke="#f59e0b" stroke-width="0.8"/>
          <line x1="12" y1="40" x2="24" y2="40" stroke="#f59e0b" stroke-width="0.8"/>
          <!-- Nota fiscal -->
          <rect x="58" y="10" width="46" height="66" rx="4" fill="white" stroke="#e9d5ff" stroke-width="1.5"/>
          <path d="M58 14a4 4 0 014-4h38v6H58V14z" fill="#f3e8ff"/>
          <rect x="66" y="24" width="30" height="3" rx="1.5" fill="#c084fc" opacity="0.5"/>
          <rect x="66" y="31" width="22" height="2.5" rx="1.25" fill="#e9d5ff"/>
          <rect x="66" y="37" width="26" height="2.5" rx="1.25" fill="#e9d5ff"/>
          <rect x="66" y="43" width="18" height="2.5" rx="1.25" fill="#e9d5ff"/>
          <rect x="66" y="49" width="24" height="2.5" rx="1.25" fill="#e9d5ff"/>
          <rect x="66" y="55" width="20" height="2.5" rx="1.25" fill="#e9d5ff"/>
          <rect x="62" y="65" width="38" height="3" rx="1.5" fill="#c084fc" opacity="0.4"/>
          <!-- Moeda -->
          <circle cx="28" cy="72" r="12" fill="#fef9c3" stroke="#fde047" stroke-width="1.5"/>
          <text x="28" y="77" text-anchor="middle" font-size="13" fill="#ca8a04" font-weight="bold" font-family="sans-serif">$</text>
        </svg>
      </div>
    </div>`;
}

function toggleParcelamento() {
  const cb  = document.getElementById('fpParcelamento');
  const grp = document.getElementById('fpMaxParcelasGrupo');
  if (grp) grp.style.display = cb.checked ? '' : 'none';
}

function abrirFormFP() {
  _fpEditando   = null;
  _fpFormAberto = true;
  document.getElementById('fpFormTitulo').textContent = 'Nova Forma de Pagamento';
  ['fpNome','fpTaxa'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  document.getElementById('fpTipo').value       = '';
  document.getElementById('fpAtivo').value      = 'true';
  document.getElementById('fpConta').value      = '';
  document.getElementById('fpParcelamento').checked = false;
  document.getElementById('fpMaxParcelasGrupo').style.display = 'none';
  document.getElementById('fpMaxParcelas').value = '';
  document.getElementById('fpFormErro').style.display = 'none';
  const wrap = document.getElementById('fpFormWrap');
  if (wrap) wrap.style.display = '';
  document.querySelector('.fp-layout')?.classList.add('form-aberto');
}

function editarFP(id) {
  const fp = _formasPag.find(x => x.id === id);
  if (!fp) return;
  _fpEditando   = fp;
  _fpFormAberto = true;
  document.getElementById('fpFormTitulo').textContent = 'Editar Forma de Pagamento';
  document.getElementById('fpNome').value           = fp.nome;
  document.getElementById('fpTipo').value           = fp.tipo;
  document.getElementById('fpTaxa').value           = fp.taxa;
  document.getElementById('fpAtivo').value          = fp.ativo ? 'true' : 'false';
  document.getElementById('fpConta').value          = fp.conta_destino || '';
  document.getElementById('fpParcelamento').checked = fp.parcelamento;
  document.getElementById('fpMaxParcelasGrupo').style.display = fp.parcelamento ? '' : 'none';
  document.getElementById('fpMaxParcelas').value    = fp.max_parcelas || '';
  document.getElementById('fpFormErro').style.display = 'none';
  const wrap = document.getElementById('fpFormWrap');
  if (wrap) wrap.style.display = '';
  const layout = document.getElementById('fpLayout');
  if (layout) layout.classList.add('form-aberto');
}

function fecharFormFP() {
  _fpFormAberto = false;
  const wrap = document.getElementById('fpFormWrap');
  if (wrap) wrap.style.display = 'none';
  const layout = document.getElementById('fpLayout');
  if (layout) layout.classList.remove('form-aberto');
}

async function salvarFP() {
  const nome       = document.getElementById('fpNome').value.trim();
  const tipo       = document.getElementById('fpTipo').value;
  const taxa       = parseFloat(document.getElementById('fpTaxa').value) || 0;
  const parc       = document.getElementById('fpParcelamento').checked;
  const maxParc    = parseInt(document.getElementById('fpMaxParcelas').value) || 1;
  const conta      = document.getElementById('fpConta').value;
  const ativo      = document.getElementById('fpAtivo').value === 'true';
  const btn        = document.getElementById('btnSalvarFP');

  if (!nome || !tipo) {
    document.getElementById('fpFormErroTxt').textContent = 'Preencha nome e tipo.';
    document.getElementById('fpFormErro').style.display = 'flex';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner-sm"></div> Salvando...';

  try {
    const base = (typeof API_BASE !== 'undefined') ? API_BASE : '';
    const body = { nome, tipo, taxa, parcelamento: parc, max_parcelas: maxParc, conta_destino: conta, ativo };
    if (_fpEditando) {
      await fetch(`${base}/api/formas-pagamento/${_fpEditando.id}`, {
        method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body),
      });
      showToast('Forma de pagamento atualizada!', 'success');
    } else {
      await fetch(base + '/api/formas-pagamento', {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body),
      });
      showToast('Forma de pagamento criada!', 'success');
    }
    fecharFormFP();
    await loadFormasPagamento();
  } catch(e) {
    document.getElementById('fpFormErroTxt').textContent = 'Erro ao salvar.';
    document.getElementById('fpFormErro').style.display = 'flex';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg> Salvar';
  }
}

function confirmarExcluirFP(id, nome) {
  confirmDialog(`Deseja excluir a forma de pagamento <strong>${nome}</strong>?`, async () => {
    try {
      const base = (typeof API_BASE !== 'undefined') ? API_BASE : '';
      await fetch(`${base}/api/formas-pagamento/${id}`, { method: 'DELETE' });
      showToast('Forma de pagamento excluída!', 'success');
      await loadFormasPagamento();
    } catch(e) { showToast('Erro ao excluir.', 'error'); }
  });
}
