// ================================================================
//  editor.js — Modo de edição para membros da família
//  Inclui: editor de texto/foto, galeria dinâmica, árvore dinâmica
// ================================================================

(function () {
  'use strict';

  // ─── Estado ─────────────────────────────────────────────────────
  let editMode = false;
  const pendingPhotos = {};
  const pendingPositions = {};
  let _cachedPageData = null;

  // ─── Página atual ───────────────────────────────────────────────
  function currentPage() {
    return document.body.dataset.page || '';
  }

  // ─── Escape de atributos HTML ───────────────────────────────────
  function escapeAttr(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ─── Toast de feedback ──────────────────────────────────────────
  function showToast(msg, isError = false) {
    let toast = document.getElementById('editor-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'editor-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className = isError ? 'error' : '';
    toast.style.display = 'block';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => { toast.style.display = 'none'; }, 3500);
  }

  // ─── Lightbox manual (para itens criados dinamicamente) ─────────
  function openLightbox(src) {
    const lb  = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    if (!lb || !img) return;
    img.src = src;
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  // ─── Injeção do botão de edição ────────────────────────────────
  function injectEditButton() {
    if (document.getElementById('edit-toggle-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'edit-toggle-btn';
    btn.type = 'button';
    btn.textContent = '✏️ Editar';
    btn.setAttribute('aria-label', 'Ativar modo de edição');
    btn.style.display = 'none';
    document.body.appendChild(btn);
    btn.addEventListener('click', toggleEditMode);
  }

  // ─── Toggle do modo de edição ───────────────────────────────────
  function toggleEditMode() {
    editMode = !editMode;
    const btn = document.getElementById('edit-toggle-btn');

    if (editMode) {
      btn.textContent = '💾 Salvar';
      btn.classList.add('save-mode');
      btn.setAttribute('aria-label', 'Salvar alterações');
      activateEditing();
      activatePageFeatures();
    } else {
      btn.textContent = '✏️ Editar';
      btn.classList.remove('save-mode');
      btn.setAttribute('aria-label', 'Ativar modo de edição');
      saveAndDeactivate();
    }
  }

  // ─── Funcionalidades específicas por página ─────────────────────
  function activatePageFeatures() {
    const page = currentPage();
    if (page === 'galeria') activateGaleriaEdit();
    if (page === 'index')   activateTreeEdit();
    if (['mae', 'pai', 'bebe', 'pet', 'familia'].includes(page)) activateProfileGalleryEdit();
    if (page === 'pet')     activatePetFamilyEdit();
    if (['mae', 'pai'].includes(page)) activateChildhoodEdit();
  }

  function deactivatePageFeatures() {
    const page = currentPage();
    if (page === 'galeria') deactivateGaleriaEdit();
    if (page === 'index')   deactivateTreeEdit();
    if (['mae', 'pai', 'bebe', 'pet', 'familia'].includes(page)) deactivateProfileGalleryEdit();
    if (page === 'pet')     deactivatePetFamilyEdit();
    if (['mae', 'pai'].includes(page)) deactivateChildhoodEdit();
  }

  // ─── Ativa edição de textos e fotos ────────────────────────────
  function activateEditing() {
    document.body.classList.add('edit-mode');
    document.querySelectorAll('[data-field]').forEach(el => {
      el.contentEditable = 'true';
      el.classList.add('adm-editable-text');
      el.setAttribute('spellcheck', 'false');
    });

    document.querySelectorAll('[data-photo-key]').forEach(wrap => {
      if (wrap.querySelector('.adm-photo-overlay')) return;
      wrap.classList.add('adm-photo-wrap');

      const overlay = document.createElement('div');
      overlay.className = 'adm-photo-overlay';

      const btnsRow = document.createElement('div');
      btnsRow.className = 'adm-photo-overlay-btns';

      const changeTag = document.createElement('button');
      changeTag.type = 'button';
      changeTag.className = 'adm-photo-btn adm-photo-change-btn';
      changeTag.textContent = '📷 Trocar';

      const posTag = document.createElement('button');
      posTag.type = 'button';
      posTag.className = 'adm-photo-btn adm-photo-pos-btn';
      posTag.textContent = '⊞ Posição';

      btnsRow.appendChild(changeTag);
      btnsRow.appendChild(posTag);
      overlay.appendChild(btnsRow);

      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.style.display = 'none';
      fileInput.dataset.photoKeyRef = wrap.dataset.photoKey;

      const photoKey = wrap.dataset.photoKey;

      changeTag.addEventListener('click', e => { e.stopPropagation(); fileInput.click(); });
      posTag.addEventListener('click', e => { e.stopPropagation(); showPositionPanel(wrap, photoKey); });

      fileInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = ev => {
          let img = wrap.querySelector('img');
          if (!img) {
            img = document.createElement('img');
            img.alt = photoKey;
            wrap.insertBefore(img, wrap.firstChild);
          }
          img.src = ev.target.result;
          const ph = wrap.querySelector('.ph-label, .ph-icon, [data-baby-ph], .baby-photo-hint');
          if (ph) ph.style.display = 'none';
        };
        reader.readAsDataURL(file);

        const ext  = window.FamilyStorage ? window.FamilyStorage.getExtension(file) : 'jpg';
        const path = window.FamilyStorage
          ? window.FamilyStorage.keyToPath(photoKey, ext)
          : `photos/${photoKey}.${ext}`;
        pendingPhotos[photoKey] = { file, storagePath: path };
      });

      wrap.appendChild(overlay);
      wrap.appendChild(fileInput);
    });
  }

  // ─── Desativa edição de textos e fotos (sem salvar) ────────────
  function deactivateEditing() {
    document.body.classList.remove('edit-mode');
    document.querySelectorAll('[data-field]').forEach(el => {
      el.contentEditable = 'false';
      el.classList.remove('adm-editable-text');
      el.removeAttribute('spellcheck');
    });
    document.querySelectorAll('.adm-photo-overlay').forEach(el => el.remove());
    document.querySelectorAll('input[data-photo-key-ref]').forEach(el => el.remove());
    document.querySelectorAll('[data-photo-key]').forEach(wrap => {
      wrap.classList.remove('adm-photo-wrap');
    });
    // Fecha painel de posição se aberto
    closeCurrentPosPanel();
  }

  // ─── Fecha painel de posição ativo e limpa handlers ────────────
  function closeCurrentPosPanel() {
    const panel = document.getElementById('adm-pos-panel-active');
    if (!panel) return;
    document.querySelectorAll('.adm-pos-drag-mode').forEach(el => {
      el.classList.remove('adm-pos-drag-mode');
      const h = el._posHandlers;
      if (h) {
        el.removeEventListener('mousedown',  h.onDown);
        el.removeEventListener('touchstart', h.onDown);
        document.removeEventListener('mousemove', h.onMove);
        document.removeEventListener('touchmove', h.onMove);
        document.removeEventListener('mouseup',   h.onUp);
        document.removeEventListener('touchend',  h.onUp);
        delete el._posHandlers;
      }
    });
    panel.remove();
  }

  // ─── Painel de ajuste de posição por arrastar ────────────────────
  function showPositionPanel(wrap, photoKey) {
    // Toggle: fecha se já aberto para o mesmo photoKey
    const existing = document.getElementById('adm-pos-panel-active');
    if (existing) {
      const wasForSame = existing.dataset.forKey === photoKey;
      closeCurrentPosPanel();
      if (wasForSame) return;
    }

    const img = wrap.querySelector('img');
    if (!img) return;

    const rect = wrap.getBoundingClientRect();
    const currentFit = img.style.objectFit || 'cover';

    // ── Painel flutuante pequeno ──
    const panel = document.createElement('div');
    panel.id = 'adm-pos-panel-active';
    panel.dataset.forKey = photoKey;
    panel.className = 'adm-pos-panel';
    panel.style.cssText = `
      position: fixed;
      top: ${Math.min(rect.bottom + 8, window.innerHeight - 120)}px;
      left: ${Math.max(8, Math.min(rect.left, window.innerWidth - 220))}px;
      z-index: 2000;
    `;

    const fitRow = document.createElement('div');
    fitRow.className = 'adm-pos-fit-row';
    fitRow.innerHTML = '<span class="adm-pos-label">Modo:</span>';
    ['contain', 'cover'].forEach((fit, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'adm-pos-fit-btn' + (currentFit === fit ? ' active' : '');
      btn.dataset.fit = fit;
      btn.textContent = i === 0 ? 'Inteira' : 'Recorte';
      btn.addEventListener('click', e => {
        e.stopPropagation();
        img.style.objectFit = fit;
        fitRow.querySelectorAll('.adm-pos-fit-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (!pendingPositions[photoKey]) pendingPositions[photoKey] = {};
        pendingPositions[photoKey].fit = fit;
        pendingPositions[photoKey].position = img.style.objectPosition || '50% 50%';
      });
      fitRow.appendChild(btn);
    });

    const hint = document.createElement('div');
    hint.className = 'adm-pos-drag-hint';
    hint.textContent = 'Clique e arraste na foto';

    const doneBtn = document.createElement('button');
    doneBtn.type = 'button';
    doneBtn.className = 'adm-pos-done-btn';
    doneBtn.textContent = '✓ Pronto';
    doneBtn.addEventListener('click', e => { e.stopPropagation(); cleanup(); });

    panel.appendChild(hint);
    panel.appendChild(fitRow);
    panel.appendChild(doneBtn);
    document.body.appendChild(panel);

    // ── Modo arrastar ──
    wrap.classList.add('adm-pos-drag-mode');
    let dragging = false;

    const calcPos = (clientX, clientY) => {
      const r = wrap.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((clientX - r.left)  / r.width)  * 100));
      const y = Math.max(0, Math.min(100, ((clientY - r.top)   / r.height) * 100));
      return `${x.toFixed(1)}% ${y.toFixed(1)}%`;
    };

    const applyPos = pos => {
      img.style.objectPosition = pos;
      if (!pendingPositions[photoKey]) pendingPositions[photoKey] = {};
      pendingPositions[photoKey].position = pos;
      pendingPositions[photoKey].fit = img.style.objectFit || 'cover';
    };

    const onDown = e => {
      if (e.target.closest('#adm-pos-panel-active')) return;
      dragging = true;
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      applyPos(calcPos(cx, cy));
      e.preventDefault();
    };
    const onMove = e => {
      if (!dragging) return;
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      applyPos(calcPos(cx, cy));
      if (e.cancelable) e.preventDefault();
    };
    const onUp = () => { dragging = false; };

    wrap.addEventListener('mousedown',  onDown);
    wrap.addEventListener('touchstart', onDown, { passive: false });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup',   onUp);
    document.addEventListener('touchend',  onUp);
    wrap._posHandlers = { onDown, onMove, onUp };

    // ── Fecha ao clicar fora ──
    function cleanup() {
      closeCurrentPosPanel();
      document.removeEventListener('mousedown', closeOnOutside);
    }
    const closeOnOutside = e => {
      if (!panel.contains(e.target) && !wrap.contains(e.target)) cleanup();
    };
    setTimeout(() => document.addEventListener('mousedown', closeOnOutside), 30);
  }

  // ─── Botão ⊞ em itens de galeria (sem data-photo-key) ──────────
  function addGalPosBtn(el, key) {
    if (el.querySelector('.gal-pos-btn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gal-pos-btn';
    btn.title = 'Ajustar posição da foto';
    btn.textContent = '⊞';
    btn.addEventListener('click', e => {
      e.stopPropagation();
      showPositionPanel(el, '_gal:' + key);
    });
    el.appendChild(btn);
  }

  // ─── Salva e desativa ───────────────────────────────────────────
  async function saveAndDeactivate() {
    deactivateEditing();
    deactivatePageFeatures();
    await persistChanges();
  }

  // ─── Persiste alterações no Supabase ───────────────────────────
  async function persistChanges() {
    const page = currentPage();
    if (!page) { showToast('Página não identificada.', true); return; }
    if (!window.FamilyDB) { showToast('DB não disponível.', true); return; }

    // Carrega dados existentes para preservar arrays (items, extra_members)
    const data = (await window.FamilyDB.loadContent(page)) || {};

    // Coleta textos
    document.querySelectorAll('[data-field]').forEach(el => {
      const value = el.innerText.trim();
      if (value) data[el.dataset.field] = value;
    });

    // Upload de fotos pendentes
    const uploading = Object.entries(pendingPhotos);
    if (uploading.length > 0) {
      showToast('Enviando fotos…');
      for (const [key, { file, storagePath }] of uploading) {
        try {
          const url = await window.FamilyStorage.uploadPhoto(file, storagePath);
          data[key + 'Url'] = url;
          const wrap = document.querySelector(`[data-photo-key="${key}"]`);
          if (wrap) {
            const img = wrap.querySelector('img');
            if (img) img.src = url;
          }
          delete pendingPhotos[key];
        } catch (e) {
          console.error('[Editor] Erro no upload de', key, ':', e);
          if (e.message === 'SESSION_EXPIRED') {
            showToast('Sessão expirada — faça logout e entre novamente.', true);
            return; // interrompe o save inteiro
          }
          showToast(`Falha ao enviar foto (${key}).`, true);
        }
      }
    }

    // Salva posições pendentes
    Object.entries(pendingPositions).forEach(([key, { position, fit }]) => {
      if (key.startsWith('_gal:')) {
        // Posição de item de galeria → photo_positions map
        const storageKey = key.slice(5);
        if (!data.photo_positions) data.photo_positions = {};
        data.photo_positions[storageKey] = {};
        if (position) data.photo_positions[storageKey].position = position;
        if (fit)      data.photo_positions[storageKey].fit      = fit;
      } else {
        // Posição de data-photo-key → campos planos
        if (position) data[key + 'Position'] = position;
        if (fit)      data[key + 'Fit']      = fit;
      }
    });
    for (const k in pendingPositions) delete pendingPositions[k];

    // Salva no Supabase
    try {
      await window.FamilyDB.saveContent(page, data);
      showToast('Alterações salvas ✓');
    } catch (e) {
      console.error('[Editor] Erro ao salvar:', e);
      if (e.message === 'SESSION_EXPIRED') {
        showToast('Sessão expirada — faça logout e entre novamente.', true);
      } else {
        showToast('Erro ao salvar. Tente novamente.', true);
      }
    }
  }

  // ─── Carrega conteúdo do Supabase ───────────────────────────────
  async function loadPageContent() {
    const page = currentPage();
    if (!page || !window.FamilyDB) return null;
    const data = await window.FamilyDB.loadContent(page);
    if (data) {
      _cachedPageData = data;
      window.FamilyDB.applyContentToDOM(data);
    }
    return data;
  }

  // ─── Aplica posições de fotos de galeria (photo_positions map) ──
  function applyPhotoPositions(data) {
    if (!data || !data.photo_positions) return;
    Object.entries(data.photo_positions).forEach(([key, val]) => {
      if (!val) return;
      const position = typeof val === 'string' ? val : val.position;
      const fit      = typeof val === 'object' ? val.fit : null;

      function applyTo(img) {
        if (!img) return;
        if (position) img.style.objectPosition = position;
        if (fit)      img.style.objectFit      = fit;
      }

      // Por data-lightbox (itens HTML estáticos)
      document.querySelectorAll('[data-lightbox]').forEach(el => {
        if (el.dataset.lightbox === key) applyTo(el.querySelector('img'));
      });
      // Por data-supabase-id (galeria dinâmica)
      applyTo(document.querySelector(`[data-supabase-id="${key}"] img`));
      // Por data-gallery-id (galeria de perfil)
      applyTo(document.querySelector(`[data-gallery-id="${key}"] img`));
      // Por data-childhood-id (fotos de infância extras)
      applyTo(document.querySelector(`[data-childhood-id="${key}"] img`));
    });
  }


  // ================================================================
  //  GALLERY MODULE — página: galeria
  // ================================================================

  let galleryItems = [];

  async function loadGallery() {
    if (currentPage() !== 'galeria') return;
    if (!window.FamilyDB) return;

    const data = await window.FamilyDB.loadContent('galeria');
    if (!data || !Array.isArray(data.items) || !data.items.length) return;

    galleryItems = data.items;
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;

    galleryItems.forEach(item => renderGalleryItem(item, grid));
    updateGalleryCount();
    reinitGalleryFilters();
  }

  function renderGalleryItem(item, grid) {
    const el = document.createElement('div');
    el.className = 'masonry-item adm-gallery-item';
    el.dataset.category = item.category || 'familia';
    el.dataset.supabaseId = item.id;
    if (item.url) el.dataset.lightbox = item.url;

    const img = document.createElement('img');
    img.src = item.url || '';
    img.alt = escapeAttr(item.caption);
    el.appendChild(img);

    if (item.caption) {
      const lbl = document.createElement('span');
      lbl.className = 'item-label';
      lbl.textContent = item.caption;
      el.appendChild(lbl);
    }

    // Click para lightbox (itens dinâmicos não são capturados por initLightbox)
    if (item.url) {
      el.addEventListener('click', () => openLightbox(item.url));
    }

    if (grid) grid.appendChild(el);
    return el;
  }

  function updateGalleryCount() {
    const countEl = document.getElementById('photoCount');
    if (!countEl) return;
    const withImg = document.querySelectorAll('.masonry-item img').length;
    if (withImg > 0) {
      countEl.textContent = `${withImg} memória${withImg !== 1 ? 's' : ''} guardada${withImg !== 1 ? 's' : ''}`;
    }
  }

  // Reinicia filtros para incluir itens adicionados dinamicamente
  function reinitGalleryFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    if (!filterBtns.length) return;

    // Remove listeners antigos clonando os botões
    filterBtns.forEach(btn => {
      const clone = btn.cloneNode(true);
      btn.parentNode.replaceChild(clone, btn);
    });

    // Readiciona listeners com query dinâmica a cada clique
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const category = btn.getAttribute('data-filter');
        document.querySelectorAll('.masonry-item').forEach(item => {
          const cat = item.getAttribute('data-category') || 'all';
          item.style.display = (category === 'all' || cat === category) ? '' : 'none';
        });
      });
    });
  }

  function activateGaleriaEdit() {
    let btn = document.getElementById('adm-add-gallery-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'adm-add-gallery-btn';
      btn.type = 'button';
      btn.textContent = '➕ Adicionar foto';
      btn.addEventListener('click', showGalleryForm);
      const grid = document.getElementById('galleryGrid');
      if (grid) grid.parentNode.insertBefore(btn, grid);
    } else {
      btn.style.display = '';
    }

    // Botões de deletar e de posição nos itens vindos do Supabase
    document.querySelectorAll('.adm-gallery-item[data-supabase-id]').forEach(item => {
      if (item.querySelector('.adm-gallery-del-btn')) return;
      const delBtn = document.createElement('button');
      delBtn.className = 'adm-gallery-del-btn';
      delBtn.type = 'button';
      delBtn.setAttribute('aria-label', 'Remover foto');
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', e => {
        e.stopPropagation();
        deleteGalleryItem(item.dataset.supabaseId, item);
      });
      item.appendChild(delBtn);
    });

    // Botão ⊞ em TODOS os itens de masonry com foto (estáticos e dinâmicos)
    document.querySelectorAll('.masonry-item').forEach(item => {
      if (!item.querySelector('img')) return;
      const key = item.dataset.supabaseId || item.dataset.lightbox;
      if (!key) return;
      addGalPosBtn(item, key);
    });
  }

  function deactivateGaleriaEdit() {
    const btn = document.getElementById('adm-add-gallery-btn');
    if (btn) btn.style.display = 'none';
    const form = document.getElementById('adm-gallery-form');
    if (form) form.remove();
    document.querySelectorAll('.adm-gallery-del-btn').forEach(b => b.remove());
    document.querySelectorAll('.masonry-item .gal-pos-btn').forEach(b => b.remove());
  }

  function showGalleryForm() {
    if (document.getElementById('adm-gallery-form')) return;

    const form = document.createElement('div');
    form.id = 'adm-gallery-form';
    form.className = 'adm-inline-form';
    form.innerHTML = `
      <div class="adm-form-preview" id="adm-gal-preview">
        <span style="font-size:2rem;color:var(--color-text-muted)">🖼️</span>
      </div>
      <div class="adm-form-fields">
        <label class="adm-form-label">Foto
          <input type="file" accept="image/*" id="adm-gal-file" class="adm-field-input" />
        </label>
        <label class="adm-form-label">Categoria
          <select id="adm-gal-category" class="adm-field-input">
            <option value="familia">Família</option>
            <option value="mae">Mãe</option>
            <option value="pai">Pai</option>
            <option value="bebe">Bebê</option>
            <option value="pet">Pet</option>
            <option value="viagem">Viagem</option>
            <option value="especial">Especial</option>
          </select>
        </label>
        <label class="adm-form-label">Legenda
          <input type="text" id="adm-gal-caption" class="adm-field-input" placeholder="Ex: Férias em família" />
        </label>
        <div class="adm-form-actions">
          <button type="button" class="adm-btn-primary" id="adm-gal-submit">Adicionar</button>
          <button type="button" class="adm-btn-secondary" id="adm-gal-cancel">Cancelar</button>
        </div>
      </div>
    `;

    const grid = document.getElementById('galleryGrid');
    if (grid) grid.parentNode.insertBefore(form, grid);

    document.getElementById('adm-gal-file').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const preview = document.getElementById('adm-gal-preview');
        if (preview) {
          preview.innerHTML = '';
          const img = document.createElement('img');
          img.src = ev.target.result;
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
          preview.appendChild(img);
        }
      };
      reader.readAsDataURL(file);
    });

    document.getElementById('adm-gal-submit').addEventListener('click', submitNewGalleryPhoto);
    document.getElementById('adm-gal-cancel').addEventListener('click', () => form.remove());
  }

  async function submitNewGalleryPhoto() {
    const fileInput = document.getElementById('adm-gal-file');
    const category  = document.getElementById('adm-gal-category')?.value || 'familia';
    const caption   = document.getElementById('adm-gal-caption')?.value.trim() || '';
    const file = fileInput?.files[0];

    if (!file) { showToast('Selecione uma foto.', true); return; }
    if (!window.FamilyStorage) { showToast('Storage não disponível.', true); return; }

    showToast('Enviando foto…');
    try {
      const ext  = window.FamilyStorage.getExtension(file);
      const path = `galeria/${Date.now()}.${ext}`;
      const url  = await window.FamilyStorage.uploadPhoto(file, path);

      const newItem = { id: `gal_${Date.now()}`, url, category, caption };
      galleryItems.push(newItem);

      const existing = (await window.FamilyDB.loadContent('galeria')) || {};
      existing.items = galleryItems;
      await window.FamilyDB.saveContent('galeria', existing);

      const grid = document.getElementById('galleryGrid');
      const el   = renderGalleryItem(newItem, grid);

      // Adiciona botão de deletar imediatamente (edit mode ativo)
      const delBtn = document.createElement('button');
      delBtn.className = 'adm-gallery-del-btn';
      delBtn.type = 'button';
      delBtn.setAttribute('aria-label', 'Remover foto');
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', ev => {
        ev.stopPropagation();
        deleteGalleryItem(newItem.id, el);
      });
      el.appendChild(delBtn);

      updateGalleryCount();
      reinitGalleryFilters();
      showToast('Foto adicionada ✓');
      document.getElementById('adm-gallery-form')?.remove();
    } catch (e) {
      console.error('[Gallery] Erro:', e);
      showToast('Erro ao adicionar foto.', true);
    }
  }

  async function deleteGalleryItem(itemId, el) {
    if (!confirm('Remover esta foto da galeria?')) return;
    try {
      galleryItems = galleryItems.filter(i => i.id !== itemId);
      const existing = (await window.FamilyDB.loadContent('galeria')) || {};
      existing.items = galleryItems;
      await window.FamilyDB.saveContent('galeria', existing);
      if (el) el.remove();
      updateGalleryCount();
      showToast('Foto removida ✓');
    } catch (e) {
      console.error('[Gallery] Erro ao remover:', e);
      showToast('Erro ao remover foto.', true);
    }
  }


  // ================================================================
  //  PROFILE GALLERY MODULE — páginas: mae, pai, bebe, pet, familia
  // ================================================================

  let profileGalleryItems = [];

  async function loadProfileGallery() {
    const page = currentPage();
    if (!['mae', 'pai', 'bebe', 'pet', 'familia'].includes(page)) return;
    if (!window.FamilyDB) return;

    const data = await window.FamilyDB.loadContent(page);
    if (!data || !Array.isArray(data.gallery) || !data.gallery.length) return;

    profileGalleryItems = data.gallery;
    const grid = document.querySelector('.profile-gallery-grid');
    if (!grid) return;

    // Substitui placeholders pelas fotos reais
    grid.innerHTML = '';
    profileGalleryItems.forEach(item => renderProfileGalleryItem(item, grid));
  }

  function renderProfileGalleryItem(item, grid) {
    const el = document.createElement('div');
    el.className = 'profile-gallery-item';
    el.dataset.galleryId = item.id;

    const img = document.createElement('img');
    img.src = item.url || '';
    img.alt = escapeAttr(item.caption || '');
    el.appendChild(img);

    if (item.url) {
      el.addEventListener('click', () => openLightbox(item.url));
    }

    if (grid) grid.appendChild(el);
    return el;
  }

  function activateProfileGalleryEdit() {
    const grid = document.querySelector('.profile-gallery-grid');
    if (!grid) return;

    // Botão ✕ nos itens do banco
    grid.querySelectorAll('.profile-gallery-item[data-gallery-id]').forEach(item => {
      if (item.querySelector('.adm-gallery-del-btn')) return;
      const delBtn = document.createElement('button');
      delBtn.className = 'adm-gallery-del-btn';
      delBtn.type = 'button';
      delBtn.setAttribute('aria-label', 'Remover foto');
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', e => {
        e.stopPropagation();
        deleteProfileGalleryItem(item.dataset.galleryId, item);
      });
      item.appendChild(delBtn);
    });

    // Placeholders HTML vazios tornam-se clicáveis para upload direto
    grid.querySelectorAll('.profile-gallery-item:not([data-gallery-id])').forEach(item => {
      if (!item.querySelector('.gallery-ph')) return;
      item.classList.add('ph-clickable');
      item._phClickHandler = () => uploadToPlaceholder(item);
      item.addEventListener('click', item._phClickHandler);
    });

    // Botão ⊞ de posição nos itens com foto
    grid.querySelectorAll('.profile-gallery-item').forEach(item => {
      if (!item.querySelector('img')) return;
      const key = item.dataset.galleryId || item.dataset.lightbox;
      if (!key) return;
      addGalPosBtn(item, key);
    });

    // Célula "+ Adicionar foto" no final do grid
    if (!grid.querySelector('.profile-gallery-add-cell')) {
      const addCell = document.createElement('div');
      addCell.className = 'profile-gallery-add-cell';
      addCell.innerHTML = '<span class="profile-gallery-add-cell-icon">➕</span><span>Adicionar foto</span>';
      addCell.addEventListener('click', showProfileGalleryForm);
      grid.appendChild(addCell);
    }
  }

  function deactivateProfileGalleryEdit() {
    const grid = document.querySelector('.profile-gallery-grid');
    if (grid) {
      grid.querySelector('.profile-gallery-add-cell')?.remove();
      grid.querySelectorAll('.adm-gallery-del-btn').forEach(b => b.remove());
      grid.querySelectorAll('.profile-gallery-item .gal-pos-btn').forEach(b => b.remove());
      grid.querySelectorAll('.profile-gallery-item.ph-clickable').forEach(item => {
        item.classList.remove('ph-clickable');
        if (item._phClickHandler) {
          item.removeEventListener('click', item._phClickHandler);
          delete item._phClickHandler;
        }
      });
    }
    document.getElementById('adm-profile-gallery-form')?.remove();
  }

  function uploadToPlaceholder(placeholderItem) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      fileInput.remove();
      if (!file) return;
      if (!window.FamilyStorage) { showToast('Storage não disponível.', true); return; }

      const page = currentPage();
      const ph   = placeholderItem.querySelector('.gallery-ph');
      const originalContent = ph ? ph.innerHTML : '';
      if (ph) ph.innerHTML = '<span style="font-size:1.5rem;display:block;margin-bottom:4px">⏳</span>';
      showToast('Enviando foto…');

      try {
        const ext = window.FamilyStorage.getExtension(file);
        const url = await window.FamilyStorage.uploadPhoto(file, `photos/${page}/gallery/${Date.now()}.${ext}`);

        const newItem = { id: `pgal_${Date.now()}`, url, caption: '' };
        profileGalleryItems.push(newItem);
        const existing = (await window.FamilyDB.loadContent(page)) || {};
        existing.gallery = profileGalleryItems;
        await window.FamilyDB.saveContent(page, existing);

        // Substitui placeholder pela foto real
        placeholderItem.innerHTML = '';
        placeholderItem.dataset.galleryId = newItem.id;
        placeholderItem.classList.remove('ph-clickable');
        if (placeholderItem._phClickHandler) {
          placeholderItem.removeEventListener('click', placeholderItem._phClickHandler);
          delete placeholderItem._phClickHandler;
        }

        const img = document.createElement('img');
        img.src = url;
        img.alt = '';
        placeholderItem.appendChild(img);
        placeholderItem.addEventListener('click', () => openLightbox(url));

        const delBtn = document.createElement('button');
        delBtn.className = 'adm-gallery-del-btn';
        delBtn.type = 'button';
        delBtn.setAttribute('aria-label', 'Remover foto');
        delBtn.textContent = '✕';
        delBtn.addEventListener('click', ev => {
          ev.stopPropagation();
          deleteProfileGalleryItem(newItem.id, placeholderItem);
        });
        placeholderItem.appendChild(delBtn);

        showToast('Foto adicionada ✓');
      } catch (e) {
        console.error('[ProfileGallery] Erro:', e);
        if (ph) ph.innerHTML = originalContent;
        showToast('Erro ao adicionar foto.', true);
      }
    });

    fileInput.click();
  }

  function showProfileGalleryForm() {
    if (document.getElementById('adm-profile-gallery-form')) return;

    const form = document.createElement('div');
    form.id = 'adm-profile-gallery-form';
    form.className = 'adm-inline-form';
    form.style.maxWidth = '480px';
    form.innerHTML = `
      <div class="adm-form-preview" id="adm-pgal-preview">
        <span style="font-size:2rem;color:var(--color-text-muted)">🖼️</span>
      </div>
      <div class="adm-form-fields">
        <label class="adm-form-label">Foto
          <input type="file" accept="image/*" id="adm-pgal-file" class="adm-field-input" />
        </label>
        <label class="adm-form-label">Legenda (opcional)
          <input type="text" id="adm-pgal-caption" class="adm-field-input" placeholder="Ex: Dia especial" />
        </label>
        <div class="adm-form-actions">
          <button type="button" class="adm-btn-primary" id="adm-pgal-submit">Adicionar</button>
          <button type="button" class="adm-btn-secondary" id="adm-pgal-cancel">Cancelar</button>
        </div>
      </div>
    `;

    const grid = document.querySelector('.profile-gallery-grid');
    if (grid) grid.parentNode.insertBefore(form, grid);

    document.getElementById('adm-pgal-file').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const preview = document.getElementById('adm-pgal-preview');
        if (preview) {
          preview.innerHTML = '';
          const img = document.createElement('img');
          img.src = ev.target.result;
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
          preview.appendChild(img);
        }
      };
      reader.readAsDataURL(file);
    });

    document.getElementById('adm-pgal-submit').addEventListener('click', submitProfileGalleryPhoto);
    document.getElementById('adm-pgal-cancel').addEventListener('click', () => form.remove());
  }

  async function submitProfileGalleryPhoto() {
    const page = currentPage();
    const fileInput = document.getElementById('adm-pgal-file');
    const caption   = document.getElementById('adm-pgal-caption')?.value.trim() || '';
    const file = fileInput?.files[0];

    if (!file) { showToast('Selecione uma foto.', true); return; }
    if (!window.FamilyStorage) { showToast('Storage não disponível.', true); return; }

    showToast('Enviando foto…');
    try {
      const ext  = window.FamilyStorage.getExtension(file);
      const path = `photos/${page}/gallery/${Date.now()}.${ext}`;
      const url  = await window.FamilyStorage.uploadPhoto(file, path);

      const newItem = { id: `pgal_${Date.now()}`, url, caption };
      profileGalleryItems.push(newItem);

      const existing = (await window.FamilyDB.loadContent(page)) || {};
      existing.gallery = profileGalleryItems;
      await window.FamilyDB.saveContent(page, existing);

      const grid = document.querySelector('.profile-gallery-grid');
      const el   = renderProfileGalleryItem(newItem, null);

      // Botão de deletar (edit mode ativo)
      const delBtn = document.createElement('button');
      delBtn.className = 'adm-gallery-del-btn';
      delBtn.type = 'button';
      delBtn.setAttribute('aria-label', 'Remover foto');
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', ev => {
        ev.stopPropagation();
        deleteProfileGalleryItem(newItem.id, el);
      });
      el.appendChild(delBtn);

      if (grid) {
        const addCell = grid.querySelector('.profile-gallery-add-cell');
        if (addCell) grid.insertBefore(el, addCell);
        else grid.appendChild(el);
      }

      showToast('Foto adicionada ✓');
      document.getElementById('adm-profile-gallery-form')?.remove();
    } catch (e) {
      console.error('[ProfileGallery] Erro:', e);
      showToast('Erro ao adicionar foto.', true);
    }
  }

  async function deleteProfileGalleryItem(itemId, el) {
    if (!confirm('Remover esta foto da galeria?')) return;
    const page = currentPage();
    try {
      profileGalleryItems = profileGalleryItems.filter(i => i.id !== itemId);
      const existing = (await window.FamilyDB.loadContent(page)) || {};
      existing.gallery = profileGalleryItems;
      await window.FamilyDB.saveContent(page, existing);
      if (el) el.remove();
      showToast('Foto removida ✓');
    } catch (e) {
      console.error('[ProfileGallery] Erro ao remover:', e);
      showToast('Erro ao remover foto.', true);
    }
  }


  // ================================================================
  //  CHILDHOOD GALLERY MODULE — páginas: mae, pai
  // ================================================================

  let childhoodItems = [];

  async function loadChildhoodGallery() {
    const page = currentPage();
    if (!['mae', 'pai'].includes(page)) return;
    if (!window.FamilyDB) return;

    const data = await window.FamilyDB.loadContent(page);
    if (!data || !Array.isArray(data.childhood_photos) || !data.childhood_photos.length) return;

    childhoodItems = data.childhood_photos;
    const container = document.getElementById('childhood-gallery');
    if (!container) return;

    childhoodItems.forEach(item => renderChildhoodItem(item, container));
  }

  function renderChildhoodItem(item, container) {
    const wrap = document.createElement('div');
    wrap.className = 'childhood-extra-item';
    wrap.dataset.childhoodId = item.id;

    const img = document.createElement('img');
    img.src = item.url || '';
    img.alt = 'Foto da infância';
    wrap.appendChild(img);

    if (container) container.appendChild(wrap);
    return wrap;
  }

  function activateChildhoodEdit() {
    const container = document.getElementById('childhood-gallery');
    if (!container) return;

    // Botões ✕ nos itens extras já carregados do banco
    container.querySelectorAll('.childhood-extra-item[data-childhood-id]').forEach(item => {
      if (item.querySelector('.adm-gallery-del-btn')) return;
      const delBtn = document.createElement('button');
      delBtn.className = 'adm-gallery-del-btn';
      delBtn.type = 'button';
      delBtn.setAttribute('aria-label', 'Remover foto');
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', e => {
        e.stopPropagation();
        deleteChildhoodItem(item.dataset.childhoodId, item);
      });
      item.appendChild(delBtn);
    });

    // Botão ⊞ de posição nos itens extras com foto
    container.querySelectorAll('.childhood-extra-item[data-childhood-id]').forEach(item => {
      const key = item.dataset.childhoodId;
      if (!key) return;
      addGalPosBtn(item, key);
    });

    // Botão "+" para adicionar mais fotos
    if (!container.querySelector('.childhood-add-btn')) {
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'childhood-add-btn';
      addBtn.innerHTML = '<span class="childhood-add-btn-icon">➕</span><span>Adicionar foto</span>';
      addBtn.addEventListener('click', () => addChildhoodPhoto());
      container.appendChild(addBtn);
    }
  }

  function deactivateChildhoodEdit() {
    const container = document.getElementById('childhood-gallery');
    if (!container) return;
    container.querySelector('.childhood-add-btn')?.remove();
    container.querySelectorAll('.childhood-extra-item .adm-gallery-del-btn').forEach(b => b.remove());
    container.querySelectorAll('.childhood-extra-item .gal-pos-btn').forEach(b => b.remove());
  }

  async function addChildhoodPhoto() {
    const page = currentPage();
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      fileInput.remove();
      if (!file) return;
      if (!window.FamilyStorage) { showToast('Storage não disponível.', true); return; }

      showToast('Enviando foto…');
      try {
        const ext  = window.FamilyStorage.getExtension(file);
        const path = `photos/${page}/childhood/${Date.now()}.${ext}`;
        const url  = await window.FamilyStorage.uploadPhoto(file, path);

        const newItem = { id: `child_${Date.now()}`, url };
        childhoodItems.push(newItem);

        const existing = (await window.FamilyDB.loadContent(page)) || {};
        existing.childhood_photos = childhoodItems;
        await window.FamilyDB.saveContent(page, existing);

        const container = document.getElementById('childhood-gallery');
        const el = renderChildhoodItem(newItem, null);

        // Botão de deletar imediato (edit mode ativo)
        const delBtn = document.createElement('button');
        delBtn.className = 'adm-gallery-del-btn';
        delBtn.type = 'button';
        delBtn.setAttribute('aria-label', 'Remover foto');
        delBtn.textContent = '✕';
        delBtn.addEventListener('click', ev => {
          ev.stopPropagation();
          deleteChildhoodItem(newItem.id, el);
        });
        el.appendChild(delBtn);

        if (container) {
          const addBtn = container.querySelector('.childhood-add-btn');
          if (addBtn) container.insertBefore(el, addBtn);
          else container.appendChild(el);
        }

        showToast('Foto adicionada ✓');
      } catch (e) {
        console.error('[Childhood] Erro:', e);
        showToast('Erro ao adicionar foto.', true);
      }
    });

    fileInput.click();
  }

  async function deleteChildhoodItem(itemId, el) {
    if (!confirm('Remover esta foto da infância?')) return;
    const page = currentPage();
    try {
      childhoodItems = childhoodItems.filter(i => i.id !== itemId);
      const existing = (await window.FamilyDB.loadContent(page)) || {};
      existing.childhood_photos = childhoodItems;
      await window.FamilyDB.saveContent(page, existing);
      if (el) el.remove();
      showToast('Foto removida ✓');
    } catch (e) {
      console.error('[Childhood] Erro ao remover:', e);
      showToast('Erro ao remover foto.', true);
    }
  }


  // ================================================================
  //  PET FAMILY MODULE — página: pet
  // ================================================================

  let petFamilyItems = [];

  async function loadPetFamily() {
    if (currentPage() !== 'pet') return;
    if (!window.FamilyDB) return;

    const data = await window.FamilyDB.loadContent('pet');
    if (!data || !Array.isArray(data.pet_family) || !data.pet_family.length) return;

    petFamilyItems = data.pet_family;
    const grid = document.querySelector('.pets-family-grid');
    if (!grid) return;

    const addCard = grid.querySelector('.pet-add-card');
    petFamilyItems.forEach(pet => {
      const card = buildPetCard(pet);
      if (addCard) grid.insertBefore(card, addCard);
      else grid.appendChild(card);
    });
  }

  async function savePetFamily() {
    const existing = (await window.FamilyDB.loadContent('pet')) || {};
    existing.pet_family = petFamilyItems;
    await window.FamilyDB.saveContent('pet', existing);
  }

  function buildPetCard(pet) {
    const card = document.createElement('div');
    card.className = 'pet-member-card';
    card.dataset.petId = pet.id;
    if (pet.color) card.dataset.petColor = pet.color;

    const circle = document.createElement('div');
    circle.className = 'photo-circle';

    if (pet.photoUrl) {
      const img = document.createElement('img');
      img.src = pet.photoUrl;
      img.alt = pet.name || '';
      circle.appendChild(img);
    } else {
      const icon = document.createElement('span');
      icon.className = 'ph-icon';
      icon.style.fontSize = '2rem';
      icon.textContent = '🐾';
      circle.appendChild(icon);
    }

    const nameEl = document.createElement('p');
    nameEl.className = 'member-name';
    nameEl.textContent = pet.name || '';

    const speciesEl = document.createElement('p');
    speciesEl.className = 'member-role';
    speciesEl.textContent = pet.species || '';

    card.appendChild(circle);
    card.appendChild(nameEl);
    card.appendChild(speciesEl);

    const agePart   = pet.age ? `${pet.age} ano${pet.age !== '1' ? 's' : ''}` : '';
    const bdayPart  = pet.birthday || '';
    const infoText  = [agePart, bdayPart].filter(Boolean).join(' · ');
    if (infoText) {
      const infoEl = document.createElement('p');
      infoEl.style.cssText = 'font-size:0.75rem; color:var(--color-text-muted); margin-top:4px';
      infoEl.textContent = infoText;
      card.appendChild(infoEl);
    }

    if (pet.color) {
      card.addEventListener('click', () => {
        if (typeof window.applyPetColorTheme === 'function') {
          window.applyPetColorTheme(pet.color);
        }
      });
    }

    return card;
  }

  function activatePetFamilyEdit() {
    const grid = document.querySelector('.pets-family-grid');
    if (!grid) return;

    // Botões ✎ ✕ nos cards dinâmicos
    grid.querySelectorAll('[data-pet-id]').forEach(card => {
      if (card.querySelector('.pet-edit-controls')) return;
      const controls = document.createElement('div');
      controls.className = 'pet-edit-controls';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'tree-row-ctrl-btn';
      editBtn.title = 'Editar pet';
      editBtn.textContent = '✎';
      editBtn.addEventListener('click', e => {
        e.stopPropagation();
        showPetForm(card.dataset.petId);
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'tree-row-ctrl-btn delete-btn';
      delBtn.title = 'Remover pet';
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', e => {
        e.stopPropagation();
        deletePet(card.dataset.petId, card);
      });

      controls.appendChild(editBtn);
      controls.appendChild(delBtn);
      card.appendChild(controls);
    });

    // Card "+" clicável no edit mode
    const addCard = grid.querySelector('.pet-add-card');
    if (addCard) {
      addCard.style.cursor = 'pointer';
      addCard.style.opacity = '1';
      addCard._petClickHandler = () => showPetForm(null);
      addCard.addEventListener('click', addCard._petClickHandler);
    }
  }

  function deactivatePetFamilyEdit() {
    const grid = document.querySelector('.pets-family-grid');
    if (grid) {
      grid.querySelectorAll('.pet-edit-controls').forEach(c => c.remove());
      const addCard = grid.querySelector('.pet-add-card');
      if (addCard) {
        addCard.style.cursor = '';
        addCard.style.opacity = '';
        if (addCard._petClickHandler) {
          addCard.removeEventListener('click', addCard._petClickHandler);
          delete addCard._petClickHandler;
        }
      }
    }
    document.getElementById('adm-pet-form')?.remove();
  }

  function showPetForm(petId) {
    if (document.getElementById('adm-pet-form')) return;

    const pet = petId ? petFamilyItems.find(p => p.id === petId) : null;

    const form = document.createElement('div');
    form.id = 'adm-pet-form';
    form.className = 'adm-inline-form';
    form.style.maxWidth = '480px';
    form.innerHTML = `
      <div class="adm-form-preview" id="adm-pet-preview">
        ${pet && pet.photoUrl
          ? `<img src="${escapeAttr(pet.photoUrl)}" style="width:100%;height:100%;object-fit:cover;" />`
          : '<span style="font-size:2rem;color:var(--color-text-muted)">🐾</span>'}
      </div>
      <div class="adm-form-fields">
        <label class="adm-form-label">Foto (opcional)
          <input type="file" accept="image/*" id="adm-pet-file" class="adm-field-input" />
        </label>
        <label class="adm-form-label">Nome *
          <input type="text" id="adm-pet-name" class="adm-field-input" value="${escapeAttr(pet?.name || '')}" placeholder="Ex: Mel" />
        </label>
        <label class="adm-form-label">Espécie *
          <input type="text" id="adm-pet-species" class="adm-field-input" value="${escapeAttr(pet?.species || '')}" placeholder="Ex: Cachorra vira-lata" />
        </label>
        <label class="adm-form-label">Idade (anos)
          <input type="text" id="adm-pet-age" class="adm-field-input" value="${escapeAttr(pet?.age || '')}" placeholder="Ex: 3" />
        </label>
        <label class="adm-form-label">Aniversário
          <input type="text" id="adm-pet-birthday" class="adm-field-input" value="${escapeAttr(pet?.birthday || '')}" placeholder="Ex: 15 de março" />
        </label>
        <label class="adm-form-label">Cor do cartão
          <div class="pet-color-picker" id="adm-pet-colors">
            <button type="button" class="pet-color-swatch" data-color="green"  style="background:#85c885" title="Verde"></button>
            <button type="button" class="pet-color-swatch" data-color="blue"   style="background:#78b4d8" title="Azul"></button>
            <button type="button" class="pet-color-swatch" data-color="pink"   style="background:#e890b0" title="Rosa"></button>
            <button type="button" class="pet-color-swatch" data-color="red"    style="background:#d47070" title="Vermelho"></button>
            <button type="button" class="pet-color-swatch" data-color="yellow" style="background:#d4b850" title="Amarelo"></button>
            <button type="button" class="pet-color-swatch" data-color="gray"   style="background:#98a8bc" title="Cinza"></button>
            <button type="button" class="pet-color-swatch" data-color="purple" style="background:#a880d0" title="Roxo"></button>
          </div>
        </label>
        <div class="adm-form-actions">
          <button type="button" class="adm-btn-primary" id="adm-pet-submit">${pet ? 'Salvar' : 'Adicionar'}</button>
          <button type="button" class="adm-btn-secondary" id="adm-pet-cancel">Cancelar</button>
        </div>
      </div>
    `;

    const grid = document.querySelector('.pets-family-grid');
    if (grid) grid.parentNode.insertBefore(form, grid);

    document.getElementById('adm-pet-file').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const preview = document.getElementById('adm-pet-preview');
        if (preview) {
          preview.innerHTML = '';
          const img = document.createElement('img');
          img.src = ev.target.result;
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
          preview.appendChild(img);
        }
      };
      reader.readAsDataURL(file);
    });

    // Seletores de cor
    const colorPicker = document.getElementById('adm-pet-colors');
    if (colorPicker) {
      if (pet && pet.color) {
        const sel = colorPicker.querySelector(`[data-color="${pet.color}"]`);
        if (sel) sel.classList.add('selected');
      }
      colorPicker.querySelectorAll('.pet-color-swatch').forEach(btn => {
        btn.addEventListener('click', () => {
          colorPicker.querySelectorAll('.pet-color-swatch').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
        });
      });
    }

    document.getElementById('adm-pet-submit').addEventListener('click', () => submitPetForm(petId));
    document.getElementById('adm-pet-cancel').addEventListener('click', () => form.remove());
  }

  async function submitPetForm(petId) {
    const name     = document.getElementById('adm-pet-name')?.value.trim() || '';
    const species  = document.getElementById('adm-pet-species')?.value.trim() || '';
    const age      = document.getElementById('adm-pet-age')?.value.trim() || '';
    const birthday = document.getElementById('adm-pet-birthday')?.value.trim() || '';
    const color    = document.querySelector('#adm-pet-colors .pet-color-swatch.selected')?.dataset.color || '';
    const file     = document.getElementById('adm-pet-file')?.files[0];

    if (!name)    { showToast('Informe o nome do pet.', true); return; }
    if (!species) { showToast('Informe a espécie do pet.', true); return; }
    if (!window.FamilyDB) { showToast('DB não disponível.', true); return; }

    showToast('Salvando pet…');
    try {
      let photoUrl = petId ? (petFamilyItems.find(p => p.id === petId)?.photoUrl || null) : null;

      if (file && window.FamilyStorage) {
        const ext = window.FamilyStorage.getExtension(file);
        photoUrl = await window.FamilyStorage.uploadPhoto(file, `photos/pet/family/${Date.now()}.${ext}`);
      }

      if (petId) {
        const idx = petFamilyItems.findIndex(p => p.id === petId);
        if (idx !== -1) {
          petFamilyItems[idx] = { ...petFamilyItems[idx], name, species, age, birthday, photoUrl, color };
        }
      } else {
        petFamilyItems.push({ id: `pet_${Date.now()}`, name, species, age, birthday, photoUrl, color });
      }

      await savePetFamily();

      // Atualiza DOM
      const grid = document.querySelector('.pets-family-grid');
      if (grid) {
        grid.querySelectorAll('[data-pet-id]').forEach(c => c.remove());
        const addCard = grid.querySelector('.pet-add-card');
        petFamilyItems.forEach(pet => {
          const card = buildPetCard(pet);
          if (addCard) grid.insertBefore(card, addCard);
          else grid.appendChild(card);
        });
        activatePetFamilyEdit();
      }

      showToast(petId ? 'Pet atualizado ✓' : 'Pet adicionado ✓');
      document.getElementById('adm-pet-form')?.remove();
    } catch (e) {
      console.error('[PetFamily] Erro:', e);
      showToast('Erro ao salvar pet.', true);
    }
  }

  async function deletePet(id, el) {
    if (!confirm('Remover este pet?')) return;
    try {
      petFamilyItems = petFamilyItems.filter(p => p.id !== id);
      if (el) el.remove();
      await savePetFamily();
      showToast('Pet removido ✓');
    } catch (e) {
      console.error('[PetFamily] Erro ao remover:', e);
      showToast('Erro ao remover pet.', true);
    }
  }


  // ================================================================
  //  TREE MODULE — página: index
  // ================================================================

  let treeRows = [];
  let treeFormChildren = [];

  // ─── Migração de extra_members → extra_rows ─────────────────
  function migrateExtraMembers(data) {
    if (!data.extra_members || !data.extra_members.length) return;
    if (data.extra_rows && data.extra_rows.length) return; // já migrado
    data.extra_rows = data.extra_members.map((m, i) => ({
      id: m.id || `row_m_${i}`,
      placement: 'child',
      order: i,
      type: 'single',
      nameA: m.name || '',
      roleA: m.role || '',
      photoUrlA: m.photoUrl || null,
      nameB: '', roleB: '', photoUrlB: null,
      children: []
    }));
  }

  async function loadTreeRows() {
    if (currentPage() !== 'index') return;
    if (!window.FamilyDB) return;

    const data = await window.FamilyDB.loadContent('index');
    if (!data) return;

    migrateExtraMembers(data);
    if (!Array.isArray(data.extra_rows) || !data.extra_rows.length) return;

    treeRows = data.extra_rows;
    renderAllTreeRows(treeRows);
  }

  async function saveTreeRows() {
    const existing = (await window.FamilyDB.loadContent('index')) || {};
    existing.extra_rows = treeRows;
    delete existing.extra_members; // limpa campo legado
    await window.FamilyDB.saveContent('index', existing);
  }

  // ─── Renderização ────────────────────────────────────────────

  function renderAllTreeRows(rows) {
    // Remove casal do bebê, se existir
    removeBebeCouple();

    // Remove gerações acima existentes
    document.querySelector('.generation-above')?.remove();
    document.querySelector('.generation-grandparents')?.remove();
    // Remove linhas filho com data-row-id
    document.querySelectorAll('.generation-children > [data-row-id]').forEach(el => el.remove());

    const aboveRows      = rows.filter(r => r.placement === 'above').sort((a, b) => a.order - b.order);
    const aboveKassiRows = rows.filter(r => r.placement === 'above_kassi').sort((a, b) => a.order - b.order);
    const aboveNatanRows = rows.filter(r => r.placement === 'above_natan').sort((a, b) => a.order - b.order);
    const childRows      = rows.filter(r => r.placement === 'child').sort((a, b) => a.order - b.order);

    const tree       = document.querySelector('.family-tree');
    const genParents = document.querySelector('.generation-parents');

    // Renderiza linhas acima centradas (geração genérica)
    if (aboveRows.length > 0) {
      const section = document.createElement('div');
      section.className = 'generation-above';
      aboveRows.forEach(r => section.appendChild(renderAboveRow(r)));
      if (tree && genParents) tree.insertBefore(section, genParents);
    }

    // Renderiza avós por lado (above_kassi / above_natan)
    if (aboveKassiRows.length > 0 || aboveNatanRows.length > 0) {
      const gpSection = document.createElement('div');
      gpSection.className = 'generation-grandparents';

      const gpLeft = document.createElement('div');
      gpLeft.className = 'gp-side';
      aboveKassiRows.forEach(r => gpLeft.appendChild(renderAboveRow(r)));

      const spacer = document.createElement('div');
      spacer.className = 'gp-spacer';

      const gpRight = document.createElement('div');
      gpRight.className = 'gp-side';
      aboveNatanRows.forEach(r => gpRight.appendChild(renderAboveRow(r)));

      gpSection.appendChild(gpLeft);
      gpSection.appendChild(spacer);
      gpSection.appendChild(gpRight);

      if (tree && genParents) tree.insertBefore(gpSection, genParents);
    }

    // Renderiza linhas filhos
    const genChildren = document.querySelector('.generation-children');
    if (genChildren) {
      childRows.forEach(r => genChildren.appendChild(renderChildRow(r)));
      updateHasSiblings(genChildren);
    }

    // Aplica casal do bebê, se existir
    const bebeCoupleRow = rows.find(r => r.placement === 'bebe_couple');
    if (bebeCoupleRow) applyBebeCouple(bebeCoupleRow);
  }

  function updateHasSiblings(genChildren) {
    const count = genChildren.querySelectorAll(':scope > .child-branch').length;
    genChildren.classList.toggle('has-siblings', count >= 2);
  }

  function renderAboveRow(row) {
    const wrap = document.createElement('div');
    wrap.className = 'above-row tree-row-wrap';
    wrap.dataset.rowId = row.id;

    const genP = document.createElement('div');
    genP.className = 'generation-parents';

    if (row.type === 'couple') {
      genP.appendChild(buildMemberCard(row.nameA, row.roleA, row.photoUrlA));
      genP.appendChild(buildCoupleConnector());
      genP.appendChild(buildMemberCard(row.nameB, row.roleB, row.photoUrlB));
    } else if (row.type === 'trio') {
      genP.appendChild(buildMemberCard(row.nameA, row.roleA, row.photoUrlA));
      genP.appendChild(buildCoupleConnector());
      genP.appendChild(buildMemberCard(row.nameB, row.roleB, row.photoUrlB));
      genP.appendChild(buildTrioSeparator());
      genP.appendChild(buildMemberCard(row.nameC, row.roleC, row.photoUrlC));
    } else {
      genP.appendChild(buildMemberCard(row.nameA, row.roleA, row.photoUrlA));
    }
    wrap.appendChild(genP);

    const vline = document.createElement('div');
    vline.className = 'tree-v-line';
    wrap.appendChild(vline);

    wrap.appendChild(buildTreeRowControls(row.id));
    return wrap;
  }

  function renderChildRow(row) {
    const wrap = document.createElement('div');
    wrap.className = 'child-branch tree-row-wrap';
    if (row.type === 'couple') wrap.classList.add('child-branch--couple');
    wrap.dataset.rowId = row.id;

    const stem = document.createElement('div');
    stem.className = 'child-stem';
    wrap.appendChild(stem);

    if (row.type === 'couple' || row.type === 'trio') {
      const coupleRow = document.createElement('div');
      coupleRow.className = 'child-couple-row';
      coupleRow.appendChild(buildMemberCard(row.nameA, row.roleA, row.photoUrlA));
      coupleRow.appendChild(buildCoupleConnector());
      coupleRow.appendChild(buildMemberCard(row.nameB, row.roleB, row.photoUrlB));
      if (row.type === 'trio') {
        coupleRow.appendChild(buildTrioSeparator());
        coupleRow.appendChild(buildMemberCard(row.nameC, row.roleC, row.photoUrlC));
      }
      wrap.appendChild(coupleRow);

      if (row.children && row.children.length > 0) {
        const gc = document.createElement('div');
        gc.className = 'child-grandchildren';

        const gcVline = document.createElement('div');
        gcVline.className = 'tree-v-line';
        gc.appendChild(gcVline);

        const gcGen = document.createElement('div');
        gcGen.className = 'generation-children';
        if (row.children.length >= 2) gcGen.classList.add('has-siblings');

        row.children.forEach(child => {
          const cb = document.createElement('div');
          cb.className = 'child-branch';
          const cs = document.createElement('div');
          cs.className = 'child-stem';
          cb.appendChild(cs);
          cb.appendChild(buildMemberCard(child.name, child.role, child.photoUrl));
          gcGen.appendChild(cb);
        });

        gc.appendChild(gcGen);
        wrap.appendChild(gc);
      }
    } else {
      wrap.appendChild(buildMemberCard(row.nameA, row.roleA, row.photoUrlA));
    }

    wrap.appendChild(buildTreeRowControls(row.id));
    return wrap;
  }

  function buildMemberCard(name, role, photoUrl) {
    const card = document.createElement('div');
    card.className = 'member-card';

    const circle = document.createElement('div');
    circle.className = 'photo-circle';

    if (photoUrl) {
      const img = document.createElement('img');
      img.src = photoUrl;
      img.alt = name || '';
      circle.appendChild(img);
    } else {
      const icon = document.createElement('span');
      icon.className = 'ph-icon';
      icon.textContent = '👤';
      circle.appendChild(icon);
    }

    const nameEl = document.createElement('p');
    nameEl.className = 'member-name';
    nameEl.textContent = name || '';

    const roleEl = document.createElement('p');
    roleEl.className = 'member-role';
    roleEl.textContent = role || '';

    card.appendChild(circle);
    card.appendChild(nameEl);
    card.appendChild(roleEl);
    return card;
  }

  function buildCoupleConnector() {
    const conn = document.createElement('div');
    conn.className = 'couple-connector';
    conn.innerHTML = '<div class="conn-line"></div><span class="conn-heart">♥</span><div class="conn-line"></div>';
    return conn;
  }

  function buildTrioSeparator() {
    const sep = document.createElement('div');
    sep.className = 'trio-sep';
    sep.innerHTML = '<div class="trio-sep-line"></div>';
    return sep;
  }

  function buildTreeRowControls(rowId) {
    const controls = document.createElement('div');
    controls.className = 'tree-row-controls';

    const makeBtn = (title, action, text, extraClass) => {
      const btn = document.createElement('button');
      btn.className = 'tree-row-ctrl-btn' + (extraClass ? ' ' + extraClass : '');
      btn.title = title;
      btn.type = 'button';
      btn.textContent = text;
      btn.dataset.action = action;
      btn.dataset.rowId = rowId;
      btn.addEventListener('click', handleTreeRowControl);
      return btn;
    };

    controls.appendChild(makeBtn('Mover para cima', 'up', '▲'));
    controls.appendChild(makeBtn('Mover para baixo', 'down', '▼'));
    controls.appendChild(makeBtn('Remover', 'delete', '✕', 'delete-btn'));
    return controls;
  }

  function handleTreeRowControl(e) {
    e.stopPropagation();
    const { action, rowId } = e.currentTarget.dataset;
    if (action === 'up')        moveRowOrder(rowId, -1);
    if (action === 'down')      moveRowOrder(rowId, 1);
    if (action === 'delete')    deleteTreeRow(rowId);
    if (action === 'edit-bebe') showBebeCoupleEditForm(rowId);
  }

  // ─── Linhagem do bebê ────────────────────────────────────────

  function applyBebeCouple(row) {
    const genChildren = document.querySelector('.generation-children');
    if (!genChildren) return;
    const firstBranch = genChildren.querySelector(':scope > .child-branch:first-child');
    if (!firstBranch) return;

    // Marca o branch
    firstBranch.setAttribute('data-bebe-coupled', '');
    firstBranch.classList.add('child-branch--bebe-couple');

    // Pega o baby-card existente
    const babyCard = firstBranch.querySelector('.baby-card');
    if (!babyCard) return;

    // Cria child-couple-row envolvendo baby-card + connector + parceiro
    const coupleRow = document.createElement('div');
    coupleRow.className = 'child-couple-row';
    firstBranch.insertBefore(coupleRow, babyCard);
    coupleRow.appendChild(babyCard);
    coupleRow.appendChild(buildCoupleConnector());
    coupleRow.appendChild(buildMemberCard(row.nameB, row.roleB, row.photoUrlB));

    // Netos, se houver
    if (row.children && row.children.length > 0) {
      const gc = document.createElement('div');
      gc.className = 'child-grandchildren';

      const gcVline = document.createElement('div');
      gcVline.className = 'tree-v-line';
      gc.appendChild(gcVline);

      const gcGen = document.createElement('div');
      gcGen.className = 'generation-children';
      if (row.children.length >= 2) gcGen.classList.add('has-siblings');

      row.children.forEach(child => {
        const cb = document.createElement('div');
        cb.className = 'child-branch';
        const cs = document.createElement('div');
        cs.className = 'child-stem';
        cb.appendChild(cs);
        cb.appendChild(buildMemberCard(child.name, child.role, child.photoUrl));
        gcGen.appendChild(cb);
      });

      gc.appendChild(gcGen);
      firstBranch.appendChild(gc);
    }

    // Controles (editar e remover apenas, sem ▲▼)
    firstBranch.appendChild(buildBebeCoupleControls(row.id));
  }

  function removeBebeCouple() {
    const branch = document.querySelector('.child-branch[data-bebe-coupled]');
    if (!branch) return;

    // Extrai baby-card de volta para o branch
    const coupleRow = branch.querySelector('.child-couple-row');
    if (coupleRow) {
      const babyCard = coupleRow.querySelector('.baby-card');
      if (babyCard) {
        const stem = branch.querySelector('.child-stem');
        if (stem) {
          stem.after(babyCard);
        } else {
          branch.insertBefore(babyCard, coupleRow);
        }
      }
      coupleRow.remove();
    }

    // Remove netos e controles
    branch.querySelector('.child-grandchildren')?.remove();
    branch.querySelector('.tree-row-controls')?.remove();

    // Remove marcadores
    branch.removeAttribute('data-bebe-coupled');
    branch.classList.remove('child-branch--bebe-couple');
  }

  function buildBebeCoupleControls(rowId) {
    const controls = document.createElement('div');
    controls.className = 'tree-row-controls';

    const makeBtn = (title, action, text, extraClass) => {
      const btn = document.createElement('button');
      btn.className = 'tree-row-ctrl-btn' + (extraClass ? ' ' + extraClass : '');
      btn.title = title;
      btn.type = 'button';
      btn.textContent = text;
      btn.dataset.action = action;
      btn.dataset.rowId = rowId;
      btn.addEventListener('click', handleTreeRowControl);
      return btn;
    };

    controls.appendChild(makeBtn('Editar linhagem', 'edit-bebe', '✎'));
    controls.appendChild(makeBtn('Remover', 'delete', '✕', 'delete-btn'));
    return controls;
  }

  function showBebeCoupleEditForm(rowId) {
    if (document.getElementById('adm-bebe-couple-form')) return;

    const row = treeRows.find(r => r.id === rowId);
    if (!row) return;

    treeFormChildren = row.children ? [...row.children] : [];

    const form = document.createElement('div');
    form.id = 'adm-bebe-couple-form';
    form.className = 'adm-inline-form';
    form.style.maxWidth = '560px';
    form.innerHTML = `
      <div class="adm-form-fields" style="width:100%">
        <p style="font-size:0.78rem;font-weight:600;color:var(--color-text-muted);margin-bottom:var(--sp-sm)">✎ Editar linhagem do bebê</p>
        <div>
          <p style="font-size:0.75rem;color:var(--color-text-muted);margin-bottom:4px;font-weight:600">Parceiro(a) de Ethan / Darcy</p>
          <label class="adm-form-label">Foto (opcional)
            <input type="file" accept="image/*" id="adm-bebe-photoB" class="adm-field-input" />
          </label>
          ${row.photoUrlB ? `<img src="${escapeAttr(row.photoUrlB)}" style="width:60px;height:60px;object-fit:cover;border-radius:50%;margin:4px 0;" />` : ''}
          <label class="adm-form-label">Nome *
            <input type="text" id="adm-bebe-nameB" class="adm-field-input" value="${escapeAttr(row.nameB || '')}" placeholder="Ex: Ana" />
          </label>
          <label class="adm-form-label">Parentesco
            <input type="text" id="adm-bebe-roleB" class="adm-field-input" value="${escapeAttr(row.roleB || '')}" placeholder="Ex: Namorada" />
          </label>
        </div>
        <div style="margin-top:var(--sp-sm)">
          <p style="font-size:0.78rem;color:var(--color-text-muted);margin-bottom:4px">Filhos/Netos do casal</p>
          <div class="adm-children-list" id="adm-bebe-children-list"></div>
          <div style="display:flex;gap:var(--sp-xs);margin-top:var(--sp-xs);flex-wrap:wrap">
            <input type="text" id="adm-bebe-child-name" class="adm-field-input" placeholder="Nome" style="flex:1;min-width:100px" />
            <input type="text" id="adm-bebe-child-role" class="adm-field-input" placeholder="Parentesco" style="flex:1;min-width:100px" />
            <button type="button" class="adm-btn-secondary" id="adm-bebe-add-child-btn" style="white-space:nowrap">+ Filho</button>
          </div>
        </div>
        <div class="adm-form-actions">
          <button type="button" class="adm-btn-primary" id="adm-bebe-couple-submit">Salvar</button>
          <button type="button" class="adm-btn-secondary" id="adm-bebe-couple-cancel">Cancelar</button>
        </div>
      </div>
    `;

    const addBtn = document.getElementById('adm-add-member-btn');
    if (addBtn) addBtn.parentNode.insertBefore(form, addBtn);
    else document.querySelector('.family-tree')?.after(form);

    // Renderiza filhos existentes
    treeFormChildren.forEach(c => renderBebeCoupleChildEntry(c));

    document.getElementById('adm-bebe-add-child-btn').addEventListener('click', () => {
      const name = document.getElementById('adm-bebe-child-name').value.trim();
      const role = document.getElementById('adm-bebe-child-role').value.trim();
      if (!name) return;
      const child = { id: `child_${Date.now()}`, name, role, photoUrl: null };
      treeFormChildren.push(child);
      renderBebeCoupleChildEntry(child);
      document.getElementById('adm-bebe-child-name').value = '';
      document.getElementById('adm-bebe-child-role').value = '';
    });

    document.getElementById('adm-bebe-couple-submit').addEventListener('click', () => submitBebeCoupleEdit(rowId));
    document.getElementById('adm-bebe-couple-cancel').addEventListener('click', () => {
      form.remove();
      treeFormChildren = [];
    });
  }

  function renderBebeCoupleChildEntry(child) {
    const list = document.getElementById('adm-bebe-children-list');
    if (!list) return;
    const entry = document.createElement('div');
    entry.className = 'adm-child-entry';
    entry.dataset.childId = child.id;

    const span = document.createElement('span');
    span.textContent = child.name + (child.role ? ' — ' + child.role : '');
    entry.appendChild(span);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'adm-child-remove';
    removeBtn.setAttribute('aria-label', 'Remover filho');
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', () => {
      treeFormChildren = treeFormChildren.filter(c => c.id !== child.id);
      entry.remove();
    });
    entry.appendChild(removeBtn);
    list.appendChild(entry);
  }

  async function submitBebeCoupleEdit(rowId) {
    const nameB = document.getElementById('adm-bebe-nameB')?.value.trim() || '';
    const roleB = document.getElementById('adm-bebe-roleB')?.value.trim() || '';
    const fileB = document.getElementById('adm-bebe-photoB')?.files[0];

    if (!nameB) { showToast('Informe o nome do parceiro(a).', true); return; }

    const idx = treeRows.findIndex(r => r.id === rowId);
    if (idx === -1) return;

    showToast('Salvando…');
    try {
      let photoUrlB = treeRows[idx].photoUrlB;
      if (fileB && window.FamilyStorage) {
        const ext = window.FamilyStorage.getExtension(fileB);
        photoUrlB = await window.FamilyStorage.uploadPhoto(fileB, `tree/bebe_couple_b_${Date.now()}.${ext}`);
      }

      treeRows[idx] = { ...treeRows[idx], nameB, roleB, photoUrlB, children: [...treeFormChildren] };

      renderAllTreeRows(treeRows);
      await saveTreeRows();
      showToast('Linhagem do bebê atualizada ✓');
      document.getElementById('adm-bebe-couple-form')?.remove();
      treeFormChildren = [];
    } catch (e) {
      console.error('[Tree] Erro ao editar linhagem do bebê:', e);
      showToast('Erro ao salvar.', true);
    }
  }

  // ─── Edição da árvore ────────────────────────────────────────

  function activateTreeEdit() {
    document.body.classList.add('edit-mode');

    let btn = document.getElementById('adm-add-member-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'adm-add-member-btn';
      btn.type = 'button';
      btn.textContent = '+ Aumentar a árvore genealógica';
      btn.addEventListener('click', () => showTreeRowForm());
      const anchor = document.getElementById('tree-extra-members') || document.querySelector('.family-tree');
      if (anchor) anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    } else {
      btn.style.display = '';
    }
  }

  function deactivateTreeEdit() {
    document.body.classList.remove('edit-mode');
    const btn = document.getElementById('adm-add-member-btn');
    if (btn) btn.style.display = 'none';
    document.getElementById('adm-tree-row-form')?.remove();
  }

  function showTreeRowForm() {
    if (document.getElementById('adm-tree-row-form')) return;
    treeFormChildren = [];

    const form = document.createElement('div');
    form.id = 'adm-tree-row-form';
    form.className = 'adm-inline-form';
    form.innerHTML = `
      <div class="adm-form-fields" style="width:100%">
        <div style="display:flex;gap:var(--sp-sm);flex-wrap:wrap">
          <label class="adm-form-label" style="flex:1;min-width:140px">Posição
            <select id="adm-row-placement" class="adm-field-input">
              <option value="child">↓ Filho (abaixo)</option>
              <option value="above">↑ Acima (centrado)</option>
              <option value="above_kassi">↑ Acima de Kassi (lado esquerdo)</option>
              <option value="above_natan">↑ Acima de Natan (lado direito)</option>
              <option value="bebe_couple">👶 Linhagem do Bebê (Parceiro/Filhos)</option>
            </select>
          </label>
          <label class="adm-form-label" id="adm-row-type-wrap" style="flex:1;min-width:140px">Tipo
            <select id="adm-row-type" class="adm-field-input">
              <option value="single">Individual</option>
              <option value="couple">Casal ♥</option>
              <option value="trio">Casal ♥ + Individual</option>
            </select>
          </label>
        </div>

        <div class="adm-couple-previews">
          <div id="adm-row-personA">
            <p style="font-size:0.75rem;color:var(--color-text-muted);margin-bottom:4px;font-weight:600">Pessoa A</p>
            <label class="adm-form-label">Foto (opcional)
              <input type="file" accept="image/*" id="adm-row-photoA" class="adm-field-input" />
            </label>
            <label class="adm-form-label">Nome *
              <input type="text" id="adm-row-nameA" class="adm-field-input" placeholder="Ex: Vovó Maria" />
            </label>
            <label class="adm-form-label">Parentesco *
              <input type="text" id="adm-row-roleA" class="adm-field-input" placeholder="Ex: Avó" />
            </label>
          </div>
          <div id="adm-row-personB" style="display:none">
            <p style="font-size:0.75rem;color:var(--color-text-muted);margin-bottom:4px;font-weight:600" id="adm-row-personB-label">Pessoa B</p>
            <label class="adm-form-label">Foto (opcional)
              <input type="file" accept="image/*" id="adm-row-photoB" class="adm-field-input" />
            </label>
            <label class="adm-form-label">Nome
              <input type="text" id="adm-row-nameB" class="adm-field-input" placeholder="Ex: Vovô João" />
            </label>
            <label class="adm-form-label">Parentesco
              <input type="text" id="adm-row-roleB" class="adm-field-input" placeholder="Ex: Avô" />
            </label>
          </div>
          <div id="adm-row-personC" style="display:none">
            <p style="font-size:0.75rem;color:var(--color-text-muted);margin-bottom:4px;font-weight:600">Pessoa C (ao lado, sem conexão)</p>
            <label class="adm-form-label">Foto (opcional)
              <input type="file" accept="image/*" id="adm-row-photoC" class="adm-field-input" />
            </label>
            <label class="adm-form-label">Nome
              <input type="text" id="adm-row-nameC" class="adm-field-input" placeholder="Ex: Pai biológico" />
            </label>
            <label class="adm-form-label">Parentesco
              <input type="text" id="adm-row-roleC" class="adm-field-input" placeholder="Ex: Pai" />
            </label>
          </div>
        </div>

        <div id="adm-row-children-section" style="display:none">
          <p style="font-size:0.78rem;color:var(--color-text-muted);margin:var(--sp-sm) 0 4px">Filhos/Netos deste casal</p>
          <div class="adm-children-list" id="adm-row-children-list"></div>
          <div style="display:flex;gap:var(--sp-xs);margin-top:var(--sp-xs);flex-wrap:wrap">
            <input type="text" id="adm-child-name" class="adm-field-input" placeholder="Nome" style="flex:1;min-width:100px" />
            <input type="text" id="adm-child-role" class="adm-field-input" placeholder="Parentesco" style="flex:1;min-width:100px" />
            <button type="button" class="adm-btn-secondary" id="adm-add-child-btn" style="white-space:nowrap">+ Filho</button>
          </div>
        </div>

        <div class="adm-form-actions">
          <button type="button" class="adm-btn-primary" id="adm-tree-row-submit">Adicionar</button>
          <button type="button" class="adm-btn-secondary" id="adm-tree-row-cancel">Cancelar</button>
        </div>
      </div>
    `;

    const addBtn = document.getElementById('adm-add-member-btn');
    if (addBtn) addBtn.parentNode.insertBefore(form, addBtn);

    // Reage à mudança de tipo ou posição
    document.getElementById('adm-row-type').addEventListener('change', updateTreeFormLayout);
    document.getElementById('adm-row-placement').addEventListener('change', updateTreeFormLayout);

    // Adicionar filho à lista temporária
    document.getElementById('adm-add-child-btn').addEventListener('click', () => {
      const name = document.getElementById('adm-child-name').value.trim();
      const role = document.getElementById('adm-child-role').value.trim();
      if (!name) return;
      const child = { id: `child_${Date.now()}`, name, role, photoUrl: null };
      treeFormChildren.push(child);
      renderFormChildEntry(child);
      document.getElementById('adm-child-name').value = '';
      document.getElementById('adm-child-role').value = '';
    });

    document.getElementById('adm-tree-row-submit').addEventListener('click', submitNewTreeRow);
    document.getElementById('adm-tree-row-cancel').addEventListener('click', () => form.remove());
  }

  function updateTreeFormLayout() {
    const placement      = document.getElementById('adm-row-placement')?.value;
    const type           = document.getElementById('adm-row-type')?.value;
    const isBebeCouple   = placement === 'bebe_couple';
    const isCouple       = type === 'couple';
    const isTrio         = type === 'trio';
    const isChild        = placement === 'child';
    const isAboveSide    = placement === 'above_kassi' || placement === 'above_natan';

    // Oculta o select de tipo quando bebe_couple
    const typeWrap = document.getElementById('adm-row-type-wrap');
    if (typeWrap) typeWrap.style.display = isBebeCouple ? 'none' : '';

    // Oculta Pessoa A quando bebe_couple
    const personA = document.getElementById('adm-row-personA');
    if (personA) personA.style.display = isBebeCouple ? 'none' : '';

    // Mostra Pessoa B se bebe_couple, casal ou trio
    const personB = document.getElementById('adm-row-personB');
    if (personB) {
      personB.style.display = (isBebeCouple || isCouple || isTrio) ? '' : 'none';
      const label = document.getElementById('adm-row-personB-label');
      if (label) label.textContent = isBebeCouple ? 'Parceiro(a) de Ethan / Darcy' : isTrio ? 'Pessoa B (do casal)' : 'Pessoa B';
    }

    // Mostra Pessoa C somente se trio
    const personC = document.getElementById('adm-row-personC');
    if (personC) personC.style.display = isTrio ? '' : 'none';

    // Mostra filhos apenas se bebe_couple ou (casal + filho); não para above_kassi/above_natan, nem trio
    const section = document.getElementById('adm-row-children-section');
    if (section) section.style.display = (isBebeCouple || (isCouple && isChild && !isAboveSide)) ? '' : 'none';
  }

  function renderFormChildEntry(child) {
    const list = document.getElementById('adm-row-children-list');
    if (!list) return;
    const entry = document.createElement('div');
    entry.className = 'adm-child-entry';
    entry.dataset.childId = child.id;
    entry.innerHTML = `
      <span>${escapeAttr(child.name)}${child.role ? ' — ' + escapeAttr(child.role) : ''}</span>
      <button type="button" class="adm-child-remove" aria-label="Remover filho">✕</button>
    `;
    entry.querySelector('.adm-child-remove').addEventListener('click', () => {
      treeFormChildren = treeFormChildren.filter(c => c.id !== child.id);
      entry.remove();
    });
    list.appendChild(entry);
  }

  async function submitNewTreeRow() {
    const placement = document.getElementById('adm-row-placement')?.value || 'child';

    // ─── Linhagem do bebê ────────────────────────────────────────
    if (placement === 'bebe_couple') {
      if (treeRows.some(r => r.placement === 'bebe_couple')) {
        showToast('A linhagem do bebê já está configurada. Edite-a diretamente na árvore.', true);
        return;
      }

      const nameB = document.getElementById('adm-row-nameB')?.value.trim() || '';
      const roleB = document.getElementById('adm-row-roleB')?.value.trim() || '';
      const fileB = document.getElementById('adm-row-photoB')?.files[0];

      if (!nameB) { showToast('Informe o nome do parceiro(a).', true); return; }

      showToast('Adicionando…');
      try {
        let photoUrlB = null;
        if (fileB && window.FamilyStorage) {
          const ext = window.FamilyStorage.getExtension(fileB);
          photoUrlB = await window.FamilyStorage.uploadPhoto(fileB, `tree/bebe_couple_b_${Date.now()}.${ext}`);
        }

        const newRow = {
          id: 'bebe_couple',
          placement: 'bebe_couple',
          nameB, roleB, photoUrlB,
          children: [...treeFormChildren]
        };

        treeRows.push(newRow);
        renderAllTreeRows(treeRows);
        await saveTreeRows();
        showToast('Linhagem do bebê adicionada ✓');
        document.getElementById('adm-tree-row-form')?.remove();
        treeFormChildren = [];
      } catch (e) {
        console.error('[Tree] Erro:', e);
        showToast('Erro ao adicionar.', true);
      }
      return;
    }

    // ─── Row normal ──────────────────────────────────────────────
    const type  = document.getElementById('adm-row-type')?.value || 'single';
    const nameA = document.getElementById('adm-row-nameA')?.value.trim() || '';
    const roleA = document.getElementById('adm-row-roleA')?.value.trim() || '';
    const nameB = document.getElementById('adm-row-nameB')?.value.trim() || '';
    const roleB = document.getElementById('adm-row-roleB')?.value.trim() || '';
    const nameC = document.getElementById('adm-row-nameC')?.value.trim() || '';
    const roleC = document.getElementById('adm-row-roleC')?.value.trim() || '';
    const fileA = document.getElementById('adm-row-photoA')?.files[0];
    const fileB = document.getElementById('adm-row-photoB')?.files[0];
    const fileC = document.getElementById('adm-row-photoC')?.files[0];

    if (!nameA) { showToast('Informe o nome da Pessoa A.', true); return; }
    if (!roleA) { showToast('Informe o parentesco da Pessoa A.', true); return; }

    showToast('Adicionando…');
    try {
      let photoUrlA = null, photoUrlB = null, photoUrlC = null;
      const ts = Date.now();

      if (fileA && window.FamilyStorage) {
        const ext = window.FamilyStorage.getExtension(fileA);
        photoUrlA = await window.FamilyStorage.uploadPhoto(fileA, `tree/row_${ts}_a.${ext}`);
      }
      if (fileB && (type === 'couple' || type === 'trio') && window.FamilyStorage) {
        const ext = window.FamilyStorage.getExtension(fileB);
        photoUrlB = await window.FamilyStorage.uploadPhoto(fileB, `tree/row_${ts}_b.${ext}`);
      }
      if (fileC && type === 'trio' && window.FamilyStorage) {
        const ext = window.FamilyStorage.getExtension(fileC);
        photoUrlC = await window.FamilyStorage.uploadPhoto(fileC, `tree/row_${ts}_c.${ext}`);
      }

      const sameGroup = treeRows.filter(r => r.placement === placement);
      const maxOrder  = sameGroup.length > 0 ? Math.max(...sameGroup.map(r => r.order)) + 1 : 0;

      const newRow = {
        id: `row_${ts}`,
        placement,
        order: maxOrder,
        type,
        nameA, roleA, photoUrlA,
        nameB: (type === 'couple' || type === 'trio') ? nameB : '',
        roleB: (type === 'couple' || type === 'trio') ? roleB : '',
        photoUrlB: (type === 'couple' || type === 'trio') ? photoUrlB : null,
        nameC: type === 'trio' ? nameC : '',
        roleC: type === 'trio' ? roleC : '',
        photoUrlC: type === 'trio' ? photoUrlC : null,
        children: (type === 'couple' && placement === 'child') ? [...treeFormChildren] : []
      };

      treeRows.push(newRow);
      renderAllTreeRows(treeRows);
      await saveTreeRows();
      showToast('Adicionado ✓');
      document.getElementById('adm-tree-row-form')?.remove();
      treeFormChildren = [];
    } catch (e) {
      console.error('[Tree] Erro:', e);
      showToast('Erro ao adicionar.', true);
    }
  }

  async function moveRowOrder(id, delta) {
    const row = treeRows.find(r => r.id === id);
    if (!row) return;

    const group    = treeRows.filter(r => r.placement === row.placement).sort((a, b) => a.order - b.order);
    const idx      = group.findIndex(r => r.id === id);
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= group.length) return;

    const temp = group[idx].order;
    group[idx].order = group[targetIdx].order;
    group[targetIdx].order = temp;

    renderAllTreeRows(treeRows);
    try {
      await saveTreeRows();
      showToast('Ordem atualizada ✓');
    } catch (e) {
      console.error('[Tree] Erro ao mover:', e);
      showToast('Erro ao salvar ordem.', true);
    }
  }

  async function deleteTreeRow(id) {
    if (!confirm('Remover esta linha da árvore?')) return;
    try {
      treeRows = treeRows.filter(r => r.id !== id);
      renderAllTreeRows(treeRows);
      await saveTreeRows();
      showToast('Removido ✓');
    } catch (e) {
      console.error('[Tree] Erro ao remover:', e);
      showToast('Erro ao remover.', true);
    }
  }


  // ─── API pública (chamada por auth.js) ──────────────────────────

  /** Ativa o botão de edição (família logada) */
  window.initEditor = function () {
    injectEditButton();
    const btn = document.getElementById('edit-toggle-btn');
    if (btn) btn.style.display = 'flex';
  };

  /** Desativa o editor (logout) */
  window.deactivateEditor = function () {
    if (editMode) {
      editMode = false;
      deactivateEditing();
      deactivatePageFeatures();
    }
    const btn = document.getElementById('edit-toggle-btn');
    if (btn) {
      btn.style.display = 'none';
      btn.textContent = '✏️ Editar';
      btn.classList.remove('save-mode');
    }
  };

  // ─── Carrega conteúdo ao iniciar a página ──────────────────────
  document.addEventListener('DOMContentLoaded', async () => {
    // Aguarda o Supabase estar pronto (máx. 2s)
    await new Promise(resolve => {
      let tries = 0;
      const check = () => {
        if (window.sbClient || tries >= 20) resolve();
        else { tries++; setTimeout(check, 100); }
      };
      check();
    });

    await loadPageContent();
    await loadGallery();
    await loadProfileGallery();
    await loadChildhoodGallery();
    await loadTreeRows();
    await loadPetFamily();
    applyPhotoPositions(_cachedPageData);
  });

})();
