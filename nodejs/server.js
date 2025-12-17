// server.js
const path = require("path");
const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const exphbs = require("express-handlebars");

const app = express();

// In- memory database
let users = [];		// {username, password}
let comments = [];	// {author, text, createdAt}

// Express + Middleware
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Access static assets
app.use(express.static(path.join(__dirname, "public")));

//Session setup
app.use(
	session({
		secret: "wild-west-secret",
		resave: false,
		saveUninitialized: false,
		cookie: {
			maxAge: 1000 * 60 * 60,
		},
	})
);

// Handlebar setup

app.engine(
	"hbs",
	exphbs.engine({
		extname: ".hbs",
		defaultLayout: "main",
		layoutsDir: path.join(__dirname, "views", "layouts"),
		partialsDir: path.join(__dirname, "views", "partials"),
	})
);

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));


// Helper Middleware
// Make currentUser available to all views
app.use((req, res, next) => {
	res.locals.currentUser = req.session.user || null;
	res.locals.isLoggedIn = !!req.session.user;
	next();
});

// Simple auth guard for routes that require login
function requireLogin(req, res, next) {
	if(!req.session.user) {
		return res.redirect("/login");
	}
	next();
}


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
  res.render("comments", {
    comments,
  });
});

// New comment form
app.get("/comment/new", (req, res) => {
  if (!req.session.user) {	// Redirect to login if not logged in
    return res.redirect("/login");
  }
  res.render("newComment", { error: null });
});

// POST Routes

// Register a new user
app.post("/register", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.render("register", {
      error: "Username and password are required.",
      username,
    });
  }

  // Check if username already exists
  const existing = users.find((u) => u.username === username);
  if (existing) {
    return res.render("register", {
      error: "That username is already taken.",
      username,
    });
  }

  // Store plaintext
  users.push({ username, password });
  console.log("Users: ", users);

  // Auto-login after register
  req.session.user = { username };
  return res.redirect("/");
});

// Login
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  // Find the user in the in-memory array
  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res.render("login", {
      error: "Invalid username or password.",
      username,
    });
  }

  // Set session info
  req.session.user = { username: user.username };
  console.log(`User ${user.username} logged in`);
  return res.redirect("/");
});

// Logout
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.redirect("/");
  });
});

// Create a new comment
app.post("/comment", requireLogin, (req, res) => {
  const { text } = req.body;
  const username = req.session.user.username;

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
  console.log("Comments: ", comments);

  return res.redirect("/");
});

// Error handling for posting
app.use((err, req, res, next) => {
	console.error("Server error:", err);
	res.status(500).render("home", {
		error: "Something went wrong. The sheriff is looking into it.",
	});
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
