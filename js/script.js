/* ============================================================
   MEMÓRIAS DE UMA FAMÍLIA — JavaScript Principal
   Funcionalidades: tema, gênero, navegação, animações
   ============================================================ */


/* ─── 1. GERENCIAMENTO DE TEMA ──────────────────────────────── */

/**
 * Aplica o tema ao <html> e salva no localStorage
 * @param {'default'|'girl'|'boy'} theme
 */
function applyTheme(theme) {
  const root = document.documentElement;

  // Animação suave de transição
  root.style.transition = 'none';
  root.setAttribute('data-theme', theme === 'default' ? '' : theme);

  if (theme === 'default') {
    root.removeAttribute('data-theme');
  }

  localStorage.setItem('familyTheme', theme);
}

/**
 * Carrega o tema salvo ao iniciar a página
 */
function initTheme() {
  const saved = localStorage.getItem('familyTheme') || 'default';
  applyTheme(saved);

  // Sincroniza botões de gênero se existirem na página
  if (saved !== 'default') {
    const gender = saved; // 'girl' ou 'boy'
    updateBabyUI(gender);
    highlightGenderBtn(gender);
  }
}


/* ─── 2. SELEÇÃO DE GÊNERO DO BEBÊ ─────────────────────────── */

/**
 * Chamado pelos botões Menina / Menino
 * @param {'girl'|'boy'} gender
 */
function selectGender(gender) {
  applyTheme(gender);
  updateBabyUI(gender);
  highlightGenderBtn(gender);
}

/**
 * Atualiza textos e ícones relacionados ao bebê em toda a página
 */
function updateBabyUI(gender) {
  const isGirl = gender === 'girl';

  // Nome exibido
  const nameEls = document.querySelectorAll('[data-baby-name]');
  nameEls.forEach(el => {
    el.textContent = isGirl ? 'Darcy' : 'Ethan';
  });

  // Ícone do bebê
  const iconEls = document.querySelectorAll('[data-baby-icon]');
  iconEls.forEach(el => {
    el.textContent = isGirl ? '👧' : '👦';
  });

  // Placeholder text no círculo
  const phEls = document.querySelectorAll('[data-baby-ph]');
  phEls.forEach(el => {
    el.textContent = isGirl ? '🎀' : '⚓';
  });

  // Pronome / texto descritivo
  const descEls = document.querySelectorAll('[data-baby-pronoun]');
  descEls.forEach(el => {
    el.textContent = isGirl ? 'Menina' : 'Menino';
  });

  // Cor do badge/tag
  const badgeEls = document.querySelectorAll('[data-baby-badge]');
  badgeEls.forEach(el => {
    el.textContent = isGirl ? '🎀 Menina' : '⚓ Menino';
    el.style.color = isGirl ? '#e8739a' : '#5a9bd4';
  });
}

/**
 * Destaca o botão de gênero ativo
 */
function highlightGenderBtn(gender) {
  const girlBtns = document.querySelectorAll('.girl-btn');
  const boyBtns  = document.querySelectorAll('.boy-btn');

  girlBtns.forEach(btn => btn.classList.toggle('active', gender === 'girl'));
  boyBtns.forEach(btn => btn.classList.toggle('active', gender === 'boy'));
}


/* ─── 3. NAVEGAÇÃO MOBILE ───────────────────────────────────── */

function initNav() {
  const hamburger = document.querySelector('.nav-hamburger');
  const navLinks  = document.querySelector('.nav-links');

  if (!hamburger || !navLinks) return;

  hamburger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen);
  });

  // Fecha menu ao clicar em link
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.classList.remove('open');
    });
  });

  // Marca link ativo com base na página atual
  const current = window.location.pathname.split('/').pop() || 'index.html';
  navLinks.querySelectorAll('a').forEach(link => {
    if (link.getAttribute('href') === current) {
      link.classList.add('active');
    }
  });
}


/* ─── 4. OVERLAY DO BEBÊ (mobile tap) ──────────────────────── */

function initBabyOverlay() {
  const wrap = document.querySelector('.baby-photo-wrap');
  if (!wrap) return;

  // Em mobile (touch), toque abre/fecha overlay
  wrap.addEventListener('click', (e) => {
    if (e.target.closest('.gender-btn')) return; // clique no botão — deixa passar
    if (window.matchMedia('(hover: none)').matches) {
      wrap.classList.toggle('show-overlay');
    }
  });

  // Fecha overlay ao clicar fora
  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) {
      wrap.classList.remove('show-overlay');
    }
  });
}


/* ─── 5. ANIMAÇÕES AO ROLAR (Intersection Observer) ─────────── */

function initScrollAnimations() {
  const els = document.querySelectorAll('.anim-fade-up');
  if (!els.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animationPlayState = 'running';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  els.forEach(el => {
    el.style.animationPlayState = 'paused';
    observer.observe(el);
  });
}


/* ─── 6. LIGHTBOX DE GALERIA ────────────────────────────────── */

function initLightbox() {
  const lightbox  = document.getElementById('lightbox');
  const lbImg     = document.getElementById('lightbox-img');
  const lbClose   = document.getElementById('lightbox-close');
  if (!lightbox || !lbImg) return;

  // Abre lightbox ao clicar em imagem com src real
  document.querySelectorAll('[data-lightbox]').forEach(item => {
    item.addEventListener('click', () => {
      const src = item.getAttribute('data-lightbox');
      if (!src) return;
      lbImg.src = src;
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  });

  // Fecha lightbox
  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (lbClose) lbClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });
}


/* ─── 7. FILTROS DA GALERIA ─────────────────────────────────── */

function initGalleryFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const items      = document.querySelectorAll('.masonry-item');
  if (!filterBtns.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const category = btn.getAttribute('data-filter');

      items.forEach(item => {
        const cat = item.getAttribute('data-category') || 'all';
        if (category === 'all' || cat === category) {
          item.style.display = '';
          item.style.opacity = '1';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });
}


/* ─── 8. CURSOR CORAÇÃO ─────────────────────────────────────── */

function initHeartCursor() {
  // Só ativa em dispositivos com mouse real
  if (!window.matchMedia('(pointer: fine)').matches) return;

  const el = document.createElement('div');
  el.id = 'heart-cursor';
  el.setAttribute('aria-hidden', 'true');
  el.textContent = '♥';
  document.body.appendChild(el);

  let raf = null;
  let cx = -120, cy = -120;

  document.addEventListener('mousemove', (e) => {
    cx = e.clientX;
    cy = e.clientY;
    if (!raf) {
      raf = requestAnimationFrame(() => {
        el.style.left = cx + 'px';
        el.style.top  = cy + 'px';
        el.classList.add('visible');
        raf = null;
      });
    }
  });

  document.addEventListener('mouseleave', () => el.classList.remove('visible'));
  document.addEventListener('mouseenter', () => el.classList.add('visible'));
  document.addEventListener('mousedown',  () => el.classList.add('clicking'));
  document.addEventListener('mouseup',    () => el.classList.remove('clicking'));
}


/* ─── 9. INICIALIZAÇÃO ─────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNav();
  initBabyOverlay();
  initScrollAnimations();
  initLightbox();
  initGalleryFilters();
  initHeartCursor();
});


/* ═══════════════════════════════════════════════════════════════
   CONTAGEM REGRESSIVA DE ANIVERSÁRIO & ANIMAÇÃO ESPECIAL
   ═══════════════════════════════════════════════════════════════ */

/* ─── Utilitários de Data ───────────────────────────────────── */

/**
 * Retorna a próxima ocorrência do aniversário (este ano ou o próximo).
 * @param {number} day   - Dia (1-31)
 * @param {number} month - Mês (1-12)
 */
function getNextBirthday(day, month) {
  const now           = new Date();
  const year          = now.getFullYear();
  const todayStart    = new Date(year, now.getMonth(), now.getDate());
  const thisYearBday  = new Date(year, month - 1, day);
  return thisYearBday < todayStart
    ? new Date(year + 1, month - 1, day)
    : thisYearBday;
}

/**
 * Retorna true se hoje é o aniversário (ignora hora).
 */
function isBirthdayToday(day, month) {
  const now = new Date();
  return now.getDate() === day && (now.getMonth() + 1) === month;
}


/* ─── Contagem Regressiva ───────────────────────────────────── */

/**
 * Inicializa a contagem regressiva na página.
 * Se hoje for o aniversário, oculta a contagem e exibe a animação.
 * @param {number} day   - Dia do aniversário
 * @param {number} month - Mês do aniversário
 */
function initCountdown(day, month) {
  const section = document.getElementById('countdown-section');
  if (!section) return;

  if (isBirthdayToday(day, month)) {
    section.style.display = 'none';
    // Pequeno delay para a página terminar de renderizar
    setTimeout(showBirthdayAnimation, 900);
    return;
  }

  const MONTHS = [
    'janeiro','fevereiro','março','abril','maio','junho',
    'julho','agosto','setembro','outubro','novembro','dezembro'
  ];

  function tick() {
    const now    = new Date();
    const target = getNextBirthday(day, month);
    const diff   = target - now;

    if (diff <= 0) {
      clearInterval(timer);
      section.style.display = 'none';
      showBirthdayAnimation();
      return;
    }

    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000)  / 60000);
    const s = Math.floor((diff % 60000)    / 1000);

    const el = id => document.getElementById(id);
    if (el('cd-days'))    el('cd-days').textContent    = String(d).padStart(2, '0');
    if (el('cd-hours'))   el('cd-hours').textContent   = String(h).padStart(2, '0');
    if (el('cd-minutes')) el('cd-minutes').textContent = String(m).padStart(2, '0');
    if (el('cd-seconds')) el('cd-seconds').textContent = String(s).padStart(2, '0');

    const dateEl = document.getElementById('cd-next-date');
    if (dateEl) dateEl.textContent = `${day} de ${MONTHS[month - 1]}`;
  }

  tick();
  const timer = setInterval(tick, 1000);
}


/* ─── Animação de Aniversário ───────────────────────────────── */

let _heartParticles    = [];
let _floatingInterval  = null;

/**
 * Exibe o overlay de aniversário com animação de corações.
 */
function showBirthdayAnimation() {
  const overlay = document.getElementById('birthday-overlay');
  if (!overlay) return;

  overlay.classList.add('visible');
  launchFloatingHearts();

  // Desenha o contorno de coração após o overlay aparecer
  setTimeout(drawHeartOutline, 750);
}

/**
 * Fecha e limpa a animação de aniversário.
 * Chamado pelo botão "Obrigado ♥" no overlay.
 */
function closeBirthdayAnimation() {
  const overlay = document.getElementById('birthday-overlay');
  if (!overlay) return;

  overlay.style.opacity = '0';
  overlay.style.pointerEvents = 'none';

  // Remove partículas do contorno
  _heartParticles.forEach(el => el.remove());
  _heartParticles = [];

  // Para o fluxo de corações flutuantes
  if (_floatingInterval) {
    clearInterval(_floatingInterval);
    _floatingInterval = null;
  }
  document.querySelectorAll('.floating-heart').forEach(el => el.remove());

  setTimeout(() => {
    overlay.classList.remove('visible');
    overlay.style.opacity = '';
    overlay.style.pointerEvents = '';
  }, 1100);
}

/**
 * Lança corações flutuantes subindo pela tela (burst inicial + fluxo contínuo).
 */
function launchFloatingHearts() {
  const emojis = ['❤️','💕','💖','💗','💓','💝','🌸','✨','💫','🎀'];

  function spawnHeart() {
    const el = document.createElement('span');
    el.className = 'floating-heart';
    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    el.style.setProperty('--fh-left',  `${4 + Math.random() * 92}vw`);
    el.style.setProperty('--fh-size',  `${0.7 + Math.random() * 1.6}rem`);
    el.style.setProperty('--fh-dur',   `${3.5 + Math.random() * 4}s`);
    el.style.setProperty('--fh-rot',   `${-28 + Math.random() * 56}deg`);
    el.style.setProperty('--fh-delay', `${Math.random() * 0.2}s`);
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 9000);
  }

  // Burst inicial: 50 corações escalonados
  for (let i = 0; i < 50; i++) {
    setTimeout(spawnHeart, i * 85);
  }

  // Fluxo contínuo suave
  _floatingInterval = setInterval(spawnHeart, 470);
}

/**
 * Desenha 22 corações dispostos em formato de coração ao redor do card central.
 * Usa a equação paramétrica: x = 16sin³(t), y = -(13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t))
 */
function drawHeartOutline() {
  const count = 22;
  // Raio proporcional à tela, máx 195px
  const scale = Math.min(window.innerWidth * 0.25, 195);
  const cx    = window.innerWidth  / 2;
  // Centraliza levemente acima do centro para compensar o card
  const cy    = window.innerHeight / 2;

  for (let i = 0; i < count; i++) {
    const t  = (i / count) * Math.PI * 2;
    // Coordenadas paramétricas (normalizadas para ±1)
    const px = 16 * Math.pow(Math.sin(t), 3);
    const py = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));

    const el = document.createElement('span');
    el.className = 'heart-particle';
    el.textContent = '❤️';
    el.style.left = `${cx + (px / 17) * scale}px`;
    el.style.top  = `${cy + (py / 17) * scale}px`;
    document.body.appendChild(el);
    _heartParticles.push(el);

    // Aparece escalonado — dá a ilusão de "desenhar" o coração
    setTimeout(() => el.classList.add('show'), i * 65);
  }
}
