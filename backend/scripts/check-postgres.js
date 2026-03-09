const { createPostgresClient } = require("../utils/postgres");

async function main() {
  const client = createPostgresClient();

  try {
    await client.connect();

    const result = await client.query(`
      SELECT
        current_database() AS database_name,
        current_user AS user_name,
        NOW() AS server_time,
        version() AS postgres_version
    `);

    const row = result.rows[0];

    console.log("✅ החיבור ל-PostgreSQL הצליח");
    console.log(`📦 Database: ${row.database_name}`);
    console.log(`👤 User: ${row.user_name}`);
    console.log(`🕒 Server time: ${row.server_time}`);
    console.log(`🐘 Version: ${row.postgres_version.split(",")[0]}`);
  } catch (err) {
    console.error("❌ בדיקת החיבור נכשלה");
    console.error(err.message);
    console.error("");
    console.error("בדיקות בסיסיות:");
    console.error("1. ודאי שהעתקת נכון את DATABASE_URL לקובץ backend/.env");
    console.error(
      "2. אם את משתמשת ב-Neon, העתיקי את ה-connection string המלא מתוך Connect בלי לשנות אותו",
    );
    console.error("3. ודאי ש-PGSSL מוגדר ל-true");
    console.error(
      "4. אם מדובר ב-Neon והוא היה במצב idle, המתיני כמה שניות ונסי שוב",
    );
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();
