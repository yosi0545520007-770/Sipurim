-- פיתוח בלבד! מכבה RLS ונותן הרשאות מלאות ל-anon/authenticated
begin;
create extension if not exists "pgcrypto";

-- כיבוי RLS בכל הטבלאות הציבוריות
alter table if exists public.profiles   disable row level security;
alter table if exists public.series     disable row level security;
alter table if exists public.stories    disable row level security;
alter table if exists public.memorials  disable row level security;
alter table if exists public.faq        disable row level security;
alter table if exists public.contact_messages disable row level security;
alter table if exists public.tags       disable row level security;
alter table if exists public.story_tags disable row level security;

-- הרשאות מלאות ל-anon/authenticated על schema public
grant usage on schema public to anon, authenticated;
grant all privileges on all tables    in schema public to anon, authenticated;
grant all privileges on all sequences in schema public to anon, authenticated;
alter default privileges for role postgres in schema public grant all on tables    to anon, authenticated;
alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated;

-- Storage: כיבוי RLS והרשאות מלאות (אופציונלי, כלול כאן לנוחות)
alter table if exists storage.objects disable row level security;
grant usage on schema storage to anon, authenticated;
grant all privileges on all tables    in schema storage to anon, authenticated;
grant all privileges on all sequences in schema storage to anon, authenticated;
alter default privileges for role postgres in schema storage grant all on tables    to anon, authenticated;
alter default privileges for role postgres in schema storage grant all on sequences to anon, authenticated;

commit;

