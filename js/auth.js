// ================================================================
//  auth.js — Autenticação via Supabase
//  Modal de acesso, login/logout, estado de sessão
// ================================================================

(function () {
  'use strict';

  // ─── Injeção do HTML ────────────────────────────────────────────
  function injectAuthUI() {
    const modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'auth-title');
    modal.innerHTML = `
      <div class="adm-overlay" id="auth-overlay"></div>
      <div class="adm-box">
        <p class="adm-box-title" id="auth-title">Memórias de uma Família ♥</p>
        <p class="adm-box-sub" id="auth-sub">Como você quer acessar?</p>

        <div id="auth-role-section">
          <button class="adm-btn-secondary" id="auth-guest-btn">
            👁️ Visitante &mdash; apenas visualizar
          </button>
          <button class="adm-btn-primary" id="auth-family-btn">
            🔑 Família &mdash; entrar com conta
          </button>
        </div>

        <div id="auth-form-section" style="display:none; flex-direction:column; gap:12px;">
          <div class="adm-field">
            <label for="auth-email">Email</label>
            <input type="email" id="auth-email" placeholder="email@exemplo.com" autocomplete="email" />
          </div>
          <div class="adm-field">
            <label for="auth-password">Senha</label>
            <input type="password" id="auth-password" placeholder="••••••••" autocomplete="current-password" />
          </div>
          <div class="adm-error" id="auth-error"></div>
          <button class="adm-btn-primary" id="auth-login-btn">Entrar</button>
          <button class="adm-btn-secondary" id="auth-back-btn">← Voltar</button>
        </div>
      </div>
    `;
    document.body.insertBefore(modal, document.body.firstChild);

    // Barra de administração (abaixo da navbar)
    const bar = document.createElement('div');
    bar.id = 'adm-bar';
    bar.style.display = 'none';
    bar.innerHTML = `
      <span class="adm-bar-icon">✏️</span>
      <span class="adm-bar-label">Modo Família</span>
      <span class="adm-bar-email" id="adm-bar-email"></span>
      <button class="adm-bar-logout" id="adm-logout-btn" type="button">Sair</button>
    `;
    document.body.insertBefore(bar, document.body.firstChild);

    // Botão de cadeado (canto inferior direito)
    const lock = document.createElement('button');
    lock.id = 'adm-lock-btn';
    lock.type = 'button';
    lock.title = 'Entrar como família';
    lock.setAttribute('aria-label', 'Fazer login como membro da família');
    lock.textContent = '🔒';
    document.body.appendChild(lock);
  }

  // ─── Modal ──────────────────────────────────────────────────────
  function showModal() {
    document.getElementById('auth-modal').classList.add('active');
    showRoleSection();
  }

  function hideModal() {
    document.getElementById('auth-modal').classList.remove('active');
  }

  function showRoleSection() {
    const role = document.getElementById('auth-role-section');
    role.style.cssText = 'display:flex; flex-direction:column; gap:10px;';
    document.getElementById('auth-form-section').style.display = 'none';
    document.getElementById('auth-sub').textContent = 'Como você quer acessar?';
    clearError();
  }

  function showFormSection() {
    document.getElementById('auth-role-section').style.display = 'none';
    document.getElementById('auth-form-section').style.display = 'flex';
    document.getElementById('auth-sub').textContent = 'Entre com sua conta da família';
    document.getElementById('auth-email').focus();
    clearError();
  }

  function clearError() {
    const err = document.getElementById('auth-error');
    err.style.display = 'none';
    err.textContent = '';
  }

  function showError(msg) {
    const err = document.getElementById('auth-error');
    err.textContent = msg;
    err.style.display = 'block';
  }

  // ─── Aplica estado de login na UI ───────────────────────────────
  // Única fonte de verdade: localStorage. Chamado em toda troca de visibilidade.
  function applyLocalState() {
    const role = localStorage.getItem('familyRole');

    if (role === 'family') {
      onFamilyLoggedIn(localStorage.getItem('familyEmail') || '');
      hideModal();
    } else if (role === 'guest') {
      hideModal();
    } else {
      // Nenhum papel salvo → mostra modal de acesso
      const modal = document.getElementById('auth-modal');
      if (modal && !modal.classList.contains('active')) showModal();
    }
  }

  // ─── Estado pós-login ───────────────────────────────────────────
  function onFamilyLoggedIn(email) {
    const lock = document.getElementById('adm-lock-btn');
    if (lock) lock.style.display = 'none';

    const bar = document.getElementById('adm-bar');
    if (bar) {
      bar.style.display = 'flex';
      const emailEl = document.getElementById('adm-bar-email');
      if (emailEl) emailEl.textContent = email || localStorage.getItem('familyEmail') || '';
      document.body.classList.add('adm-bar-active');
    }

    if (typeof window.initEditor === 'function') window.initEditor();
  }

  // ─── Login via Supabase ─────────────────────────────────────────

  // Retorna true para erros que não devem ser re-tentados (ex: senha errada)
  function isAuthError(err) {
    const m = err?.message || '';
    return m.includes('Invalid login credentials')
        || m.includes('Email not confirmed')
        || m.includes('Too many requests')
        || m.includes('not authorized');
  }

  function loginErrorMsg(err) {
    const m = err?.message || '';
    if (m.includes('Invalid login credentials')) return 'Email ou senha incorretos.';
    if (m.includes('Email not confirmed'))       return 'Email não confirmado. Verifique sua caixa de entrada.';
    if (m.includes('Too many requests'))         return 'Muitas tentativas. Aguarde alguns minutos.';
    return null; // erro de rede → será tratado com retry
  }

  async function doLogin() {
    const email    = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const btn      = document.getElementById('auth-login-btn');

    if (!email || !password) { showError('Preencha email e senha.'); return; }

    // Verifica se o Supabase carregou (CDN pode falhar em redes lentas)
    if (!window.sbClient) {
      showError('Serviço indisponível. Recarregue a página e tente novamente.');
      return;
    }

    btn.disabled = true;
    clearError();

    const MAX_ATTEMPTS = 3;
    let lastErr = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      btn.textContent = attempt === 1 ? 'Entrando…' : `Tentando novamente (${attempt}/${MAX_ATTEMPTS})…`;

      try {
        const { data, error } = await window.sbClient.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const user = data.user;

        // Verifica role na tabela user_roles
        const { data: roleData, error: roleError } = await window.sbClient
          .from('user_roles')
          .select('role, display_name')
          .eq('user_id', user.id)
          .single();

        if (roleError || !roleData || roleData.role !== 'family') {
          await window.sbClient.auth.signOut({ scope: 'local' });
          showError('Acesso não autorizado. Conta não pertence à família.');
          btn.disabled = false;
          btn.textContent = 'Entrar';
          return;
        }

        const displayName = roleData.display_name || email;
        localStorage.setItem('familyRole', 'family');
        localStorage.setItem('familyEmail', email);
        localStorage.setItem('familyName', displayName);

        onFamilyLoggedIn(email);
        hideModal();
        btn.disabled = false;
        btn.textContent = 'Entrar';
        return; // sucesso

      } catch (err) {
        lastErr = err;

        // Erro de autenticação: não tenta de novo
        if (isAuthError(err)) {
          showError(loginErrorMsg(err) || 'Erro ao entrar.');
          btn.disabled = false;
          btn.textContent = 'Entrar';
          return;
        }

        // Erro de rede: espera e tenta de novo
        if (attempt < MAX_ATTEMPTS) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }

    // Esgotou todas as tentativas
    showError('Sem conexão com o servidor. Verifique sua internet e tente novamente.');
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }

  // ─── Verifica/renova sessão Supabase antes de salvar ────────────
  // Retorna true se há sessão válida, false se expirou de vez.
  window.ensureSbSession = async function () {
    if (!window.sbClient) return false;
    try {
      const { data: { session } } = await window.sbClient.auth.getSession();
      if (session) return true;
      // Tenta renovar via refresh token
      const { data: { session: renewed } } = await window.sbClient.auth.refreshSession();
      return !!renewed;
    } catch (e) {
      return false;
    }
  };

  // ─── Logout ─────────────────────────────────────────────────────
  async function doLogout() {
    if (window.sbClient) {
      // scope:'local' limpa só esta aba — não revoga o token dos outros dispositivos
      try { await window.sbClient.auth.signOut({ scope: 'local' }); } catch (e) { /* ignore */ }
    }

    localStorage.removeItem('familyRole');
    localStorage.removeItem('familyEmail');
    localStorage.removeItem('familyName');

    if (typeof window.deactivateEditor === 'function') window.deactivateEditor();

    const bar = document.getElementById('adm-bar');
    if (bar) bar.style.display = 'none';
    document.body.classList.remove('adm-bar-active');

    const lock = document.getElementById('adm-lock-btn');
    if (lock) lock.style.display = 'flex';

    showModal();
  }

  // ─── Inicialização ──────────────────────────────────────────────
  async function init() {
    injectAuthUI();

    // Eventos dos botões
    document.getElementById('auth-guest-btn').addEventListener('click', () => {
      localStorage.setItem('familyRole', 'guest');
      hideModal();
    });
    document.getElementById('auth-family-btn').addEventListener('click', showFormSection);
    document.getElementById('auth-back-btn').addEventListener('click', showRoleSection);
    document.getElementById('auth-login-btn').addEventListener('click', doLogin);
    document.getElementById('adm-lock-btn').addEventListener('click', showModal);
    document.getElementById('adm-logout-btn').addEventListener('click', doLogout);

    ['auth-email', 'auth-password'].forEach(id => {
      document.getElementById(id).addEventListener('keydown', e => {
        if (e.key === 'Enter') doLogin();
      });
    });

    // ── Aplica estado salvo imediatamente (sem esperar Supabase) ──
    // Isso garante que no mobile a UI seja restaurada instantaneamente
    // ao voltar à aba, sem depender de eventos de rede.
    applyLocalState();

    // ── Visibilidade: mobile suspende abas ao ir para o fundo ─────
    // Quando o usuário volta ao app, reaplica o estado do localStorage
    // e silenciosamente renova o token Supabase para que saves funcionem.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        applyLocalState();
        // Renova o JWT silenciosamente para que operações de escrita continuem
        if (window.sbClient && localStorage.getItem('familyRole') === 'family') {
          window.sbClient.auth.getSession().catch(() => {});
        }
      }
    });

    // ── Supabase Auth: apenas sincroniza localStorage se válido ───
    // NUNCA mostra o modal aqui — a UI é controlada só pelo localStorage.
    // Isso evita que eventos de rede (SIGNED_OUT por token expirado,
    // revalidação, etc.) derrubem a sessão no mobile.
    window.sbClient.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        try {
          const { data: roleData } = await window.sbClient
            .from('user_roles')
            .select('role, display_name')
            .eq('user_id', session.user.id)
            .single();

          if (roleData?.role === 'family') {
            // Atualiza localStorage com dados frescos do servidor
            localStorage.setItem('familyRole', 'family');
            localStorage.setItem('familyEmail', session.user.email);
            if (roleData.display_name) localStorage.setItem('familyName', roleData.display_name);
            onFamilyLoggedIn(session.user.email);
            hideModal();
          }
        } catch (e) {
          // Sem rede — mantém o que já está no localStorage, não faz nada
        }
      }

      // SIGNED_OUT e outros eventos são ignorados propositalmente:
      // o modal só aparece via applyLocalState() ou doLogout().
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
