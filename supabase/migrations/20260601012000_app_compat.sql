-- =====================================================================
-- התאמת הסכמה למודל האפליקציה הקיימת (שלהבת RN) למעבר חלק
-- =====================================================================

-- ---------- profiles: עמודות שהאפליקציה מצפה להן (היו על users) ----------
alter table profiles
  add column if not exists email text,
  add column if not exists coach_name text default 'שלהבת מחטבת',
  add column if not exists coach_phone text default '0542213199',
  add column if not exists client_type text,
  add column if not exists coach_status text,
  add column if not exists coach_tags jsonb not null default '[]'::jsonb,
  add column if not exists habit_assignments jsonb not null default '[]'::jsonb,
  add column if not exists check_in_template jsonb not null default '{}'::jsonb,
  add column if not exists coach_private_notes text not null default '',
  add column if not exists notes text default '',
  add column if not exists code text;

-- ---------- טריגר יצירת profile בהרשמה: email + name + role ממטא-דאטה ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (
    id, full_name, email, phone, role, weight, height, age, goal,
    activity_level, coach_name, coach_phone
  )
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.raw_user_meta_data->>'phone',
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'client'),
    nullif(new.raw_user_meta_data->>'weight', '')::numeric,
    nullif(new.raw_user_meta_data->>'height', '')::numeric,
    nullif(new.raw_user_meta_data->>'age', '')::int,
    coalesce(nullif(new.raw_user_meta_data->>'goal', ''), 'חיטוב'),
    'מתונה',
    'שלהבת מחטבת',
    '0542213199'
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- ---------- food_diary_entries: רשומה-לכל-תאריך עם meals JSON (כמו הבקאנד) ----------
drop table if exists food_diary_entries cascade;
create table food_diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  entry_date date not null,
  meals jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);
create index idx_food_diary_user_date on food_diary_entries(user_id, entry_date desc);

alter table food_diary_entries enable row level security;
drop policy if exists food_diary_owner_coach on food_diary_entries;
create policy food_diary_owner_coach on food_diary_entries for all
  using (user_id = auth.uid() or public.is_coach_of(user_id))
  with check (user_id = auth.uid() or public.is_coach_of(user_id));

grant all on food_diary_entries to anon, authenticated, service_role;

drop trigger if exists trg_food_diary_updated on food_diary_entries;
create trigger trg_food_diary_updated before update on food_diary_entries
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
