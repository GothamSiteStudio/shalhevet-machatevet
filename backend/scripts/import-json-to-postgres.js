const fs = require("fs");
const path = require("path");
const { createPostgresClient } = require("../utils/postgres");

const DB_JSON_PATH = path.join(__dirname, "..", "db.json");
const SCHEMA_PATH = path.join(__dirname, "..", "db", "schema.sql");

function readLocalJsonDB() {
  const raw = fs.readFileSync(DB_JSON_PATH, "utf8");
  return JSON.parse(raw);
}

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toBoolean(value, defaultValue = false) {
  if (value === undefined || value === null) return defaultValue;
  return Boolean(value);
}

function toIsoString(value) {
  if (!value) return new Date().toISOString();
  return new Date(value).toISOString();
}

async function upsertUser(client, user) {
  await client.query(
    `
      INSERT INTO users (
        id, name, email, phone, password, role,
        weight, height, age, goal, activity_level,
        coach_name, coach_phone, is_active, notes, code,
        created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16,
        $17, $18
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        password = EXCLUDED.password,
        role = EXCLUDED.role,
        weight = EXCLUDED.weight,
        height = EXCLUDED.height,
        age = EXCLUDED.age,
        goal = EXCLUDED.goal,
        activity_level = EXCLUDED.activity_level,
        coach_name = EXCLUDED.coach_name,
        coach_phone = EXCLUDED.coach_phone,
        is_active = EXCLUDED.is_active,
        notes = EXCLUDED.notes,
        code = EXCLUDED.code,
        updated_at = EXCLUDED.updated_at
    `,
    [
      user.id,
      user.name,
      user.email.toLowerCase(),
      user.phone || null,
      user.password,
      user.role,
      toNumberOrNull(user.weight),
      toNumberOrNull(user.height),
      toNumberOrNull(user.age),
      user.goal || null,
      user.activityLevel || null,
      user.coachName || null,
      user.coachPhone || null,
      toBoolean(user.isActive, true),
      user.notes || null,
      user.code || null,
      toIsoString(user.createdAt),
      toIsoString(user.updatedAt || user.createdAt),
    ],
  );
}

async function upsertWeightEntry(client, entry) {
  await client.query(
    `
      INSERT INTO weight_history (id, user_id, weight, entry_date, created_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, entry_date) DO UPDATE SET
        weight = EXCLUDED.weight,
        created_at = EXCLUDED.created_at
    `,
    [
      entry.id,
      entry.userId,
      toNumberOrNull(entry.weight),
      entry.date,
      toIsoString(entry.createdAt),
    ],
  );
}

async function upsertUpdate(client, item) {
  await client.query(
    `
      INSERT INTO updates (id, user_id, text, update_date, read_by_coach, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        text = EXCLUDED.text,
        update_date = EXCLUDED.update_date,
        read_by_coach = EXCLUDED.read_by_coach,
        created_at = EXCLUDED.created_at
    `,
    [
      item.id,
      item.userId,
      item.text,
      item.date || null,
      toBoolean(item.readByCoach, false),
      toIsoString(item.createdAt),
    ],
  );
}

async function upsertMeeting(client, item) {
  await client.query(
    `
      INSERT INTO meetings (id, user_id, requested_date, notes, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        requested_date = EXCLUDED.requested_date,
        notes = EXCLUDED.notes,
        status = EXCLUDED.status,
        created_at = EXCLUDED.created_at,
        updated_at = EXCLUDED.updated_at
    `,
    [
      item.id,
      item.userId,
      item.requestedDate,
      item.notes || null,
      item.status || "ממתין לאישור",
      toIsoString(item.createdAt),
      item.updatedAt ? toIsoString(item.updatedAt) : null,
    ],
  );
}

async function upsertMessage(client, item) {
  await client.query(
    `
      INSERT INTO messages (id, from_id, to_id, user_id, text, from_role, is_read, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        from_id = EXCLUDED.from_id,
        to_id = EXCLUDED.to_id,
        user_id = EXCLUDED.user_id,
        text = EXCLUDED.text,
        from_role = EXCLUDED.from_role,
        is_read = EXCLUDED.is_read,
        created_at = EXCLUDED.created_at
    `,
    [
      item.id,
      item.fromId || null,
      item.toId || item.toUserId || null,
      item.userId,
      item.text,
      item.fromRole || null,
      toBoolean(item.read, false),
      toIsoString(item.createdAt),
    ],
  );
}

async function upsertClientGoals(client, item) {
  await client.query(
    `
      INSERT INTO client_goals (
        id, user_id, weight_goal_kg, weekly_workout_target,
        daily_steps_target, daily_water_target_liters,
        calorie_target, protein_target, target_date,
        notes, updated_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (user_id) DO UPDATE SET
        id = EXCLUDED.id,
        weight_goal_kg = EXCLUDED.weight_goal_kg,
        weekly_workout_target = EXCLUDED.weekly_workout_target,
        daily_steps_target = EXCLUDED.daily_steps_target,
        daily_water_target_liters = EXCLUDED.daily_water_target_liters,
        calorie_target = EXCLUDED.calorie_target,
        protein_target = EXCLUDED.protein_target,
        target_date = EXCLUDED.target_date,
        notes = EXCLUDED.notes,
        updated_by = EXCLUDED.updated_by,
        updated_at = EXCLUDED.updated_at
    `,
    [
      item.id,
      item.userId,
      toNumberOrNull(item.weightGoalKg),
      toNumberOrNull(item.weeklyWorkoutTarget),
      toNumberOrNull(item.dailyStepsTarget),
      toNumberOrNull(item.dailyWaterTargetLiters),
      toNumberOrNull(item.calorieTarget),
      toNumberOrNull(item.proteinTarget),
      item.targetDate || null,
      item.notes || null,
      item.updatedBy || null,
      toIsoString(item.createdAt),
      toIsoString(item.updatedAt || item.createdAt),
    ],
  );
}

async function upsertNutritionPlan(client, item) {
  await client.query(
    `
      INSERT INTO nutrition_plans (
        id, user_id, title, notes, daily_targets, meals,
        updated_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9)
      ON CONFLICT (user_id) DO UPDATE SET
        id = EXCLUDED.id,
        title = EXCLUDED.title,
        notes = EXCLUDED.notes,
        daily_targets = EXCLUDED.daily_targets,
        meals = EXCLUDED.meals,
        updated_by = EXCLUDED.updated_by,
        updated_at = EXCLUDED.updated_at
    `,
    [
      item.id,
      item.userId,
      item.title || null,
      item.notes || null,
      JSON.stringify(item.dailyTargets || {}),
      JSON.stringify(item.meals || []),
      item.updatedBy || null,
      toIsoString(item.createdAt),
      toIsoString(item.updatedAt || item.createdAt),
    ],
  );
}

async function upsertWorkoutPlan(client, item) {
  await client.query(
    `
      INSERT INTO workout_plans (
        id, user_id, title, goal_focus, notes, weekly_targets, days,
        updated_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10)
      ON CONFLICT (user_id) DO UPDATE SET
        id = EXCLUDED.id,
        title = EXCLUDED.title,
        goal_focus = EXCLUDED.goal_focus,
        notes = EXCLUDED.notes,
        weekly_targets = EXCLUDED.weekly_targets,
        days = EXCLUDED.days,
        updated_by = EXCLUDED.updated_by,
        updated_at = EXCLUDED.updated_at
    `,
    [
      item.id,
      item.userId,
      item.title || null,
      item.goalFocus || null,
      item.notes || null,
      JSON.stringify(item.weeklyTargets || {}),
      JSON.stringify(item.days || []),
      item.updatedBy || null,
      toIsoString(item.createdAt),
      toIsoString(item.updatedAt || item.createdAt),
    ],
  );
}

async function upsertLog(client, tableName, item) {
  await client.query(
    `
      INSERT INTO ${tableName} (id, user_id, payload, created_at, updated_at)
      VALUES ($1, $2, $3::jsonb, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        payload = EXCLUDED.payload,
        created_at = EXCLUDED.created_at,
        updated_at = EXCLUDED.updated_at
    `,
    [
      item.id,
      item.userId || null,
      JSON.stringify(item),
      toIsoString(item.createdAt),
      toIsoString(item.updatedAt || item.createdAt),
    ],
  );
}

async function main() {
  const client = createPostgresClient();

  try {
    const localDb = readLocalJsonDB();
    const schemaSql = fs.readFileSync(SCHEMA_PATH, "utf8");

    await client.connect();
    await client.query("BEGIN");
    await client.query(schemaSql);

    for (const user of localDb.users || []) await upsertUser(client, user);
    for (const item of localDb.weightHistory || [])
      await upsertWeightEntry(client, item);
    for (const item of localDb.updates || []) await upsertUpdate(client, item);
    for (const item of localDb.meetings || [])
      await upsertMeeting(client, item);
    for (const item of localDb.messages || [])
      await upsertMessage(client, item);
    for (const item of localDb.clientGoals || [])
      await upsertClientGoals(client, item);
    for (const item of localDb.nutritionPlans || [])
      await upsertNutritionPlan(client, item);
    for (const item of localDb.workoutPlans || [])
      await upsertWorkoutPlan(client, item);
    for (const item of localDb.workoutLogs || [])
      await upsertLog(client, "workout_logs", item);
    for (const item of localDb.nutritionLogs || [])
      await upsertLog(client, "nutrition_logs", item);

    await client.query("COMMIT");

    console.log("✅ הנתונים מ-db.json הועברו ל-PostgreSQL");
    console.log(`👥 Users: ${(localDb.users || []).length}`);
    console.log(`⚖️ Weight entries: ${(localDb.weightHistory || []).length}`);
    console.log(`📰 Updates: ${(localDb.updates || []).length}`);
    console.log(`📅 Meetings: ${(localDb.meetings || []).length}`);
    console.log(`💬 Messages: ${(localDb.messages || []).length}`);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("❌ העברת הנתונים נכשלה");
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();
