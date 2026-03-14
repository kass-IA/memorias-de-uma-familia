// ================================================================
//  supabase-config.js — Memórias de uma Família
//  Inicializa o cliente Supabase (URL + anon key do projeto)
// ================================================================

const SUPABASE_URL      = 'https://tqyjwmcxolhkhowzdtwg.supabase.co';

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
