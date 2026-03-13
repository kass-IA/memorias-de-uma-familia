// ================================================================
//  storage.js — Supabase Storage: upload de fotos
//  Bucket: "photos" (público)
// ================================================================

window.FamilyStorage = {

  /**
   * Converte data-photo-key em caminho no Storage.
   * "mae_profile"  → "mae/profile.jpg"
   * "tree_mae"     → "tree/mae.jpg"
   * @param {string} key
   * @param {string} extension
   */
  keyToPath(key, extension) {
    const ext = extension || 'jpg';
    const idx = key.indexOf('_');
    if (idx === -1) return `${key}.${ext}`;
    return `${key.slice(0, idx)}/${key.slice(idx + 1)}.${ext}`;
  },

  /**
   * Comprime a imagem usando Canvas antes do upload.
   * Reduz fotos de celular (3–10 MB) para ~300–500 KB sem perda visível.
   * @param {File}   file
   * @param {number} maxDim   — dimensão máxima em px (padrão 1920)
   * @param {number} quality  — qualidade JPEG 0–1 (padrão 0.82)
   * @returns {Promise<File>}
   */
  compressImage(file, maxDim = 1920, quality = 0.82) {
    return new Promise((resolve) => {
      // GIF não comprimimos (quebraria animações)
      // Arquivos já pequenos também não precisam
      if (file.type === 'image/gif' || file.size < 300 * 1024) {
        resolve(file);
        return;
      }

      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        let { width, height } = img;

        // Só redimensiona se maior que o limite
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width  = Math.round(width  * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; }
            // Nomeia como .jpg já que Canvas gera JPEG
            const name = file.name.replace(/\.[^.]+$/, '.jpg');
            resolve(new File([blob], name, { type: 'image/jpeg' }));
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  },

  /**
   * Faz upload para o bucket "photos" e retorna a URL pública.
   * Comprime automaticamente antes de enviar.
   * @param {File}   file
   * @param {string} storagePath  — ex: "mae/profile.jpg"
   * @returns {Promise<string>}
   */
  async uploadPhoto(file, storagePath) {
    if (!window.sbClient) throw new Error('Supabase não inicializado.');

    // Garante que a sessão está ativa antes de tentar o upload
    if (window.ensureSbSession) {
      const ok = await window.ensureSbSession();
      if (!ok) throw new Error('SESSION_EXPIRED');
    }

    // Comprime a imagem (crucial para fotos de celular)
    const compressed = await this.compressImage(file);

    // Ajusta o caminho para .jpg se foi comprimida
    const finalPath = compressed.type === 'image/jpeg'
      ? storagePath.replace(/\.[^.]+$/, '.jpg')
      : storagePath;

    const { error } = await window.sbClient.storage
      .from('photos')
      .upload(finalPath, compressed, {
        upsert: true,
        contentType: compressed.type
      });

    if (error) throw error;

    const { data } = window.sbClient.storage
      .from('photos')
      .getPublicUrl(finalPath);

    return data.publicUrl;
  },

  /**
   * Infere extensão do arquivo de imagem.
   * @param {File} file
   * @returns {string}
   */
  getExtension(file) {
    const map = {
      'image/jpeg': 'jpg',
      'image/png':  'png',
      'image/webp': 'webp',
      'image/gif':  'gif',
      'image/avif': 'avif',
    };
    return map[file.type] || 'jpg';
  }

};
