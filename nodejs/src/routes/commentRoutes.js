//src/routes/commentRoutes
// This js file contains the POST and GET routes necessary for commmenting


const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/auth");
const { getCommentsPaged, createComment } = require("../db/comments");

// GET /comments?page=N
router.get("/comments", async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const pageSize = 25;

    // groundwork for comment pagination
    const { comments, totalCount } = await getCommentsPaged({ page, pageSize });

    const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);
    const safePage = Math.min(page, totalPages);

    // If user requests page too high, redirect to last valid page
    if (page !== safePage) {
      return res.redirect(`/comments?page=${safePage}`);
    }

    return res.render("comments", {
      comments,
      page: safePage,
      totalPages,
      totalCount,
      hasPrev: safePage > 1,        
      hasNext: safePage < totalPages,
      prevPage: safePage - 1,
      nextPage: safePage + 1,
    });
  } catch (err) {
    return next(err);
  }
});

// GET /comment/new
router.get("/comment/new", requireAuth, (req, res) => {
  res.render("newComment", { error: null });
});

// POST /comment/new
router.post("/comment/new", requireAuth, async (req, res, next) => {
  try {
    const content = String(req.body.content || "").trim();

    if (!content) {
      return res.render("newComment", { error: "Comment cannot be empty." });
    }

    // Simple max length for truncation later
    if (content.length > 2000) {
      return res.render("newComment", { error: "Comment is too long (max 2000 characters)." });
    }

    await createComment({ userId: req.user.id, content });
    return res.redirect("/comments");
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
