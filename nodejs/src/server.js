// src/server.js

const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const exphbs = require("express-handlebars");

const { initDatabase } = require("./db/database");
const { attachCurrentUser } = require("./middleware/auth");

// Route modules
const authRoutes = require("./routes/authRoutes");
const commentRoutes = require("./routes/commentRoutes");
const profileRoutes = require("./routes/profileRoutes");

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

// Mount POST/feature routes
app.use(authRoutes);
app.use(commentRoutes);
app.use(profileRoutes);

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
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
