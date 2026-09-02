/* ===========================
   BELEZZA — COMPONENTS JS
   Modal, Toast, Helpers
=========================== */

// ---- Toast ----
function showToast(msg, type = 'success', duration = 3000) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = {
    success: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error:   '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    warning: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${icons[type] || ''}<span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; setTimeout(() => el.remove(), 300); }, duration);
}

// ---- Modal ----
function openModal({ title, body, size = '', footer = '', onOpen }) {
  closeModal();
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.id = 'activeModal';

  backdrop.innerHTML = `
    <div class="modal ${size}">
      <div class="modal-header">
        <span class="modal-title">${title}</span>
        <button class="modal-close" onclick="closeModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
    </div>`;

  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
  document.body.appendChild(backdrop);
  if (onOpen) onOpen(backdrop);
}

function closeModal() {
  const m = document.getElementById('activeModal');
  if (m) m.remove();
}

// ---- Avatar ----
function avatarHtml(name, size = '', idx = 0) {
  const letter = name ? name[0].toUpperCase() : '?';
  const cls = `av-${idx % 5}`;
  return `<div class="avatar ${size} ${cls}">${letter}</div>`;
}

// ---- Confirm dialog ----
function confirmDialog(msg, onConfirm) {
  openModal({
    title: 'Confirmar ação',
    size: 'modal-sm',
    body: `<p style="color:var(--gray-600);font-size:.9rem">${msg}</p>`,
    footer: `
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-danger" id="confirmOkBtn">Confirmar</button>`,
    onOpen: (el) => {
      el.querySelector('#confirmOkBtn').onclick = () => { closeModal(); onConfirm(); };
    }
  });
}

// ---- Render status badge ----
function statusBadge(status) {
  const map = {
    confirmado: ['badge-purple','Confirmado'],
    pendente:   ['badge-amber', 'Pendente'],
    finalizado: ['badge-green', 'Finalizado'],
    cancelado:  ['badge-gray',  'Cancelado'],
    ativo:      ['badge-green', 'Ativo'],
    inativo:    ['badge-gray',  'Inativo'],
    ferias:     ['badge-amber', 'Férias'],
  };
  const [cls, lbl] = map[status] || ['badge-gray', status];
  return `<span class="badge ${cls}">${lbl}</span>`;
}

// ---- Payment badge ----
function pgBadge(forma) {
  const m = { pix:'badge-green', cartao:'badge-blue', dinheiro:'badge-amber', debito:'badge-purple', credito:'badge-pink' };
  const l = { pix:'PIX', cartao:'Cartão', dinheiro:'Dinheiro', debito:'Débito', credito:'Crédito' };
  return `<span class="badge ${m[forma]||'badge-gray'}">${l[forma]||forma}</span>`;
}

// ---- Donut mini chart ----
function donutChart(pct, color='#c026d3', size=56) {
  const r = (size/2)-6;
  const circ = 2*Math.PI*r;
  const dash = (pct/100)*circ;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--gray-100)" stroke-width="5"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="5"
      stroke-dasharray="${dash} ${circ}" stroke-linecap="round"/>
  </svg>`;
}

// ---- Search filter helper ----
function filterList(arr, term, fields) {
  if (!term) return arr;
  const t = term.toLowerCase();
  return arr.filter(item => fields.some(f => String(item[f]||'').toLowerCase().includes(t)));
}

// ---- Format hour ----
function formatHour(h) { return h; }
