// src/db/sessions.js
// Session repository for tracking user state. Stores random session id in the cookie to avoid exposing username

const { getDb } = require('./index');

// Create a session taking in 3 parameters: user ID, session ID, and date cookie expires
async function createSession({ userId, sessionId, expiresAt }) {
  const db = await getDb();
  await db.run(
    `INSERT INTO sessions (user_id, session_id, expires_at)
     VALUES (?, ?, ?)`,
    [userId, sessionId, expiresAt]
  );
}

async function findSession(sessionId) {
  const db = await getDb();
  return db.get(
    `SELECT * FROM sessions WHERE session_id = ?`,
    [sessionId]
  );
}

async function deleteSession(sessionId) {
  const db = await getDb();
  await db.run(`DELETE FROM sessions WHERE session_id = ?`, [sessionId]);
}

async function deleteSessionsForUser(userId) {
  const db = await getDb();
  await db.run(`DELETE FROM sessions WHERE user_id = ?`, [userId]);
}

module.exports = { createSession, findSession, deleteSession, deleteSessionsForUser, };
