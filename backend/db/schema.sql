CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('coach', 'client')),
  weight NUMERIC,
  height NUMERIC,
  age INTEGER,
  goal TEXT,
  activity_level TEXT,
  coach_name TEXT,
  coach_phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS coach_status TEXT,
  ADD COLUMN IF NOT EXISTS coach_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS habit_assignments JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS check_in_template JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS client_goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  weight_goal_kg NUMERIC,
  weekly_workout_target INTEGER,
  daily_steps_target INTEGER,
  daily_water_target_liters NUMERIC,
  calorie_target INTEGER,
  protein_target INTEGER,
  target_date TEXT,
  notes TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nutrition_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  notes TEXT,
  daily_targets JSONB NOT NULL DEFAULT '{}'::jsonb,
  meals JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workout_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  goal_focus TEXT,
  notes TEXT,
  weekly_targets JSONB NOT NULL DEFAULT '{}'::jsonb,
  days JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weight_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weight NUMERIC NOT NULL,
  entry_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, entry_date)
);

CREATE INDEX IF NOT EXISTS idx_weight_history_user_date
  ON weight_history(user_id, entry_date DESC);

CREATE TABLE IF NOT EXISTS updates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  update_date DATE,
  read_by_coach BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_updates_user_created_at
  ON updates(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_date TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'ממתין לאישור',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_meetings_user_created_at
  ON meetings(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  from_id TEXT,
  to_id TEXT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  from_role TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_user_created_at
  ON messages(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS workout_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nutrition_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS check_in_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_key TEXT NOT NULL,
  template JSONB NOT NULL DEFAULT '{}'::jsonb,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  note TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_key)
);

CREATE INDEX IF NOT EXISTS idx_check_in_entries_user_week
  ON check_in_entries(user_id, week_key DESC);

CREATE TABLE IF NOT EXISTS habit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  habit_id TEXT NOT NULL,
  log_date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, habit_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date
  ON habit_logs(user_id, log_date DESC);

CREATE TABLE IF NOT EXISTS coach_meals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'כללי',
  description TEXT,
  image_url TEXT,
  calories INTEGER,
  protein NUMERIC,
  carbs NUMERIC,
  fat NUMERIC,
  servings INTEGER DEFAULT 1,
  portion TEXT,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_meals_category ON coach_meals(category);
CREATE INDEX IF NOT EXISTS idx_coach_meals_created_by ON coach_meals(created_by);