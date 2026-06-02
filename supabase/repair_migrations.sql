-- =============================================================================
-- SUPABASE MIGRATION REPAIR – futtasd a Supabase Dashboard → SQL Editor-ban
-- =============================================================================
-- 1) Storage policy törlése (already exists hiba elkerülése)
DROP POLICY IF EXISTS "Service role can download from documents" ON storage.objects;

-- 2) Migration bejegyzések törlése – így a következő "db push" újra lefuttatja
--    a 20251105123045 és 20251109201708 migrationöket (már idempotens verzióval).
--    Ha a tábla máshol van, cseréld: supabase_migrations.schema_migrations
DELETE FROM supabase_migrations.schema_migrations
WHERE version IN ('20251105123045', '20251109201708');
