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

// User query to find user by email
async function findUserByEmail(email) {
  const db = await getDb();
  return db.get(`SELECT * FROM users WHERE email = ?`, [email]);
}

// Increment failed_login_count and lock account when reaching maxFails
async function recordFailedLogin(userId, { maxFails = 5, lockMinutes = 1 } = {}) {
  const db = await getDb();

  // Increment even if NULL
  await db.run(
    `UPDATE users
     SET failed_login_count = COALESCE(failed_login_count, 0) + 1
     WHERE id = ?`,
    [userId]
  );

  const row = await db.get(
    `SELECT failed_login_count, lockout_until FROM users WHERE id = ?`,
    [userId]
  );

  const count = row?.failed_login_count ?? 0;

  // Only set lockout if threshold reached AND not already locked
  if (count >= maxFails && !row.lockout_until) {
    await db.run(
      `UPDATE users
       SET lockout_until = datetime('now', ?)
       WHERE id = ?`,
      [`+${lockMinutes} minutes`, userId]
    );
  }
}

// Checks if a user is locked out with a db serch via userID as a paramter
async function isUserLockedById(userId) {
  const db = await getDb();
  const row = await db.get(
    `SELECT CASE
        WHEN lockout_until IS NOT NULL AND lockout_until > datetime('now') THEN 1
        ELSE 0
     END AS locked
     FROM users
     WHERE id = ?`,
    [userId]
  );
  return row?.locked === 1;
}

// Clear lockout counters after successful login
async function clearFailedLogin(userId) {
  const db = await getDb();
  await db.run(
    `UPDATE users
     SET failed_login_count = 0,
         lockout_until = NULL
     WHERE id = ?`,
    [userId]
  );
}

module.exports = { createUser, findUserByUsername, findUserById, findUserByEmail, recordFailedLogin, isUserLockedById, clearFailedLogin,};
