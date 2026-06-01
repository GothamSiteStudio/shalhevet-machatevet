-- =====================================================================
-- שלהבת מחטבת — סכמת Supabase מאוחדת (v1)
-- בסיס: הסכמה הקיימת של שלהבת (Node/Postgres) + ישויות ששוחזרו מ-All-in-Fit
-- יעד: פרויקט Supabase חדש (Postgres 15+). הרצה: supabase db push / SQL editor.
-- מודל הרשאות: auth.users של Supabase + טבלת profiles, עם RLS לכל טבלה.
-- =====================================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- Enums ----------
do $$ begin create type user_role as enum ('coach','client','admin'); exception when duplicate_object then null; end $$;
do $$ begin create type relationship_status as enum ('active','paused','ended'); exception when duplicate_object then null; end $$;
do $$ begin create type meal_type as enum ('breakfast','lunch','dinner','snack'); exception when duplicate_object then null; end $$;
do $$ begin create type photo_pose as enum ('front','side','back','other'); exception when duplicate_object then null; end $$;

-- =====================================================================
-- FOUNDATION
-- =====================================================================

-- profiles: 1:1 עם auth.users
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'client',
  full_name text,
  phone text,
  avatar_url text,
  weight numeric,
  height numeric,
  age integer,
  goal text,
  activity_level text,
  -- מיתוג מאמן (coach branding / portal)
  coach_logo_url text,
  coach_page jsonb not null default '{}'::jsonb,
  -- תבניות גלובליות של המאמנת (שכבת ההתאמה הייחודית של שלהבת)
  quick_message_templates jsonb not null default '[]'::jsonb,
  plan_template_profiles jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- coach_client_relationships: מאמנת ↔ לקוחות (רב-לקוחות). נתוני "המאמנת על הלקוחה" יושבים כאן.
create table if not exists coach_client_relationships (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles(id) on delete cascade,
  client_id uuid not null references profiles(id) on delete cascade,
  status relationship_status not null default 'active',
  client_type text,                                   -- "סוג לקוחה" לתבניות
  coach_status text,                                  -- סטטוס ליווי פנימי
  coach_tags jsonb not null default '[]'::jsonb,
  coach_private_notes text not null default '',
  habit_assignments jsonb not null default '[]'::jsonb,
  check_in_template jsonb not null default '{}'::jsonb,
  created_by uuid references profiles(id),
  coach_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (coach_id, client_id)
);
create index if not exists idx_ccr_coach on coach_client_relationships(coach_id);
create index if not exists idx_ccr_client on coach_client_relationships(client_id);

-- coach_invites: הזמנת לקוחה בקוד
create table if not exists coach_invites (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles(id) on delete cascade,
  code text not null unique,
  client_email text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- =====================================================================
-- COACHING / PLANS  (פורט מהסכמה הקיימת של שלהבת)
-- =====================================================================

create table if not exists client_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles(id) on delete cascade,
  weight_goal_kg numeric,
  weekly_workout_target integer,
  daily_steps_target integer,
  daily_water_target_liters numeric,
  calorie_target integer,
  protein_target integer,
  target_date text,
  notes text,
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists nutrition_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles(id) on delete cascade,
  title text,
  notes text,
  daily_targets jsonb not null default '{}'::jsonb,
  meals jsonb not null default '[]'::jsonb,
  pinned_menu jsonb not null default '{}'::jsonb,
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles(id) on delete cascade,
  title text,
  goal_focus text,
  notes text,
  weekly_targets jsonb not null default '{}'::jsonb,
  days jsonb not null default '[]'::jsonb,
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists weight_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  weight numeric not null,
  entry_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, entry_date)
);
create index if not exists idx_weight_user_date on weight_history(user_id, entry_date desc);

create table if not exists updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  text text not null,
  update_date date,
  read_by_coach boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_updates_user on updates(user_id, created_at desc);

create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  requested_date text not null,
  notes text,
  status text not null default 'ממתין לאישור',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  thread_user_id uuid not null references profiles(id) on delete cascade,  -- הלקוחה שעליה השיחה
  from_id uuid references profiles(id),
  to_id uuid references profiles(id),
  from_role text,
  text text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_thread on messages(thread_user_id, created_at desc);

create table if not exists check_in_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  week_key text not null,
  template jsonb not null default '{}'::jsonb,
  answers jsonb not null default '[]'::jsonb,
  note text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, week_key)
);

create table if not exists habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  habit_id text not null,
  log_date date not null,
  completed boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, habit_id, log_date)
);

-- =====================================================================
-- FITNESS  (שוחזר מ-All-in-Fit)
-- =====================================================================

-- ספריית תרגילים (גלובלי / מותאם מאמנת), מדיה ב-Storage
create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  muscle_groups text[] not null default '{}',
  equipment text[] not null default '{}',
  video_url text,
  image_url text,
  instructions jsonb not null default '[]'::jsonb,
  is_custom boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_exercises_creator on exercises(created_by);

-- routines = תבנית אימון לשימוש חוזר (יכולה להיות תבנית מאמנת או של מתאמנת)
create table if not exists routines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  is_template boolean not null default false,
  days jsonb not null default '[]'::jsonb,   -- [{name, exercises:[{exercise_id, sets, reps, rest}]}]
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- אימון מבוצע (לחישוב נפח / שיאים / רצף)
create table if not exists workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  routine_id uuid references routines(id) on delete set null,
  performed_at timestamptz not null default now(),
  duration_seconds integer,
  total_volume numeric,
  exercises jsonb not null default '[]'::jsonb,  -- [{exercise_id, sets:[{reps, weight}]}]
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_sessions_user on workout_sessions(user_id, performed_at desc);

-- מדידות גוף
create table if not exists body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  measured_at date not null default current_date,
  weight numeric, body_fat numeric,
  chest numeric, waist numeric, hips numeric, arm numeric, thigh numeric,
  extra jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_measure_user on body_measurements(user_id, measured_at desc);

-- תמונות התקדמות
create table if not exists progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  photo_url text not null,
  pose photo_pose not null default 'front',
  taken_at date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

-- השוואות לפני/אחרי
create table if not exists comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  before_photo_id uuid references progress_photos(id) on delete set null,
  after_photo_id uuid references progress_photos(id) on delete set null,
  title text,
  is_shared boolean not null default false,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- NUTRITION  (שוחזר מ-All-in-Fit)
-- =====================================================================

-- מאגר מזון (cache מ-OpenFoodFacts / משרד הבריאות / מותאם / קהילתי)
create table if not exists foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  barcode text,
  brand text,
  calories_per_100g numeric,
  protein_per_100g numeric,
  carbs_per_100g numeric,
  fat_per_100g numeric,
  source text not null default 'custom',   -- openfoodfacts | govil | custom | community
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_foods_barcode on foods(barcode);

-- יומן אכילה
create table if not exists food_diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  food_id uuid references foods(id) on delete set null,
  name text not null,
  grams numeric,
  calories numeric, protein numeric, carbs numeric, fat numeric,
  meal meal_type not null default 'snack',
  consumed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_diary_user on food_diary_entries(user_id, consumed_at desc);

-- מתכונים / ארוחות של המאמנת (פורט מ-coach_meals הקיים)
create table if not exists coach_meals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'כללי',
  description text,
  image_url text,
  calories integer, protein numeric, carbs numeric, fat numeric,
  servings integer default 1,
  portion text,
  ingredients jsonb not null default '[]'::jsonb,
  instructions jsonb not null default '[]'::jsonb,
  items jsonb not null default '[]'::jsonb,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_coach_meals_cat on coach_meals(category);

-- =====================================================================
-- AI ASSISTANT  (שוחזר — עוזר עם streaming + קרדיטים)
-- =====================================================================

create table if not exists ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text,
  created_at timestamptz not null default now()
);

create table if not exists ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_ai_msg_conv on ai_messages(conversation_id, created_at);

create table if not exists ai_credits (
  user_id uuid primary key references profiles(id) on delete cascade,
  balance integer not null default 0,
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- SYSTEM: notifications / reminders / subscriptions
-- =====================================================================

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text,
  title text,
  body text,
  data jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notif_user on notifications(user_id, created_at desc);

create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  created_by uuid references profiles(id),
  title text not null,
  body text,
  schedule jsonb not null default '{}'::jsonb,
  next_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- מנויי מאמנת (RevenueCat)
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  provider text not null default 'revenuecat',
  product_id text,
  status text not null default 'inactive',
  current_period_end timestamptz,
  raw jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists idx_subs_user on subscriptions(user_id);

-- =====================================================================
-- updated_at trigger
-- =====================================================================
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','coach_client_relationships','client_goals','nutrition_plans',
    'workout_plans','routines','coach_meals','subscriptions','ai_credits']
  loop
    execute format('drop trigger if exists trg_%1$s_updated on %1$s;', t);
    execute format('create trigger trg_%1$s_updated before update on %1$s for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

-- =====================================================================
-- New-user trigger: יצירת profile אוטומטית בהרשמה
-- =====================================================================
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone',
          coalesce((new.raw_user_meta_data->>'role')::user_role, 'client'))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- =====================================================================
-- RLS helper functions
-- =====================================================================
create or replace function public.is_coach_of(_client uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from coach_client_relationships r
    where r.client_id = _client and r.coach_id = auth.uid()
      and r.coach_deleted_at is null and r.status <> 'ended'
  );
$$;

create or replace function public.is_client_of(_coach uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from coach_client_relationships r
    where r.coach_id = _coach and r.client_id = auth.uid()
      and r.coach_deleted_at is null and r.status <> 'ended'
  );
$$;

-- =====================================================================
-- Enable RLS
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array['profiles','coach_client_relationships','coach_invites','client_goals',
    'nutrition_plans','workout_plans','weight_history','updates','meetings','messages',
    'check_in_entries','habit_logs','exercises','routines','workout_sessions','body_measurements',
    'progress_photos','comparisons','foods','food_diary_entries','coach_meals','ai_conversations',
    'ai_messages','ai_credits','notifications','reminders','subscriptions']
  loop
    execute format('alter table %s enable row level security;', t);
  end loop;
end $$;

-- ---------- profiles ----------
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select using (
  id = auth.uid() or public.is_coach_of(id) or public.is_client_of(id)
);
drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles for update using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists profiles_insert on profiles;
create policy profiles_insert on profiles for insert with check (id = auth.uid());

-- ---------- coach_client_relationships ----------
drop policy if exists ccr_rw on coach_client_relationships;
create policy ccr_rw on coach_client_relationships for all
  using (coach_id = auth.uid() or client_id = auth.uid())
  with check (coach_id = auth.uid());

-- ---------- coach_invites ----------
drop policy if exists invites_rw on coach_invites;
create policy invites_rw on coach_invites for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- ---------- per-client tables (owner OR their coach) ----------
-- מיושם על כל הטבלאות עם user_id שמצביע על הלקוחה
do $$
declare t text;
begin
  foreach t in array array['client_goals','nutrition_plans','workout_plans','weight_history','updates',
    'meetings','check_in_entries','habit_logs','workout_sessions','body_measurements','progress_photos',
    'comparisons','food_diary_entries','ai_conversations','notifications','reminders','subscriptions']
  loop
    execute format('drop policy if exists %1$s_owner_coach on %1$s;', t);
    execute format($f$create policy %1$s_owner_coach on %1$s for all
      using (user_id = auth.uid() or public.is_coach_of(user_id))
      with check (user_id = auth.uid() or public.is_coach_of(user_id));$f$, t);
  end loop;
end $$;

-- ---------- messages (שני הצדדים בשיחה) ----------
drop policy if exists messages_rw on messages;
create policy messages_rw on messages for all
  using (thread_user_id = auth.uid() or public.is_coach_of(thread_user_id))
  with check (
    (from_id = auth.uid()) and (thread_user_id = auth.uid() or public.is_coach_of(thread_user_id))
  );

-- ---------- exercises / routines / coach_meals (יוצר + הלקוחות שלו) ----------
drop policy if exists exercises_rw on exercises;
create policy exercises_rw on exercises for all
  using (created_by = auth.uid() or public.is_client_of(created_by) or created_by is null)
  with check (created_by = auth.uid());

drop policy if exists routines_rw on routines;
create policy routines_rw on routines for all
  using (owner_id = auth.uid() or public.is_coach_of(owner_id) or public.is_client_of(owner_id))
  with check (owner_id = auth.uid() or public.is_coach_of(owner_id));

drop policy if exists coach_meals_rw on coach_meals;
create policy coach_meals_rw on coach_meals for all
  using (created_by = auth.uid() or public.is_client_of(created_by) or created_by is null)
  with check (created_by = auth.uid());

-- ---------- foods (מאגר משותף לקריאה, כתיבה ליוצר) ----------
drop policy if exists foods_select on foods;
create policy foods_select on foods for select using (true);
drop policy if exists foods_write on foods;
create policy foods_write on foods for all
  using (created_by = auth.uid()) with check (created_by = auth.uid() or created_by is null);

-- ---------- ai_messages (דרך השיחה) ----------
drop policy if exists ai_messages_rw on ai_messages;
create policy ai_messages_rw on ai_messages for all using (
  exists (select 1 from ai_conversations c where c.id = conversation_id and c.user_id = auth.uid())
) with check (
  exists (select 1 from ai_conversations c where c.id = conversation_id and c.user_id = auth.uid())
);

-- ---------- ai_credits ----------
drop policy if exists ai_credits_rw on ai_credits;
create policy ai_credits_rw on ai_credits for all
  using (user_id = auth.uid() or public.is_coach_of(user_id)) with check (user_id = auth.uid());

-- =====================================================================
-- הערות:
-- * טבלאות חברתי / לוח-מובילים / affiliate — שלב מאוחר (לא נכללו ב-v1).
-- * Storage buckets ליצירה: avatars, exercise-media, progress-photos, coach-logos.
-- * service_role עוקף RLS (לשרת / Edge Functions בלבד).
-- =====================================================================
