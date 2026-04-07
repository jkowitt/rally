-- Extend ui_content for CMS functionality
ALTER TABLE ui_content ADD COLUMN IF NOT EXISTS content_type text DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'html', 'json'));
ALTER TABLE ui_content ADD COLUMN IF NOT EXISTS page text; -- which page this belongs to
ALTER TABLE ui_content ADD COLUMN IF NOT EXISTS draft_value text; -- staged changes before publish
ALTER TABLE ui_content ADD COLUMN IF NOT EXISTS published boolean DEFAULT true;
ALTER TABLE ui_content ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES profiles(id);

-- Allow developer to delete content
CREATE POLICY "ui_delete" ON ui_content FOR DELETE USING (is_developer());

-- CMS media uploads
CREATE TABLE IF NOT EXISTS cms_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_data text NOT NULL, -- base64
  mime_type text,
  width integer,
  height integer,
  alt_text text,
  page text,
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cms_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media_read_all" ON cms_media FOR SELECT USING (true);
CREATE POLICY "media_manage_dev" ON cms_media FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'developer')
);

CREATE INDEX IF NOT EXISTS idx_cms_media_page ON cms_media(page);
CREATE INDEX IF NOT EXISTS idx_ui_content_page ON ui_content(page);
