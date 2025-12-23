// src/routes/chatPageRoutes.js
const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");

router.get("/chat", requireAuth, (req, res) => {
  res.render("chat");
});

module.exports = router;