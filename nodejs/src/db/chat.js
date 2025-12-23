// src/db/chat.js
// Chat message repository for storing and retrieving real-time chat messages

const { getDb } = require("./index");

// Insert a chat message and return it joined with user profile data.
async function createChatMessage({ userId, content }) {
  const db = await getDb();

  const result = await db.run(
    `INSERT INTO chat_messages (user_id, content)
     VALUES (?, ?)`,
    [userId, content]
  );

  return db.get(
    `
    SELECT
      m.id,
      m.content,
      m.created_at,
      u.id AS user_id,
      u.display_name,
      u.profile_color,
      u.profile_avatar
    FROM chat_messages m
    JOIN users u ON u.id = m.user_id
    WHERE m.id = ?
    `,
    [result.lastID]
  );
}

// Retrieve recent chat history.
 // Returns messages oldest to newest for correct display order.
async function getChatHistory({ limit = 50, beforeId = null }) {
  const db = await getDb();
  const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 200));

  const rows = await db.all(
    `
    SELECT
      m.id,
      m.content,
      m.created_at,
      u.id AS user_id,
      u.display_name,
      u.profile_color,
      u.profile_avatar
    FROM chat_messages m
    JOIN users u ON u.id = m.user_id
    ${beforeId ? "WHERE m.id < ?" : ""}
    ORDER BY m.id DESC
    LIMIT ?
    `,
    beforeId ? [beforeId, safeLimit] : [safeLimit]
  );

  // Reverse so UI displays oldest to newest
  return rows.reverse();
}

module.exports = { createChatMessage, getChatHistory };
