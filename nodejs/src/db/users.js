// src/db/users.js
// User repository for SQL queries related to users

const { getDb } = require('./index');

// Create a using, taking in username, hasjed password, email, and display name as parameters
async function createUser({ username, passwordHash, email, displayName }) {
  const db = await getDb();
  const result = await db.run(
    `INSERT INTO users (username, password_hash, email, display_name)
     VALUES (?, ?, ?, ?)`,
    [username, passwordHash, email, displayName]
  );
  return result.lastID;
}

// User query by username
async function findUserByUsername(username) {
  const db = await getDb();
  return db.get(`SELECT * FROM users WHERE username = ?`, [username]);
}

// User query by user id
async function findUserById(id) {
  const db = await getDb();
  return db.get(`SELECT * FROM users WHERE id = ?`, [id]);
}

module.exports = { createUser, findUserByUsername, findUserById,};
