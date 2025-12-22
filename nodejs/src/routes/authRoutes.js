// src/routes/authRoutes.js
// moved /login and /register routes here since they got a little too long to keep in server.js

// src/routes/authRoutes.js
const express = require("express");
const crypto = require("crypto");

const {
  isValidEmail, isValidDisplayName, validatePasswordStrength,
  hashPassword, verifyPassword, getClientIp,
} = require("../middleware/security");

const { createUser, findUserByUsername, findUserByEmail, recordFailedLogin, isUserLockedById, clearFailedLogin } = require("../db/users");
const { createSession } = require("../db/sessions");
const { logLoginAttempt } = require("../db/loginAttempts");
const { deleteSession } = require("../db/sessions");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// POST /register
router.post("/register", async (req, res, next) => {
  try {
    const { username, password, email, displayName } = req.body;

    if (!username || !password || !email || !displayName) {
      return res.render("register", {
        error: "Username, password, email, and display name are required.",
        username,
        email,
        displayName,
      });
    }

    if (!isValidEmail(email)) {
      return res.render("register", { error: "Please enter a valid email address.", username, email, displayName });
    }

    if (!isValidDisplayName(displayName)) {
      return res.render("register", {
        error: "Display name must be 3–30 characters and use letters/numbers/spaces/_-.",
        username,
        email,
        displayName,
      });
    }

    if (displayName.trim().toLowerCase() === username.trim().toLowerCase()) {
      return res.render("register", { error: "Display name must be different from username.", username, email, displayName });
    }

    const pwError = validatePasswordStrength(password, username);
    if (pwError) {
      return res.render("register", { error: pwError, username, email, displayName });
    }

    const existingUser = await findUserByUsername(username);
    if (existingUser) {
      return res.render("register", { error: "That username is already taken.", username, email, displayName });
    }

    const existingEmail = await findUserByEmail(email);
    if (existingEmail) {
      return res.render("register", { error: "That email is already registered.", username, email, displayName });
    }

    const passwordHash = await hashPassword(password);

    const userId = await createUser({
      username,
      passwordHash,
      email,
      displayName: displayName.trim(),
    });

    const sessionId = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString();
    await createSession({ userId, sessionId, expiresAt });

    res.cookie("session_id", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production", // set true once HTTPS-only
      maxAge: 1000 * 60 * 60,
    });

    return res.redirect("/");
  } catch (err) {
    return next(err);
  }
});

// POST /login
router.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const ipAddress = getClientIp(req);

    if (!username || !password) {
      return res.render("login", { error: "Username and password are required.", username });
    }

    const user = await findUserByUsername(username);

    console.log("DEBUG login ip:", {
      ip: req.ip,
      ips: req.ips,
      xff: req.headers["x-forwarded-for"],
      xri: req.headers["x-real-ip"],
    });

    if (user && (await isUserLockedById(user.id))) {
      await logLoginAttempt({ username, ipAddress, success: false });
      return res.render("login", {
        error: "Account is temporarily locked. Please try again later.",
        username,
      });
    }


    let ok = false;
    if (user) ok = await verifyPassword(user.password_hash, password);

    if (!user || !ok) {
      await logLoginAttempt({ username, ipAddress, success: false });
      if (user) await recordFailedLogin(user.id, { maxFails: 5, lockMinutes: 3 });
      return res.render("login", { error: "Invalid username or password.", username });
    }

    await logLoginAttempt({ username, ipAddress, success: true });
    await clearFailedLogin(user.id);

    const sessionId = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString();
    await createSession({ userId: user.id, sessionId, expiresAt });

    res.cookie("session_id", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60,
    });

    return res.redirect("/");
  } catch (err) {
    return next(err);
  }
});

router.post("/logout", requireAuth, async (req, res, next) => {
  try {
    const sid = req.cookies?.session_id;

    if (sid) {
      await deleteSession(sid); 
    }

    // Clear cookie 
    res.clearCookie("session_id", {
      httpOnly: true,
      sameSite: "lax",
    });

    return res.redirect("/login");
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
