-- העברת הרשאות לטבלאות ל-roles של ה-API. ה-RLS עדיין אוכף גישה לשורות.
grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

-- ברירת מחדל לטבלאות עתידיות שייווצרו ע"י postgres
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

-- רענון cache הסכמה של PostgREST
notify pgrst, 'reload schema';
