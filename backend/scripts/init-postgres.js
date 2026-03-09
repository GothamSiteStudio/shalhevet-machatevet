const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { createPostgresClient } = require("../utils/postgres");

const SCHEMA_PATH = path.join(__dirname, "..", "db", "schema.sql");

async function ensureCoachUser(client) {
  const coachEmail = (process.env.COACH_EMAIL || "").toLowerCase().trim();
  const coachPassword = process.env.COACH_PASSWORD || "";

  if (!coachEmail || !coachPassword) {
    console.log(
      "ℹ️ דילוג על יצירת משתמשת מאמנת כי COACH_EMAIL או COACH_PASSWORD חסרים ב-.env",
    );
    return;
  }

  const existingCoach = await client.query(
    "SELECT id FROM users WHERE email = $1 LIMIT 1",
    [coachEmail],
  );

  if (existingCoach.rowCount > 0) {
    console.log("✅ חשבון המאמנת כבר קיים במסד");
    return;
  }

  const hashedPassword = await bcrypt.hash(coachPassword, 10);

  await client.query(
    `
      INSERT INTO users (
        id, name, email, phone, password, role, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, 'coach', NOW(), NOW())
    `,
    [
      "coach-shalhevet",
      process.env.COACH_NAME || "שלהבת מחטבת",
      coachEmail,
      process.env.COACH_PHONE || "",
      hashedPassword,
    ],
  );

  console.log("✅ משתמשת המאמנת נוצרה במסד PostgreSQL");
}

async function main() {
  const client = createPostgresClient();

  try {
    const schemaSql = fs.readFileSync(SCHEMA_PATH, "utf8");

    await client.connect();
    await client.query(schemaSql);
    await ensureCoachUser(client);

    console.log("✅ סכמת PostgreSQL נוצרה בהצלחה");
  } catch (err) {
    console.error("❌ יצירת הסכמה נכשלה");
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();
