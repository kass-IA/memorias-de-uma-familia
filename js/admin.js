/* ============================================================
   MEMÓRIAS DE UMA FAMÍLIA — Sistema Administrativo
   Login, edição de fotos, expansão da árvore, galeria
   ============================================================ */

(function () {
  'use strict';

  /* ─── Credenciais ─────────────────────────────────────────── */
  

  /* ─── Chaves localStorage / sessionStorage ────────────────── */
  const KEY_SESSION  = 'adminSession';
  const KEY_PHOTOS   = 'adminPhotos';
  const KEY_MEMBERS  = 'adminTreeMembers';
  const KEY_GALLERY  = 'adminGalleryPhotos';
  const KEY_TEXTS    = 'adminTreeTexts';

  /* ─── Helpers de autenticação ─────────────────────────────── */
  function isLoggedIn() {
    return sessionStorage.getItem(KEY_SESSION) === '1';
  }

  function doLogin(email, pass) {
    if (email === ADMIN_EMAIL && pass === ADMIN_PASS) {
      sessionStorage.setItem(KEY_SESSION, '1');
      return true;
    }
    return false;
  }

  function doLogout() {
    sessionStorage.removeItem(KEY_SESSION);
    location.reload();
  }

  /* ─── Detecção de página ──────────────────────────────────── */
  function currentPage() {
    const p = location.pathname.split('/').pop();
    return p || 'index.html';
  }

  /* ─── Redimensionar imagem via Canvas (base64) ───────────── */
  function resizeImage(file, maxW, maxH, quality, callback) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        let w = img.width, h = img.height;
        const ratio = Math.min(maxW / w, maxH / h);
        if (ratio < 1) { w = Math.round(w * ratio); h = Math.round(h * ratio); }
        const canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        callback(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  /* ─── Fotos salvas ────────────────────────────────────────── */
  function getSavedPhotos() {
    try { return JSON.parse(localStorage.getItem(KEY_PHOTOS) || '{}'); } catch { return {}; }
  }

  function savePhoto(key, base64) {
    const photos = getSavedPhotos();
    photos[key] = base64;
    try { localStorage.setItem(KEY_PHOTOS, JSON.stringify(photos)); } catch (e) {
      alert('Armazenamento cheio. Tente fotos menores ou remova algumas fotos salvas.');
    }
  }

  /* Aplica todas as fotos salvas aos elementos com data-photo-key */
  function applyAllSavedPhotos() {
    const photos = getSavedPhotos();
    Object.entries(photos).forEach(function ([key, src]) {
      document.querySelectorAll('[data-photo-key="' + key + '"]').forEach(function (el) {
        applyPhotoToElement(el, src);
      });
    });
  }

  function applyPhotoToElement(el, src) {
    if (el.tagName === 'IMG') {
      el.src = src;
    } else {
      /* container (.photo-circle ou .profile-photo-large) */
      let img = el.querySelector('img');
      if (!img) {
        /* Remove ícones de placeholder */
        el.querySelectorAll('.ph-icon, .ph-label, span:not(.admin-photo-overlay span):not(.admin-edit-tag)').forEach(function (s) { s.remove(); });
        img = document.createElement('img');
        img.alt = 'Foto';
        img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;';
        el.insertBefore(img, el.firstChild);
      }
      img.src = src;
    }
  }

  /* ─── Textos da árvore salvos ─────────────────────────────── */
  function getSavedTexts() {
    try { return JSON.parse(localStorage.getItem(KEY_TEXTS) || '{}'); } catch { return {}; }
  }

  function saveText(key, value) {
    const texts = getSavedTexts();
    texts[key] = value;
    localStorage.setItem(KEY_TEXTS, JSON.stringify(texts));
  }

  function applyAllSavedTexts() {
    const texts = getSavedTexts();
    Object.entries(texts).forEach(function ([key, val]) {
      document.querySelectorAll('[data-text-key="' + key + '"]').forEach(function (el) {
        el.textContent = val;
      });
    });
  }

  /* ─── Membros extras da árvore ───────────────────────────── */
  function getExtraMembers() {
    try { return JSON.parse(localStorage.getItem(KEY_MEMBERS) || '[]'); } catch { return []; }
  }

  function saveExtraMembers(members) {
    localStorage.setItem(KEY_MEMBERS, JSON.stringify(members));
  }

  /* ─── Fotos da galeria (admin-uploaded) ───────────────────── */
  function getGalleryPhotos() {
    try { return JSON.parse(localStorage.getItem(KEY_GALLERY) || '[]'); } catch { return []; }
  }

  function saveGalleryPhotos(arr) {
    try { localStorage.setItem(KEY_GALLERY, JSON.stringify(arr)); } catch (e) {
      alert('Armazenamento cheio. Tente fotos menores ou remova algumas fotos da galeria.');
    }
  }

  /* ═══════════════════════════════════════════════════════════
     MODAL DE LOGIN
  ═══════════════════════════════════════════════════════════ */
  function createLoginModal() {
    if (document.getElementById('admin-login-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'admin-login-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Login administrativo');
    modal.innerHTML = [
      '<div class="adm-overlay" id="admOverlay"></div>',
      '<div class="adm-box">',
      '  <p class="adm-box-title">Acesso Administrativo</p>',
      '  <p class="adm-box-sub">Entre para editar a família</p>',
      '  <div class="adm-field">',
      '    <label for="admEmail">E-mail</label>',
      '    <input type="email" id="admEmail" placeholder="email@exemplo.com" autocomplete="email" />',
      '  </div>',
      '  <div class="adm-field">',
      '    <label for="admPass">Senha</label>',
      '    <input type="password" id="admPass" placeholder="••••••••" autocomplete="current-password" />',
      '  </div>',
      '  <p class="adm-error" id="admError">E-mail ou senha incorretos.</p>',
      '  <button class="adm-btn-primary" id="admLoginBtn">Entrar</button>',
      '  <button class="adm-btn-secondary" id="admCancelBtn">Cancelar</button>',
      '</div>'
    ].join('\n');
    document.body.appendChild(modal);

    document.getElementById('admOverlay').addEventListener('click', hideLoginModal);
    document.getElementById('admCancelBtn').addEventListener('click', hideLoginModal);
    document.getElementById('admLoginBtn').addEventListener('click', attemptLogin);
    modal.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') attemptLogin();
      if (e.key === 'Escape') hideLoginModal();
    });
  }

  function showLoginModal() {
    createLoginModal();
    const modal = document.getElementById('admin-login-modal');
    modal.classList.add('adm-visible');
    document.getElementById('admError').style.display = 'none';
    document.getElementById('admEmail').value = '';
    document.getElementById('admPass').value = '';
    setTimeout(function () { document.getElementById('admEmail').focus(); }, 60);
  }

  function hideLoginModal() {
    const modal = document.getElementById('admin-login-modal');
    if (modal) modal.classList.remove('adm-visible');
  }

  function attemptLogin() {
    const email = document.getElementById('admEmail').value.trim();
    const pass  = document.getElementById('admPass').value;
    if (doLogin(email, pass)) {
      hideLoginModal();
      initAdminUI();
    } else {
      document.getElementById('admError').style.display = 'block';
      document.getElementById('admPass').value = '';
      document.getElementById('admPass').focus();
    }
  }

  /* ═══════════════════════════════════════════════════════════
     BOTÃO DE CADEADO (pré-login)
  ═══════════════════════════════════════════════════════════ */
  function createLockButton() {
    if (document.getElementById('adm-lock-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'adm-lock-btn';
    btn.title = 'Acesso administrativo';
    btn.setAttribute('aria-label', 'Abrir painel administrativo');
    btn.innerHTML = '🔒';
    btn.addEventListener('click', showLoginModal);
    document.body.appendChild(btn);
  }

  /* ═══════════════════════════════════════════════════════════
     BARRA ADMINISTRATIVA (pós-login)
  ═══════════════════════════════════════════════════════════ */
  function createAdminBar() {
    if (document.getElementById('adm-bar')) return;
    const bar = document.createElement('div');
    bar.id = 'adm-bar';
    bar.setAttribute('role', 'banner');
    bar.innerHTML = [
      '<span class="adm-bar-icon">✏️</span>',
      '<span class="adm-bar-label">Modo de edição</span>',
      '<span class="adm-bar-email">' + ADMIN_EMAIL + '</span>',
      '<button class="adm-bar-logout" id="admLogout">Sair</button>'
    ].join('');
    document.body.insertAdjacentElement('afterbegin', bar);
    /* Empurra a navbar para baixo */
    document.body.style.paddingTop = '42px';
    document.getElementById('admLogout').addEventListener('click', doLogout);
  }

  /* ═══════════════════════════════════════════════════════════
     EDIÇÃO DE FOTOS
  ═══════════════════════════════════════════════════════════ */
  function makePhotoEditable(container, photoKey) {
    if (container.dataset.admEdit) return; /* já configurado */
    container.dataset.admEdit = '1';
    container.classList.add('adm-photo-wrap');

    const overlay = document.createElement('div');
    overlay.className = 'adm-photo-overlay';
    overlay.innerHTML = '<span class="adm-edit-tag">📷 Trocar foto</span>';
    container.appendChild(overlay);

    const input = document.createElement('input');
    input.type    = 'file';
    input.accept  = 'image/*';
    input.style.display = 'none';
    container.appendChild(input);

    overlay.addEventListener('click', function (e) {
      e.stopPropagation();
      input.click();
    });

    input.addEventListener('change', function () {
      const file = input.files[0];
      if (!file) return;
      resizeImage(file, 900, 900, 0.88, function (base64) {
        savePhoto(photoKey, base64);
        applyPhotoToElement(container, base64);
      });
      input.value = '';
    });
  }

  function enablePhotoEditing() {
    /* Procura todos os elementos com data-photo-key */
    document.querySelectorAll('[data-photo-key]').forEach(function (el) {
      const key = el.dataset.photoKey;
      /* Se é um container de foto (photo-circle, profile-photo-large) */
      if (el.classList.contains('photo-circle') || el.classList.contains('profile-photo-large') || el.classList.contains('baby-main-circle')) {
        makePhotoEditable(el, key);
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════
     EDIÇÃO DE TEXTOS (nomes / papéis) NA ÁRVORE
  ═══════════════════════════════════════════════════════════ */
  function enableTextEditing() {
    document.querySelectorAll('[data-text-key]').forEach(function (el) {
      el.contentEditable = 'true';
      el.classList.add('adm-editable-text');
      el.setAttribute('spellcheck', 'false');
      el.addEventListener('click', function (e) { e.stopPropagation(); });
      el.addEventListener('blur', function () {
        saveText(el.dataset.textKey, el.textContent);
      });
    });
  }

  /* ═══════════════════════════════════════════════════════════
     EXPANSÃO DA ÁRVORE
  ═══════════════════════════════════════════════════════════ */
  function buildExtraMemberBranch(member, editMode) {
    const branch = document.createElement('div');
    branch.className = 'child-branch';
    branch.dataset.memberId = member.id;

    const stem = document.createElement('div');
    stem.className = 'child-stem';
    stem.setAttribute('aria-hidden', 'true');

    const card = document.createElement('div');
    card.className = 'member-card extra-member-card';

    /* Círculo de foto */
    const circle = document.createElement('div');
    circle.className = 'photo-circle';
    circle.dataset.photoKey = 'extra_' + member.id;
    if (member.photo) {
      const img = document.createElement('img');
      img.src = member.photo;
      img.alt = member.name || 'Membro';
      img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;';
      circle.style.position = 'relative';
      circle.appendChild(img);
    } else {
      const icon = document.createElement('span');
      icon.className = 'ph-icon';
      icon.textContent = '👤';
      const lbl = document.createElement('span');
      lbl.className = 'ph-label';
      lbl.textContent = '?';
      circle.appendChild(icon);
      circle.appendChild(lbl);
    }

    /* Nome */
    const nameEl = document.createElement('p');
    nameEl.className = 'member-name';
    nameEl.textContent = member.name || 'Nome';

    /* Papel */
    const roleEl = document.createElement('p');
    roleEl.className = 'member-role';
    roleEl.textContent = member.role || 'Membro';

    card.appendChild(circle);
    card.appendChild(nameEl);
    card.appendChild(roleEl);
    branch.appendChild(stem);
    branch.appendChild(card);

    if (editMode) {
      /* Foto editável */
      makePhotoEditable(circle, 'extra_' + member.id);

      /* Sobrescreve o listener de input para também salvar no membro */
      var fileInput = circle.querySelector('input[type=file]');
      if (fileInput) {
        fileInput.addEventListener('change', function () {
          /* O makePhotoEditable já salvou a foto; aqui atualizamos o membro */
          setTimeout(function () {
            const saved = getSavedPhotos()['extra_' + member.id];
            if (saved) {
              const members = getExtraMembers();
              const m = members.find(function (x) { return x.id === member.id; });
              if (m) { m.photo = saved; saveExtraMembers(members); }
            }
          }, 200);
        });
      }

      /* Nome editável */
      nameEl.contentEditable = 'true';
      nameEl.classList.add('adm-editable-text');
      nameEl.setAttribute('spellcheck', 'false');
      nameEl.addEventListener('click', function (e) { e.stopPropagation(); });
      nameEl.addEventListener('blur', function () {
        const members = getExtraMembers();
        const m = members.find(function (x) { return x.id === member.id; });
        if (m) { m.name = nameEl.textContent; saveExtraMembers(members); }
      });

      /* Papel editável */
      roleEl.contentEditable = 'true';
      roleEl.classList.add('adm-editable-text');
      roleEl.setAttribute('spellcheck', 'false');
      roleEl.addEventListener('click', function (e) { e.stopPropagation(); });
      roleEl.addEventListener('blur', function () {
        const members = getExtraMembers();
        const m = members.find(function (x) { return x.id === member.id; });
        if (m) { m.role = roleEl.textContent; saveExtraMembers(members); }
      });

      /* Botão remover */
      const delBtn = document.createElement('button');
      delBtn.className = 'adm-del-member-btn';
      delBtn.title = 'Remover da árvore';
      delBtn.innerHTML = '✕';
      delBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (confirm('Remover "' + (nameEl.textContent || 'este membro') + '" da árvore?')) {
          const remaining = getExtraMembers().filter(function (x) { return x.id !== member.id; });
          saveExtraMembers(remaining);
          /* Remove a foto salva também */
          const photos = getSavedPhotos();
          delete photos['extra_' + member.id];
          localStorage.setItem(KEY_PHOTOS, JSON.stringify(photos));
          branch.remove();
        }
      });
      card.appendChild(delBtn);
    }

    return branch;
  }

  function renderExtraTreeMembers(editMode) {
    const container = document.querySelector('.generation-children');
    if (!container) return;
    getExtraMembers().forEach(function (m) {
      container.appendChild(buildExtraMemberBranch(m, editMode));
    });
  }

  function createAddMemberButton() {
    const section = document.querySelector('.family-tree');
    if (!section || document.getElementById('adm-add-member-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'adm-add-member-btn';
    btn.innerHTML = '+ Aumentar a árvore genealógica';
    btn.setAttribute('aria-label', 'Adicionar novo membro à árvore');

    btn.addEventListener('click', function () {
      const newMember = { id: Date.now().toString(), name: 'Novo Membro', role: 'Filho(a)', photo: null };
      const members = getExtraMembers();
      members.push(newMember);
      saveExtraMembers(members);
      const container = document.querySelector('.generation-children');
      if (container) container.appendChild(buildExtraMemberBranch(newMember, true));
    });

    section.appendChild(btn);
  }

  /* ═══════════════════════════════════════════════════════════
     GALERIA ADMINISTRATIVA
  ═══════════════════════════════════════════════════════════ */
  function openLightbox(src) {
    const lb  = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    if (lb && img) { img.src = src; lb.classList.add('open'); }
  }

  function buildGalleryItem(photo, editMode) {
    const item = document.createElement('div');
    item.className = 'masonry-item adm-gallery-item';
    item.dataset.category = photo.category;

    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = photo.label || 'Foto';
    img.loading = 'lazy';
    item.appendChild(img);

    if (photo.label) {
      const lbl = document.createElement('span');
      lbl.className = 'item-label';
      lbl.textContent = photo.label;
      item.appendChild(lbl);
    }

    /* Clique para lightbox */
    item.addEventListener('click', function () { openLightbox(photo.src); });

    if (editMode) {
      const delBtn = document.createElement('button');
      delBtn.className = 'adm-gallery-del-btn';
      delBtn.title = 'Remover foto';
      delBtn.innerHTML = '✕';
      delBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const remaining = getGalleryPhotos().filter(function (p) { return p.id !== photo.id; });
        saveGalleryPhotos(remaining);
        item.remove();
        refreshPhotoCount();
        /* Atualiza filtros se o filterManager existe */
        if (typeof applyCurrentFilter === 'function') applyCurrentFilter();
      });
      item.appendChild(delBtn);
    }

    return item;
  }

  function renderSavedGalleryPhotos(editMode) {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;
    getGalleryPhotos().forEach(function (p) {
      grid.insertAdjacentElement('afterbegin', buildGalleryItem(p, editMode));
    });
    refreshPhotoCount();
  }

  function createGalleryUploadModal() {
    if (document.getElementById('adm-gallery-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'adm-gallery-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = [
      '<div class="adm-overlay" id="galleryOverlay"></div>',
      '<div class="adm-box">',
      '  <p class="adm-box-title">Adicionar foto à galeria</p>',
      '  <div class="adm-field">',
      '    <label for="galleryFile">Foto</label>',
      '    <input type="file" id="galleryFile" accept="image/*" />',
      '  </div>',
      '  <div class="adm-field">',
      '    <label for="galleryLabel">Descrição (opcional)</label>',
      '    <input type="text" id="galleryLabel" placeholder="Ex: Momento especial" />',
      '  </div>',
      '  <div class="adm-field">',
      '    <label for="galleryCategory">Categoria</label>',
      '    <select id="galleryCategory">',
      '      <option value="familia">Família</option>',
      '      <option value="mae">Mãe</option>',
      '      <option value="pai">Pai</option>',
      '      <option value="bebe">Bebê</option>',
      '      <option value="pet">Pet</option>',
      '      <option value="viagem">Viagens</option>',
      '      <option value="especial">Especiais</option>',
      '    </select>',
      '  </div>',
      '  <button class="adm-btn-primary" id="galleryUploadBtn">Adicionar</button>',
      '  <button class="adm-btn-secondary" id="galleryUploadCancel">Cancelar</button>',
      '</div>'
    ].join('\n');
    document.body.appendChild(modal);

    document.getElementById('galleryOverlay').addEventListener('click', hideGalleryModal);
    document.getElementById('galleryUploadCancel').addEventListener('click', hideGalleryModal);
    document.getElementById('galleryUploadBtn').addEventListener('click', doGalleryUpload);
  }

  function showGalleryModal() {
    createGalleryUploadModal();
    document.getElementById('adm-gallery-modal').classList.add('adm-visible');
    document.getElementById('galleryFile').value = '';
    document.getElementById('galleryLabel').value = '';
  }

  function hideGalleryModal() {
    const m = document.getElementById('adm-gallery-modal');
    if (m) m.classList.remove('adm-visible');
  }

  function doGalleryUpload() {
    const file = document.getElementById('galleryFile').files[0];
    if (!file) { alert('Selecione uma foto primeiro.'); return; }
    const label    = document.getElementById('galleryLabel').value.trim();
    const category = document.getElementById('galleryCategory').value;

    resizeImage(file, 1200, 1200, 0.88, function (base64) {
      const photo = { id: Date.now().toString(), src: base64, label: label, category: category };
      const photos = getGalleryPhotos();
      photos.push(photo);
      saveGalleryPhotos(photos);
      const grid = document.getElementById('galleryGrid');
      if (grid) grid.insertAdjacentElement('afterbegin', buildGalleryItem(photo, true));
      refreshPhotoCount();
      hideGalleryModal();
      /* Reaplica filtro atual */
      const activeBtn = document.querySelector('.filter-btn.active');
      if (activeBtn) activeBtn.click();
    });
  }

  function createGalleryAddButton() {
    if (document.getElementById('adm-add-gallery-btn')) return;
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;
    const btn = document.createElement('button');
    btn.id = 'adm-add-gallery-btn';
    btn.innerHTML = '+ Adicionar foto à galeria';
    btn.setAttribute('aria-label', 'Adicionar nova foto à galeria');
    btn.addEventListener('click', showGalleryModal);
    grid.insertAdjacentElement('beforebegin', btn);
  }

  function refreshPhotoCount() {
    const countEl = document.getElementById('photoCount');
    if (!countEl) return;
    const n = document.querySelectorAll('.masonry-item img').length;
    if (n > 0) {
      countEl.textContent = n + ' memória' + (n !== 1 ? 's' : '') + ' guardada' + (n !== 1 ? 's' : '');
    } else {
      const total = document.querySelectorAll('.masonry-item').length;
      countEl.textContent = total + ' espaços esperando por fotos';
    }
  }

  /* ═══════════════════════════════════════════════════════════
     INICIALIZAR UI ADMINISTRATIVA
  ═══════════════════════════════════════════════════════════ */
  function initAdminUI() {
    /* Remove o cadeado */
    const lock = document.getElementById('adm-lock-btn');
    if (lock) lock.remove();

    /* Barra de admin */
    createAdminBar();

    /* Edição de fotos em toda a página */
    enablePhotoEditing();

    /* Funcionalidades por página */
    const page = currentPage();

    if (page === 'index.html' || page === '') {
      enableTextEditing();
      /* Renderiza membros extras em modo de edição */
      renderExtraTreeMembers(true);
      createAddMemberButton();
    }

    if (page === 'galeria.html') {
      renderSavedGalleryPhotos(true);
      createGalleryAddButton();
    }
  }

  /* ═══════════════════════════════════════════════════════════
     INICIALIZAÇÃO PRINCIPAL (DOMContentLoaded)
  ═══════════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function () {
    const page = currentPage();

    /* Sempre: aplica fotos e textos salvos */
    applyAllSavedPhotos();
    applyAllSavedTexts();

    /* Sempre: renderiza membros extras e fotos de galeria em modo de leitura */
    if (page === 'index.html' || page === '') {
      renderExtraTreeMembers(false);
    }
    if (page === 'galeria.html') {
      renderSavedGalleryPhotos(false);
      refreshPhotoCount();
    }

    /* Login ou UI de admin */
    if (isLoggedIn()) {
      initAdminUI();
    } else {
      createLockButton();
    }
  });

})();
