// src/db/comments.js
// Comment repository: encapsulates comment-related SQL and keeps route handlers clean.
// //Comments are stored with a foreign key to users (user_id).

const { getDb } = require("./index");

async function listRecentComments(limit = 50) {
  const db = await getDb();

  // Join users so views can display the author's username without extra queries.
  return db.all(
    `
    SELECT
      c.id,
      c.content AS text,
      c.created_at AS createdAt,
      u.username AS author
    FROM comments c
    JOIN users u ON u.id = c.user_id
    ORDER BY c.created_at DESC
    LIMIT ?
    `,
    [limit]
  );
}

async function createComment({ userId, content }) {
  const db = await getDb();

  await db.run(
    `
    INSERT INTO comments (user_id, content)
    VALUES (?, ?)
    `,
    [userId, content]
  );
}

module.exports = {
  listRecentComments,
  createComment,
};
