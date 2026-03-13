-- ================================================================
--  supabase-setup.sql — Memórias de uma Família
--  Execute este SQL no Supabase: SQL Editor → New query → Run
-- ================================================================


-- ── 1. Tabela de conteúdo editável ──────────────────────────────
CREATE TABLE IF NOT EXISTS content (
  page        text        PRIMARY KEY,
  data        jsonb       NOT NULL DEFAULT '{}',
  updated_at  timestamptz DEFAULT now()
);


-- ── 2. Tabela de papéis de usuário ──────────────────────────────
CREATE TABLE IF NOT EXISTS user_roles (
  user_id      uuid  REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role         text  NOT NULL DEFAULT 'guest',
  display_name text
);


-- ── 3. Função auxiliar: verifica se o usuário é família ─────────
CREATE OR REPLACE FUNCTION is_family()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'family'
  );
$$;


-- ── 4. RLS (Row Level Security) — tabela content ────────────────
ALTER TABLE content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "content_public_read"    ON content;
DROP POLICY IF EXISTS "content_family_insert"  ON content;
DROP POLICY IF EXISTS "content_family_update"  ON content;

CREATE POLICY "content_public_read"   ON content FOR SELECT USING (true);
CREATE POLICY "content_family_insert" ON content FOR INSERT WITH CHECK (is_family());
CREATE POLICY "content_family_update" ON content FOR UPDATE USING (is_family());


-- ── 5. RLS — tabela user_roles ───────────────────────────────────
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_own_read" ON user_roles;

CREATE POLICY "user_roles_own_read" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);


-- ── 6. Bucket de fotos (Storage) ────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "storage_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "storage_family_upload" ON storage.objects;
DROP POLICY IF EXISTS "storage_family_update" ON storage.objects;

CREATE POLICY "storage_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'photos');

CREATE POLICY "storage_family_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'photos' AND is_family());

CREATE POLICY "storage_family_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'photos' AND is_family());

INSERT INTO user_roles (user_id, role, display_name)
 VALUES ('e6f9b361-3718-4706-8934-87716ce131cf', 'family', 'Família');
