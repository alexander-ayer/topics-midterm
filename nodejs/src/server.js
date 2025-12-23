// src/server.js

const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const exphbs = require("express-handlebars");
const http = require("http");
const { Server } = require("socket.io");
const { initDatabase } = require("./db/database");
const { attachCurrentUser } = require("./middleware/auth");
const { findSession } = require("./db/sessions");
const { findUserById } = require("./db/users");

// Route modules
const authRoutes = require("./routes/authRoutes");
const commentRoutes = require("./routes/commentRoutes");
const profileRoutes = require("./routes/profileRoutes");
const chatApiRoutes = require("./routes/chatApiRoutes");
const chatPageRoutes = require("./routes/chatPageRoutes");


const app = express();

// Express + Middleware
app.set("trust proxy", 1);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Resolve current user from the SQLite session cookie
app.use(attachCurrentUser);

// Access static assets
app.use(express.static(path.join(__dirname, "..", "public")));

// Handlebars setup
app.engine(
  "hbs",
  exphbs.engine({
    extname: ".hbs",
    defaultLayout: "main",
    layoutsDir: path.join(__dirname, "..", "views", "layouts"),
    partialsDir: path.join(__dirname, "..", "views", "partials"),
    helpers: {
      eq: (a, b) => String(a) === String(b),
    },
  })
);

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "..", "views"));

// GET Routes (pages/forms)
// Home
app.get("/", (req, res) => {
  res.render("home");
});

// Register form
app.get("/register", (req, res) => {
  res.render("register", { error: null, username: "", email: "", displayName: ""   
  });
});

// Login form
app.get("/login", (req, res) => {
  res.render("login", { error: null, username: "" });
});

// Mount feature routes
app.use(authRoutes);
app.use(commentRoutes);
app.use(profileRoutes);
app.use(chatApiRoutes);
app.use(chatPageRoutes);


// Error handling (must be after routes)
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).render("home", {
    error: "Something went wrong. The sheriff is looking into it.",
  });
});

// Initialize database (ensure schema exists before requests)
(async () => {
  try {
    console.log("Initializing database...");
    await initDatabase();
    console.log("Database initialized");
  } catch (e) {
    console.error("Database init failed:", e);
    process.exit(1);
  }
})();

// Start Server
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: true, credentials: true },
});

app.set("io", io);

// Socket auth middleware: validate session cookie and attach safe user
io.use(async (socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie || "";
    const match = cookieHeader.match(/(?:^|;\s*)session_id=([^;]+)/);
    const sessionId = match ? decodeURIComponent(match[1]) : null;

    if (!sessionId) return next(new Error("Not authenticated"));

    const session = await findSession(sessionId);
    if (!session) return next(new Error("Not authenticated"));

    if (new Date(session.expires_at) < new Date()) {
      return next(new Error("Session expired"));
    }

    const user = await findUserById(session.user_id);
    if (!user) return next(new Error("Not authenticated"));

    socket.user = {
      id: user.id,
      displayName: user.display_name,
      profileColor: user.profile_color,
      profileAvatar: user.profile_avatar,
    };

    return next();
  } catch (err) {
    return next(err);
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

