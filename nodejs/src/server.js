// server.js
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cookieParser = require("cookie-parser");
const exphbs = require("express-handlebars");

const { initDatabase } = require("./db/database");
const { attachCurrentUser, requireAuth } = require("./middleware/auth");
const { createUser, findUserByUsername } = require("./db/users");
const { createSession, deleteSession } = require("./db/sessions");

const app = express();

// In- memory database
let comments = [];	// {author, text, createdAt}

// Express + Middleware
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Resolve current user from the SQLite session cookie
app.use(attachCurrentUser);

// Access static assets
app.use(express.static(path.join(__dirname, '..', "public")));


// Handlebar setup
app.engine(
	"hbs",
	exphbs.engine({
		extname: ".hbs",
		defaultLayout: "main",
		layoutsDir: path.join(__dirname, '..', "views",  "layouts"),
		partialsDir: path.join(__dirname, '..', "views",  "partials"),
	})
);

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, '..', "views"));

// GET Routes

// Home
app.get("/", (req, res) => {
	res.render("home", { comments }); // Render the comment feed on the home page
});

// Register form
app.get("/register", (req, res) => {
  res.render("register", { error: null });
});

// Login form
app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

// Comments page
app.get("/comments", (req, res) => {
  res.render("comments", { comments });
});

// New comment form
app.get("/comment/new", requireAuth, (req, res) => {
  res.render("newComment", { error: null });
});

// POST Routes

// Register a new user
app.post("/register", async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.render("register", {
        error: "Username and password are required.",
        username,
      });
    }

    // Enforce unique usernames in the database
    const existing = await findUserByUsername(username);
    if (existing) {
      return res.render("register", {
        error: "That username is already taken.",
        username,
      });
    }

    const userId = await createUser({
      username,
      passwordHash: password,
      email: `${username}@example.com`, // Placeholder
      displayName: username,
    });

    // Create a persistent session and store only the session id in a cookie.
    const sessionId = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour

    await createSession({ userId, sessionId, expiresAt });

    res.cookie("session_id", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60, // 1 hour
    });

    return res.redirect("/");
  } catch (err) {
    return next(err);
  }
});

// Login
app.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const user = await findUserByUsername(username);
    if (!user || user.password_hash !== password) {
      return res.render("login", {
        error: "Invalid username or password.",
        username,
      });
    }

    const sessionId = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour

    await createSession({ userId: user.id, sessionId, expiresAt });

    res.cookie("session_id", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60,
    });

    return res.redirect("/");
  } catch (err) {
    return next(err);
  }
});

// Logout
app.post("/logout", async (req, res, next) => {
  try {
    const sessionId = req.cookies?.session_id;
    if (sessionId) {
      await deleteSession(sessionId);
    }

    res.clearCookie("session_id");
    return res.redirect("/");
  } catch (err) {
    return next(err);
  }
});

// Create a new comment
app.post("/comment", requireAuth, (req, res) => {
  const { text } = req.body;
  const username = req.user.username;

  if (!text || text.trim() === "") {
    return res.render("newComment", {
      error: "Comment cannot be empty.",
    });
  }

  comments.push({
    author: username,
    text: text.trim(),
    createdAt: new Date(),
  });

  return res.redirect("/");
});

// Error handling for posting
app.use((err, req, res, next) => {
	console.error("Server error:", err);
	res.status(500).render("home", {
		error: "Something went wrong. The sheriff is looking into it.",
	});
});

// Initialize database
(async () => {
  console.log("Initializing database...");
  await initDatabase();
  console.log("Database initialized");
})();


// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
