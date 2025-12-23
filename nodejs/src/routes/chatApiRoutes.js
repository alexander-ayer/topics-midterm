// src/routes/chatApiRoutes.js
const express = require("express");
const router = express.Router();

const { requireApiAuth } = require("../middleware/apiAuth");
const { createChatMessage, getChatHistory } = require("../db/chat");

function toMessageDto(row) {
  return {
    id: row.id,
    content: row.content,
    createdAt: row.created_at,
    user: {
      id: row.user_id,
      displayName: row.display_name,
      profileColor: row.profile_color,
      profileAvatar: row.profile_avatar,
    },
  };
}

/**
 * GET /api/chat/history?limit=50&beforeId=123
 * Returns messages oldest -> newest.
 */
router.get("/api/chat/history", requireApiAuth, async (req, res, next) => {
  try {
    const limit = req.query.limit ?? 50;
    const beforeId = req.query.beforeId ? Number(req.query.beforeId) : null;

    const rows = await getChatHistory({ limit, beforeId });
    const messages = rows.map(toMessageDto);

    res.json({ messages });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/chat/messages
 * Body: { content: string }
 */
router.post(
  "/api/chat/messages",
  requireApiAuth,
  express.json(),
  async (req, res, next) => {
    try {
      const raw = String(req.body?.content ?? "");
      const content = raw.trim();

      if (!content) {
        return res.status(400).json({ error: "Message content is required" });
      }
      if (content.length > 1000) {
        return res
          .status(400)
          .json({ error: "Message too long (max 1000 characters)" });
      }

      const row = await createChatMessage({ userId: req.user.id, content });
      const message = toMessageDto(row);

      // If Socket.io is attached, broadcast to all connected clients
      const io = req.app.get("io");
      if (io) io.emit("chat:new", { message });

      return res.status(201).json({ message });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
