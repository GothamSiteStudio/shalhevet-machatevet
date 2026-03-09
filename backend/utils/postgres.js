const path = require("path");
const dotenv = require("dotenv");
const { Client, Pool } = require("pg");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

let postgresPool = null;

function normalizeConnectionString(connectionString) {
  const url = new URL(connectionString);
  url.searchParams.delete("sslmode");
  return url.toString();
}

function getSslConfig() {
  return process.env.PGSSL === "false" ? false : { rejectUnauthorized: false };
}

function getPostgresConfig() {
  if (!process.env.DATABASE_URL) {
    throw new Error("חסר DATABASE_URL בקובץ backend/.env");
  }

  return {
    connectionString: normalizeConnectionString(process.env.DATABASE_URL),
    ssl: getSslConfig(),
  };
}

function createPostgresClient() {
  return new Client(getPostgresConfig());
}

function getPostgresPool() {
  if (!postgresPool) {
    postgresPool = new Pool({
      ...getPostgresConfig(),
      max: Number(process.env.PGPOOL_MAX || 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  return postgresPool;
}

async function query(text, params) {
  return getPostgresPool().query(text, params);
}

module.exports = {
  createPostgresClient,
  getPostgresConfig,
  getPostgresPool,
  query,
};
