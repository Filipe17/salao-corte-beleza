// ── Ano dinâmico ─────────────────────────────────────
document.getElementById('ano').textContent = new Date().getFullYear();

// ── API base ──────────────────────────────────────────
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : window.location.origin;

// ── Mostrar / ocultar senha ───────────────────────────
const pwInput  = document.getElementById('password');
const togglePw = document.getElementById('togglePw');
const eyeIcon  = document.getElementById('eyeIcon');

const eyeOpen   = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
const eyeClosed = `<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>`;

togglePw.addEventListener('click', () => {
  const isText = pwInput.type === 'text';
  pwInput.type = isText ? 'password' : 'text';
  eyeIcon.innerHTML = isText ? eyeOpen : eyeClosed;
});

// ── Enter nos campos ──────────────────────────────────
document.getElementById('username').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('password').focus();
});
document.getElementById('password').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

// ── Login ─────────────────────────────────────────────
async function doLogin() {
  const user = document.getElementById('username').value.trim();
  const pass = document.getElementById('password').value;
  const btn  = document.getElementById('btnLogin');
  const err  = document.getElementById('errorMsg');

  // Limpa estado anterior
  err.classList.remove('show');
  document.getElementById('username').classList.remove('error');
  document.getElementById('password').classList.remove('error');

  if (!user || !pass) {
    showError('Preencha usuário e senha.');
    if (!user) document.getElementById('username').classList.add('error');
    if (!pass) document.getElementById('password').classList.add('error');
    return;
  }

  // Loading state
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Entrando...';

  try {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: user, senha: pass }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.token)   sessionStorage.setItem('belezza_token', data.token);
      if (data.usuario) sessionStorage.setItem('belezza_user', JSON.stringify(data.usuario));
      window.location.href = '/';
    } else {
      const body = await res.json().catch(() => ({}));
      showError(body.erro || 'Usuário ou senha incorretos.');
      document.getElementById('username').classList.add('error');
      document.getElementById('password').classList.add('error');
    }
  } catch (e) {
    // Sem endpoint ainda — modo dev
    console.warn('Endpoint /api/login não encontrado — entrando sem autenticação.');
    window.location.href = '/';
  } finally {
    btn.disabled = false;
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
      </svg>
      Entrar no sistema`;
  }
}

// ── Erro ──────────────────────────────────────────────
function showError(msg) {
  document.getElementById('errorText').textContent = msg;
  document.getElementById('errorMsg').classList.add('show');
}

// ── Esqueci a senha ───────────────────────────────────
function showForgot(e) {
  e.preventDefault();
  alert('Entre em contato com o administrador para redefinir sua senha.');
}
