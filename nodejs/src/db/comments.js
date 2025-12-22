// src/db/comments.js
// Comment repository: encapsulates comment-related SQL and keeps route handlers clean.
// Comments are stored with a foreign key to users (user_id).

const { getDb } = require("./index");


// show latest N comments
async function listRecentComments(limit = 50) {
  const db = await getDb();

  return db.all(
    `
    SELECT
      c.id,
      c.content AS text,
      c.created_at AS createdAt,
      c.updated_at AS updatedAt,

      u.id AS authorId,
      u.display_name AS authorDisplayName,
      u.username AS authorUsername,
      u.profile_color AS authorColor,
      u.profile_avatar AS authorAvatar
    FROM comments c
    JOIN users u ON u.id = c.user_id
    ORDER BY c.created_at DESC
    LIMIT ?
    `,
    [limit]
  );
}

// Pagination helper
async function getCommentsPaged({ page = 1, pageSize = 25 }) {
  const db = await getDb();

  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safePageSize = Math.min(Math.max(parseInt(pageSize, 10) || 25, 1), 50); // enforce 1-50
  const offset = (safePage - 1) * safePageSize;

  const totalRow = await db.get(`SELECT COUNT(*) AS totalCount FROM comments`);
  const totalCount = totalRow?.totalCount ?? 0;

  const comments = await db.all(
    `
    SELECT
      c.id,
      c.content AS text,
      c.created_at AS createdAt,
      c.updated_at AS updatedAt,

      u.id AS authorId,
      u.display_name AS authorDisplayName,
      u.username AS authorUsername,
      u.profile_color AS authorColor,
      u.profile_avatar AS authorAvatar
    FROM comments c
    JOIN users u ON u.id = c.user_id
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
    `,
    [safePageSize, offset]
  );

  return { comments, totalCount, page: safePage, pageSize: safePageSize };
}


// Create a comment and load into db
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

module.exports = { listRecentComments, getCommentsPaged, createComment, };
