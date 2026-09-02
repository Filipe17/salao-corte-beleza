/* ===========================
   BELEZZA — PAGE RENDERERS
=========================== */

/* ===================== DASHBOARD ===================== */
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
let agendaView = 'day';
let agendaDate = new Date();

function renderAgenda() {
  const dateStr = agendaDate.toLocaleDateString('pt-BR', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  const hours = ['08','09','10','11','12','13','14','15','16','17','18'];
  const dayStr = agendaDate.toISOString().slice(0,10);
  const dayApts = DB.agendamentos.filter(a => a.data === dayStr);

  const timeSlots = hours.map(h => {
    const slotApts = dayApts.filter(a => a.hora.startsWith(h));
    const apptBlocks = slotApts.map(a => {
      const cli = getCliente(a.clienteId);
      const serv = getServico(a.servicoId);
      const topPx = (parseInt(a.hora.split(':')[1]) / 60) * 60;
      const heightPx = (a.duracao / 60) * 60 - 2;
      return `<div class="appointment-block ${a.status}" style="top:${topPx}px;height:${heightPx}px" onclick="openAppointmentDetail(${a.id})">
        <div class="appt-client">${cli?.nome?.split(' ')[0] || ''} ${cli?.nome?.split(' ')[1] || ''}</div>
        <div class="appt-service">${serv?.nome || ''}</div>
      </div>`;
    }).join('');
    return `
      <div class="time-slot">${h}:00</div>
      <div class="agenda-slot" style="position:relative">${apptBlocks}</div>`;
  }).join('');

  return `
  <div class="page-header">
    <div class="page-header-left">
      <h1>Agenda</h1>
      <p>Gerencie os agendamentos do salão</p>
    </div>
    <div class="page-header-right">
      <button class="btn btn-primary" onclick="openNewAppointment()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Novo agendamento
      </button>
    </div>
  </div>

  <div class="agenda-toolbar">
    <div class="agenda-nav">
      <button class="agenda-nav-btn" onclick="agendaBack()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <span class="agenda-date-label">${dateStr}</span>
      <button class="agenda-nav-btn" onclick="agendaNext()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <button class="btn btn-sm btn-outline" onclick="agendaToday()">Hoje</button>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
      <div style="display:flex;gap:8px;font-size:.78rem">
        <span class="badge badge-purple">Confirmado</span>
        <span class="badge badge-amber">Pendente</span>
        <span class="badge badge-green">Finalizado</span>
        <span class="badge badge-gray">Cancelado</span>
      </div>
      <div class="view-toggle">
        <button class="view-toggle-btn ${agendaView==='day'?'active':''}" onclick="setAgendaView('day')">Dia</button>
        <button class="view-toggle-btn ${agendaView==='week'?'active':''}" onclick="setAgendaView('week')">Semana</button>
        <button class="view-toggle-btn ${agendaView==='month'?'active':''}" onclick="setAgendaView('month')">Mês</button>
      </div>
    </div>
  </div>

  <div class="agenda-day">
    <div class="time-col">
      <div class="time-slot"></div>
      ${timeSlots.split('\n').filter(l=>l.includes('time-slot')).join('')}
    </div>
    <div class="agenda-col">
      ${hours.map(h => {
        const slotApts = dayApts.filter(a => a.hora.startsWith(h));
        const apptBlocks = slotApts.map(a => {
          const cli = getCliente(a.clienteId);
          const serv = getServico(a.servicoId);
          const topPx = (parseInt(a.hora.split(':')[1]) / 60) * 60;
          const heightPx = Math.max((a.duracao / 60) * 60 - 2, 24);
          return `<div class="appointment-block ${a.status}" style="top:${topPx}px;height:${heightPx}px" onclick="openAppointmentDetail(${a.id})">
            <div class="appt-client">${cli?.nome?.split(' ').slice(0,2).join(' ') || ''}</div>
            <div class="appt-service">${serv?.nome || ''} — ${formatCurrency(a.valor)}</div>
          </div>`;
        }).join('');
        return `<div class="agenda-slot" style="position:relative">${apptBlocks}</div>`;
      }).join('')}
    </div>
  </div>`;
}

function agendaBack() {
  agendaDate.setDate(agendaDate.getDate() - 1);
  navigate('agenda');
}
function agendaNext() {
  agendaDate.setDate(agendaDate.getDate() + 1);
  navigate('agenda');
}
function agendaToday() { agendaDate = new Date(); navigate('agenda'); }
function setAgendaView(v) { agendaView = v; navigate('agenda'); }

function openAppointmentDetail(id) {
  const a = DB.agendamentos.find(x => x.id === id);
  if (!a) return;
  const cli = getCliente(a.clienteId);
  const pro = getProfissional(a.proId);
  const serv = getServico(a.servicoId);
  openModal({
    title: 'Detalhe do Agendamento',
    body: `
      <div style="display:flex;gap:16px;margin-bottom:16px">
        ${avatarHtml(cli?.nome,'avatar-lg',a.clienteId)}
        <div>
          <div style="font-weight:600;font-size:1rem">${cli?.nome}</div>
          <div style="color:var(--gray-500);font-size:.85rem">${cli?.telefone}</div>
        </div>
      </div>
      <div class="grid grid-2" style="gap:10px;margin-bottom:16px">
        <div class="card" style="padding:12px 16px">
          <div class="text-xs text-gray">Serviço</div>
          <div style="font-weight:600;margin-top:4px">${serv?.nome}</div>
        </div>
        <div class="card" style="padding:12px 16px">
          <div class="text-xs text-gray">Profissional</div>
          <div style="font-weight:600;margin-top:4px">${pro?.nome}</div>
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
      <button class="btn btn-success" onclick="finalizeAppointment(${id})">Finalizar</button>
      <button class="btn btn-danger" onclick="cancelAppointment(${id})">Cancelar</button>`
  });
}

function finalizeAppointment(id) {
  const a = DB.agendamentos.find(x=>x.id===id);
  if (a) { a.status = 'finalizado'; closeModal(); showToast('Atendimento finalizado!','success'); navigate('agenda'); }
}
function cancelAppointment(id) {
  closeModal();
  confirmDialog('Deseja cancelar este agendamento?', () => {
    const a = DB.agendamentos.find(x=>x.id===id);
    if (a) { a.status = 'cancelado'; showToast('Agendamento cancelado','warning'); navigate('agenda'); }
  });
}

function openNewAppointment() {
  const clientesOptions = DB.clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
  const proOptions = DB.profissionais.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
  const servOptions = DB.servicos.filter(s=>s.ativo).map(s => `<option value="${s.id}">${s.nome} — ${formatCurrency(s.preco)}</option>`).join('');
  openModal({
    title: 'Novo Agendamento',
    body: `
      <div class="form-group"><label class="form-label">Cliente</label>
        <select class="form-control" id="na_cli"><option value="">Selecionar...</option>${clientesOptions}</select></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Data</label>
          <input type="date" class="form-control" id="na_data" value="${today()}"></div>
        <div class="form-group"><label class="form-label">Horário</label>
          <input type="time" class="form-control" id="na_hora" value="09:00"></div>
      </div>
      <div class="form-group"><label class="form-label">Serviço</label>
        <select class="form-control" id="na_serv"><option value="">Selecionar...</option>${servOptions}</select></div>
      <div class="form-group"><label class="form-label">Profissional</label>
        <select class="form-control" id="na_pro"><option value="">Selecionar...</option>${proOptions}</select></div>
      <div class="form-group"><label class="form-label">Observações</label>
        <textarea class="form-control" id="na_obs" rows="2" placeholder="Alguma observação?"></textarea></div>`,
    footer: `
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveNewAppointment()">Agendar</button>`
  });
}

function saveNewAppointment() {
  const cliId = parseInt(document.getElementById('na_cli').value);
  const proId = parseInt(document.getElementById('na_pro').value);
  const servId = parseInt(document.getElementById('na_serv').value);
  const data = document.getElementById('na_data').value;
  const hora = document.getElementById('na_hora').value;
  const obs = document.getElementById('na_obs').value;
  if (!cliId || !proId || !servId || !data || !hora) {
    showToast('Preencha todos os campos obrigatórios', 'error'); return;
  }
  const serv = getServico(servId);
  DB.agendamentos.push({
    id: generateId(DB.agendamentos), clienteId:cliId, proId, servicoId:servId,
    data, hora, duracao:serv.duracao, status:'confirmado', valor:serv.preco, obs
  });
  closeModal();
  showToast('Agendamento criado com sucesso!', 'success');
  navigate('agenda');
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
    <div class="page-header-left">
      <h1>Clientes</h1>
      <p>${DB.clientes.length} clientes cadastrados</p>
    </div>
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
    <div class="page-header-left"><h1>Serviços</h1><p>${DB.servicos.filter(s=>s.ativo).length} serviços ativos</p></div>
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
    <div class="page-header-left"><h1>Profissionais</h1><p>${DB.profissionais.length} profissionais cadastradas</p></div>
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
  <div class="page-header">
    <div class="page-header-left"><h1>PDV — Vendas</h1><p>Ponto de venda rápido</p></div>
  </div>

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
    <div class="page-header-left"><h1>Estoque</h1><p>${low.length} produtos abaixo do mínimo</p></div>
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
    <div class="page-header-left"><h1>Financeiro</h1><p>Controle de entradas e saídas</p></div>
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
    <div class="page-header-left"><h1>Relatórios</h1><p>Análise de desempenho do salão</p></div>
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
function renderAtendimento() {
  const pendentes = DB.agendamentos.filter(a=>a.status==='confirmado'&&a.data===today());
  const finalizados = DB.agendamentos.filter(a=>a.status==='finalizado');

  return `
  <div class="page-header">
    <div class="page-header-left"><h1>Atendimento</h1><p>Controle dos atendimentos do dia</p></div>
    <div class="page-header-right">
      <button class="btn btn-primary" onclick="openNewAppointment()">+ Novo agendamento</button>
    </div>
  </div>

  <div class="grid grid-2">
    <div class="card">
      <div class="card-header"><div class="card-title">Aguardando atendimento</div><span class="badge badge-amber">${pendentes.length}</span></div>
      <div class="card-body" style="padding-top:8px">
        ${pendentes.length ? pendentes.map(a=>{
          const cli = getCliente(a.clienteId);
          const serv = getServico(a.servicoId);
          const pro = getProfissional(a.proId);
          return `<div class="schedule-item" style="padding:12px 0">
            <span class="schedule-time">${a.hora}</span>
            <div class="schedule-info">
              <div class="schedule-name">${cli?.nome}</div>
              <div class="schedule-service">${serv?.nome} · ${pro?.nome?.split(' ')[0]}</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
              <strong style="color:var(--primary)">${formatCurrency(a.valor)}</strong>
              <button class="btn btn-sm btn-success" onclick="finalizeAppointment(${a.id});navigate('atendimento')">Finalizar</button>
            </div>
          </div>`;
        }).join('') : '<div class="empty-state" style="padding:24px"><p>Nenhum atendimento pendente</p></div>'}
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">Finalizados hoje</div><span class="badge badge-green">${finalizados.length}</span></div>
      <div class="card-body" style="padding-top:8px">
        ${finalizados.length ? finalizados.map(a=>{
          const cli = getCliente(a.clienteId);
          const serv = getServico(a.servicoId);
          return `<div class="schedule-item">
            <span class="schedule-time">${a.hora}</span>
            <div class="schedule-info">
              <div class="schedule-name">${cli?.nome}</div>
              <div class="schedule-service">${serv?.nome}</div>
            </div>
            <strong style="color:var(--success)">${formatCurrency(a.valor)}</strong>
          </div>`;
        }).join('') : '<div class="empty-state" style="padding:24px"><p>Nenhum atendimento finalizado</p></div>'}
      </div>
    </div>
  </div>`;
}

/* ===================== CONFIGURAÇÕES ===================== */
function renderConfiguracoes() {
  return `
  <div class="page-header">
    <div class="page-header-left"><h1>Configurações</h1><p>Gerencie as configurações do sistema</p></div>
    <div class="page-header-right"><button class="btn btn-primary" onclick="showToast('Configurações salvas!','success')">Salvar alterações</button></div>
  </div>

  <div class="grid grid-2">
    <div>
      <div class="card mb-20">
        <div class="card-header"><div class="card-title">Dados do Salão</div></div>
        <div class="card-body">
          <div class="form-group"><label class="form-label">Nome do salão</label><input type="text" class="form-control" value="Belezza Salão de Beleza"></div>
          <div class="form-group"><label class="form-label">Telefone</label><input type="tel" class="form-control" value="(11) 3456-7890"></div>
          <div class="form-group"><label class="form-label">Endereço</label><input type="text" class="form-control" value="Rua das Flores, 123 — São Paulo/SP"></div>
          <div class="form-group"><label class="form-label">CNPJ</label><input type="text" class="form-control" value="12.345.678/0001-90"></div>
          <div class="form-group"><label class="form-label">Instagram</label><input type="text" class="form-control" value="@belezza.salon"></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">WhatsApp</div></div>
        <div class="card-body">
          <div class="config-row">
            <div><div class="config-label">Confirmação automática</div><div class="config-desc">Enviar mensagem de confirmação 24h antes</div></div>
            <label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label>
          </div>
          <div class="config-row">
            <div><div class="config-label">Lembrete de retorno</div><div class="config-desc">Avisar clientes após 30 dias sem visita</div></div>
            <label class="toggle"><input type="checkbox"><span class="toggle-slider"></span></label>
          </div>
          <div class="form-group" style="margin-top:12px">
            <label class="form-label">Número do WhatsApp Business</label>
            <input type="tel" class="form-control" placeholder="(11) 99999-9999">
          </div>
        </div>
      </div>
    </div>

    <div>
      <div class="card mb-20">
        <div class="card-header"><div class="card-title">Horário de funcionamento</div></div>
        <div class="card-body">
          ${['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'].map((d,i)=>`
            <div class="config-row">
              <span class="config-label">${d}</span>
              <div style="display:flex;gap:8px;align-items:center">
                <input type="time" class="form-control" style="width:90px" value="${i<6?'08:00':''}">
                <span class="text-gray">às</span>
                <input type="time" class="form-control" style="width:90px" value="${i<5?'18:00':i===5?'16:00':''}">
                <label class="toggle"><input type="checkbox" ${i<6?'checked':''}><span class="toggle-slider"></span></label>
              </div>
            </div>`).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">Usuários do sistema</div></div>
        <div class="card-body">
          ${[
            {nome:'Admin',          email:'admin@belezza.com', role:'Gerente', ativo:true},
            {nome:'Camila Rocha',   email:'camila@belezza.com', role:'Profissional', ativo:true},
            {nome:'Larissa Dias',   email:'larissa@belezza.com', role:'Profissional', ativo:true},
          ].map((u,i)=>`
            <div class="config-row">
              <div style="display:flex;align-items:center;gap:10px">
                ${avatarHtml(u.nome,'avatar-sm',i)}
                <div><div class="config-label">${u.nome}</div><div class="config-desc">${u.email}</div></div>
              </div>
              <div style="display:flex;align-items:center;gap:8px">
                <span class="badge badge-gray">${u.role}</span>
                <label class="toggle"><input type="checkbox" ${u.ativo?'checked':''}><span class="toggle-slider"></span></label>
              </div>
            </div>`).join('')}
          <button class="btn btn-outline btn-sm" style="margin-top:12px" onclick="showToast('Em desenvolvimento','warning')">+ Adicionar usuário</button>
        </div>
      </div>
    </div>
  </div>`;
}
