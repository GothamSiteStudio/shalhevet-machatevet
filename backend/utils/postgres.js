const path = require("path");
const dotenv = require("dotenv");
const { Client } = require("pg");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

function getSslConfig() {
  return process.env.PGSSL === "false" ? false : { rejectUnauthorized: false };
}

function getPostgresConfig() {
  if (!process.env.DATABASE_URL) {
    throw new Error("חסר DATABASE_URL בקובץ backend/.env");
  }

  return {
    connectionString: process.env.DATABASE_URL,
    ssl: getSslConfig(),
  };
}

function createPostgresClient() {
  return new Client(getPostgresConfig());
}

module.exports = {
  createPostgresClient,
  getPostgresConfig,
};
