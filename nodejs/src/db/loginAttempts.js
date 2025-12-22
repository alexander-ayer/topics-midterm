// src/db/loginAttempts.js
// Tracks attempted logins from users

const { getDb } = require("./index");

async function logLoginAttempt({ username, ipAddress, success }) {
  const db = await getDb();
  await db.run(
    `INSERT INTO login_attempts (username, ip_address, success)
     VALUES (?, ?, ?)`,
    [username, ipAddress, success ? 1 : 0]
  );
}

module.exports = { logLoginAttempt };
