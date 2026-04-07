-- Make contact_research a shared global cache (not property-scoped)
-- Any user can read cached research. Only the fetching user's property_id is stored for tracking.

-- Drop existing restrictive RLS policy
DROP POLICY IF EXISTS "research_property_access" ON contact_research;

-- Allow all authenticated users to read the cache
CREATE POLICY "research_read_all" ON contact_research FOR SELECT USING (true);

-- Allow inserts from any authenticated user
CREATE POLICY "research_insert_any" ON contact_research FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only developer can delete/update
CREATE POLICY "research_manage_dev" ON contact_research FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'developer')
);
CREATE POLICY "research_delete_dev" ON contact_research FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'developer')
);
