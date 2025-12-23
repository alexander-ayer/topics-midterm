/* database.js

Centralized SQLite database connection.
 
  This module is responsible for:
  - Opening the database connection
  - Ensuring the schema exists
  - Providing a shared DB handle for the application
 */

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "forum.db");

let db;

// Initialize the SQLite database connection.
async function initDatabase() {
  if (db) return db;

  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });

  await db.exec('PRAGMA foreign_keys = ON');

  // Load and apply schema on startup to ensure tables exist
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await db.exec(schema);
  return db;
}

function getDb() {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}


module.exports = { initDatabase, getDb };
