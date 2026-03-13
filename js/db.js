// ================================================================
//  db.js — Supabase: leitura e escrita de conteúdo
//
//  Tabela Supabase: content (page text PK, data jsonb, updated_at)
// ================================================================

window.FamilyDB = {

  /**
   * Carrega o conteúdo de uma página do Supabase.
   * @param {string} page  — ex: "mae", "pai", "index"
   * @returns {Object|null}
   */
  async loadContent(page) {
    if (!window.sbClient) return null;
    try {
      const { data, error } = await window.sbClient
        .from('content')
        .select('data')
        .eq('page', page)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = row not found, ignorável
        console.warn('[FamilyDB] Erro ao carregar:', error.message);
      }
      return data?.data || null;
    } catch (e) {
      console.warn('[FamilyDB] Falha na conexão:', e.message);
      return null;
    }
  },

  /**
   * Salva (upsert) conteúdo de uma página no Supabase.
   * Requer autenticação com role "family".
   * @param {string} page
   * @param {Object} contentData
   */
  async saveContent(page, contentData) {
    if (!window.sbClient) throw new Error('Supabase não inicializado.');

    // Garante que a sessão está ativa antes de tentar salvar
    if (window.ensureSbSession) {
      const ok = await window.ensureSbSession();
      if (!ok) throw new Error('SESSION_EXPIRED');
    }

    const { error } = await window.sbClient
      .from('content')
      .upsert(
        { page, data: contentData, updated_at: new Date().toISOString() },
        { onConflict: 'page' }
      );
    if (error) throw error;
  },

  /**
   * Aplica dados do Supabase aos elementos do DOM.
   * - [data-field="key"]      → textContent = data[key]
   * - [data-photo-key="key"] → img.src = data[key + "Url"]
   * @param {Object} data
   */
  applyContentToDOM(data) {
    if (!data) return;
    Object.entries(data).forEach(([key, value]) => {
      if (!value) return;

      // Textos
      const textEl = document.querySelector(`[data-field="${key}"]`);
      if (textEl) textEl.textContent = value;

      // Fotos (chave termina em "Url")
      if (key.endsWith('Url')) {
        const photoKey = key.slice(0, -3);
        const wrap = document.querySelector(`[data-photo-key="${photoKey}"]`);
        if (wrap) {
          let img = wrap.querySelector('img');
          if (!img) {
            img = document.createElement('img');
            img.alt = photoKey;
            wrap.insertBefore(img, wrap.firstChild);
          }
          img.src = value;
        }
      }

      // Posição da foto (chave termina em "Position")
      if (key.endsWith('Position')) {
        const photoKey = key.slice(0, -8);
        const wrap = document.querySelector(`[data-photo-key="${photoKey}"]`);
        if (wrap) {
          const img = wrap.querySelector('img');
          if (img) img.style.objectPosition = value;
        }
      }

      // Modo de exibição (chave termina em "Fit")
      if (key.endsWith('Fit')) {
        const photoKey = key.slice(0, -3);
        const wrap = document.querySelector(`[data-photo-key="${photoKey}"]`);
        if (wrap) {
          const img = wrap.querySelector('img');
          if (img) img.style.objectFit = value;
        }
      }
    });
  }

};
