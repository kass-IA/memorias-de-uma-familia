// ================================================================
//  supabase-config.js — Memórias de uma Família
//  Inicializa o cliente Supabase (URL + anon key do projeto)
// ================================================================

const SUPABASE_URL      = 'https://tqyjwmcxolhkhowzdtwg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxeWp3bWN4b2xoa2hvd3pkdHdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4OTQ3MzEsImV4cCI6MjA4NzQ3MDczMX0.hDuBOG9AjDvcwLd9WoBkL7SvShJxCZT51Hzqz4tf-h4';

window.sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession:   true,   // salva sessão no localStorage (padrão, explicitado)
    autoRefreshToken: true,   // renova token automaticamente antes de expirar
    detectSessionInUrl: false // evita conflitos em navegadores mobile com URL callbacks
  },
  global: {
    // Aumenta o timeout para redes móveis lentas (padrão é ~8s)
    fetch: (url, options = {}) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 20000); // 20s timeout
      return fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(id));
    }
  }
});
