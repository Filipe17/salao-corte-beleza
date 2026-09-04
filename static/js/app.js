/* ===========================
   BELEZZA — APP JS
   Router, Navigation, Init
=========================== */

const PAGES = {
  dashboard:      { title: 'Dashboard',       render: renderDashboard },
  agenda:         { title: 'Agenda',           render: renderAgenda },
  atendimento:    { title: 'Atendimento',      render: renderAtendimento },
  pdv:            { title: 'PDV / Vendas',     render: renderPDV },
  clientes:       { title: 'Clientes',         render: renderClientes },
  profissionais:  { title: 'Profissionais',    render: renderProfissionais },
  servicos:       { title: 'Serviços',         render: renderServicos },
  estoque:        { title: 'Estoque',          render: renderEstoque },
  financeiro:     { title: 'Financeiro',       render: renderFinanceiro },
  relatorios:     { title: 'Relatórios',       render: renderRelatorios },
  configuracoes:  { title: 'Configurações',    render: renderConfiguracoes },
};

let currentPage = 'dashboard';

function navigate(page) {
  const p = PAGES[page];
  if (!p) return;

  currentPage = page;

  // Update active nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  // Update page title
  document.getElementById('pageTitle').textContent = p.title;
  document.title = `${p.title} — Belezza`;

  // Render content
  const content = document.getElementById('pageContent');
  content.innerHTML = `<div class="page-fade">${p.render()}</div>`;
  content.scrollTop = 0;

  // Close sidebar on mobile
  if (window.innerWidth <= 768) closeSidebar();
}

// Sidebar toggle
function toggleSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const mainWrap = document.getElementById('mainContent');
  if (window.innerWidth > 768) {
    const collapsed = sidebar.classList.toggle('collapsed');
    if (mainWrap) mainWrap.classList.toggle('sidebar-collapsed', collapsed);
  } else {
    sidebar.classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('show');
  }
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

// Date display
function updateDate() {
  const el = document.getElementById('topbarDate');
  if (!el) return;
  const now = new Date();
  const opts = { weekday:'short', day:'numeric', month:'short' };
  el.textContent = now.toLocaleDateString('pt-BR', opts);
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  updateDate();
  setInterval(updateDate, 60000);

  // Nav clicks
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(el.dataset.page);
    });
  });

  // Menu toggle
  document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
  document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

  // Notification btn
  document.getElementById('notifBtn').addEventListener('click', () => {
    showToast('3 alertas: estoque baixo em 3 produtos', 'warning');
  });

  // Initial page — chamado pelo api.js após carregar dados
});

// Page fade animation
const style = document.createElement('style');
style.textContent = `
  .page-fade { animation: pageFadeIn 0.2s ease; }
  @keyframes pageFadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
`;
document.head.appendChild(style);
