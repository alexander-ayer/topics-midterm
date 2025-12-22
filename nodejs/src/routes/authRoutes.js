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
    const rawUsername = req.body.username;
    const rawPassword = req.body.password;
    const rawEmail = req.body.email;
    const rawDisplayName = req.body.displayName;
    const rawConfirmPassword = req.body.confirmPassword;

    // Normalize (but do NOT echo password back)
    const username = String(rawUsername || "").trim();
    const password = String(rawPassword || "");
    const email = String(rawEmail || "").trim().toLowerCase();
    const displayName = String(rawDisplayName || "").trim();

    const errors = [];

    // Required fields
    if (!username) errors.push("Username is required.");
    if (!password) errors.push("Password is required.");
    if (!email) errors.push("Email is required.");
    if (!displayName) errors.push("Display name is required.");

    // Validate formats
    if (email && !isValidEmail(email)) {
      errors.push("Please enter a valid email address.");
    }

    if (displayName && !isValidDisplayName(displayName)) {
      errors.push(
        "Display name must be 3–30 characters and use letters/numbers/spaces/_-."
      );
    }

    if (username && displayName) {
      if (displayName.toLowerCase() === username.toLowerCase()) {
        errors.push("Display name must be different from username.");
      }
    }

    // Password strength
    if (password && username) {
      const pwErr = validatePasswordStrength(password, username);
      if (pwErr) {
        if (Array.isArray(pwErr)) errors.push(...pwErr);
        else errors.push(pwErr);
      }
    } else if (password) {
      // Ifnpassword validator expects username, skip/avoid calling it without username
      const pwErr = validatePasswordStrength(password, "");
      if (pwErr) errors.push(Array.isArray(pwErr) ? pwErr.join("\n") : pwErr);
    }

    // confirm password field
    const confirmPassword = String(rawConfirmPassword || "");
    if (password !== confirmPassword) {
      errors.push("Passwords must match");
    }

    // If we already have validation errors, stop here so we don't write to db
    if (errors.length > 0) {
      return res.status(400).render("register", {
        errors,        // multi-error array
        error: null,   // Avoid double display
        username,
        email,
        displayName,
      });
    }

    // Uniqueness checks
    const existingUser = await findUserByUsername(username);
    if (existingUser) errors.push("That username is already taken.");

    const existingEmail = await findUserByEmail(email);
    if (existingEmail) errors.push("That email is already registered.");

    if (errors.length > 0) {
      return res.status(400).render("register", {
        errors,
        error: null,
        username,
        email,
        displayName,
      });
    }

    // Create user
    const passwordHash = await hashPassword(password);

    const userId = await createUser({
      username,
      passwordHash,
      email,
      displayName,
    });

    // Create session
    const sessionId = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString();
    await createSession({ userId, sessionId, expiresAt });

    res.cookie("session_id", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60,
      path: "/", // good explicit default
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

    return res.redirect("/");
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
