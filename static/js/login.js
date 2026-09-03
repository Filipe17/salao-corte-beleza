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
      if (data.trocar_senha) {
        // Senha padrão — exige troca antes de entrar
        mostrarTrocarSenha(data.usuario.id);
        return;
      }
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

// ── Variável para guardar o id do usuário logado ──────
let _usuarioId = null;

// ── Mostrar painel de troca de senha ─────────────────
function mostrarTrocarSenha(usuarioId) {
  _usuarioId = usuarioId;
  document.getElementById('login-form-area').style.display = 'none';
  document.getElementById('trocarSenhaWrap').classList.add('ativo');

  // toggle nova senha
  const novaPw    = document.getElementById('novaSenha');
  const toggleNova = document.getElementById('toggleNova');
  const eyeNova   = document.getElementById('eyeNova');
  toggleNova.addEventListener('click', () => {
    const isText = novaPw.type === 'text';
    novaPw.type = isText ? 'password' : 'text';
    eyeNova.innerHTML = isText ? eyeOpen : eyeClosed;
  });

  // critérios em tempo real
  novaPw.addEventListener('input', () => atualizarCriterios(novaPw.value));

  // toggle confirmar senha
  const confirmPw      = document.getElementById('confirmarSenha');
  const toggleConfirmar = document.getElementById('toggleConfirmar');
  const eyeConfirmar   = document.getElementById('eyeConfirmar');
  toggleConfirmar.addEventListener('click', () => {
    const isText = confirmPw.type === 'text';
    confirmPw.type = isText ? 'password' : 'text';
    eyeConfirmar.innerHTML = isText ? eyeOpen : eyeClosed;
  });

  // Enter no campo confirmar dispara salvar
  confirmPw.addEventListener('keydown', e => {
    if (e.key === 'Enter') doTrocarSenha();
  });
}

// ── Salvar nova senha ─────────────────────────────────
async function doTrocarSenha() {
  const nova      = document.getElementById('novaSenha').value;
  const confirmar = document.getElementById('confirmarSenha').value;
  const btn       = document.getElementById('btnTrocar');
  const err       = document.getElementById('errorMsgTrocar');
  const suc       = document.getElementById('successMsgTrocar');

  err.classList.remove('show');
  suc.classList.remove('show');
  document.getElementById('novaSenha').classList.remove('error');
  document.getElementById('confirmarSenha').classList.remove('error');

  if (!nova || !confirmar) {
    showErrorTrocar('Preencha os dois campos.');
    if (!nova)      document.getElementById('novaSenha').classList.add('error');
    if (!confirmar) document.getElementById('confirmarSenha').classList.add('error');
    return;
  }
  if (!senhaForte(nova)) {
    showErrorTrocar('A senha deve conter maiúscula, minúscula, número, caractere especial e mínimo 8 caracteres.');
    document.getElementById('novaSenha').classList.add('error');
    return;
  }
  if (nova !== confirmar) {
    showErrorTrocar('As senhas não coincidem.');
    document.getElementById('confirmarSenha').classList.add('error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Salvando...';

  try {
    const res = await fetch(`${API_BASE}/api/usuarios/${_usuarioId}/senha`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha: nova }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.token)   sessionStorage.setItem('belezza_token', data.token);
      if (data.usuario) sessionStorage.setItem('belezza_user', JSON.stringify(data.usuario));
      suc.classList.add('show');
      setTimeout(() => { window.location.href = '/'; }, 1500);
    } else {
      const body = await res.json().catch(() => ({}));
      showErrorTrocar(body.erro || 'Erro ao salvar senha.');
    }
  } catch (e) {
    console.warn('Erro ao trocar senha:', e);
    showErrorTrocar('Erro de conexão. Tente novamente.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
      Salvar nova senha`;
  }
}

function showErrorTrocar(msg) {
  document.getElementById('errorTextTrocar').textContent = msg;
  document.getElementById('errorMsgTrocar').classList.add('show');
}

// ── Critérios de força de senha ───────────────────────
function atualizarCriterios(valor) {
  const criterios = {
    cMaiuscula: /[A-Z]/.test(valor),
    cMinuscula: /[a-z]/.test(valor),
    cNumero:    /[0-9]/.test(valor),
    cEspecial:  /[^A-Za-z0-9]/.test(valor),
    cTamanho:   valor.length >= 8,
  };

  // Mostrar/ocultar blocos
  const mostrar = valor.length > 0;
  document.getElementById('forcaWrap').classList.toggle('visivel', mostrar);
  document.getElementById('criterios').classList.toggle('visivel', mostrar);

  // Atualizar cada critério
  Object.entries(criterios).forEach(([id, ok]) => {
    const el   = document.getElementById(id);
    const icon = el.querySelector('.criterio-icon');
    el.classList.toggle('ok', ok);
    icon.textContent = ok ? '✓' : '○';
  });

  // Calcular pontuação (0-4)
  const pontos = Object.values(criterios).filter(Boolean).length;

  // Atualizar barra
  const wrap = document.getElementById('forcaWrap');
  wrap.className = 'forca-wrap visivel';

  const segs   = ['fSeg1','fSeg2','fSeg3','fSeg4'];
  const config = [
    { classe: '',            label: '',        ativos: 0 },
    { classe: 'forca-fraca', label: 'Fraca',   ativos: 1 },
    { classe: 'forca-media', label: 'Média',   ativos: 2 },
    { classe: 'forca-boa',   label: 'Boa',     ativos: 3 },
    { classe: 'forca-forte', label: 'Forte',   ativos: 4 },
  ];

  const cfg = config[pontos];
  if (cfg.classe) wrap.classList.add(cfg.classe);
  document.getElementById('forcaLabel').textContent = cfg.label;

  segs.forEach((id, i) => {
    document.getElementById(id).classList.toggle('ativo', i < cfg.ativos);
  });
}

// ── Checar se todos critérios estão ok ───────────────
function senhaForte(valor) {
  return (
    /[A-Z]/.test(valor) &&
    /[a-z]/.test(valor) &&
    /[0-9]/.test(valor) &&
    /[^A-Za-z0-9]/.test(valor) &&
    valor.length >= 8
  );
}
