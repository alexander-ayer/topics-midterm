// src/routes/profileRoutes.js
// Provides routing for all things profile page

const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/auth");

// DB helpers
const {
  findUserById,
  updatePasswordHash,
  updateEmail,
  updateDisplayName,
  updateProfileAvatar,
  updateProfileColor,
} = require("../db/users");

const { deleteSessionsForUser } = require("../db/sessions");

// Security helpers
const {
  verifyPassword,
  hashPassword,
  validatePasswordStrength,
  isValidEmail,
  isValidDisplayName,
} = require("../middleware/security");

function mustHaveUser(res) {
  res.clearCookie("session_id");
  return res.redirect("/login");
}

// GET profile card 
router.get("/profile", requireAuth, async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) return mustHaveUser(res);

    return res.render("profile", { user, error: null, success: null });
  } catch (err) {
    return next(err);
  }
});

// GET profile edit page
router.get("/profile/edit", requireAuth, async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id);

    let success = null;
    if (req.query.success === "display-name") {
      success = "Display name updated.";
    } else if (req.query.success === "customize") {
      success = "Profile updated.";
    }

    return res.render("edit", { user, error: null, errors: null, success });
  } catch (err) {
    return next(err);
  }
});


// GET profile password reset page
router.get("/profile/password", requireAuth, async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) return mustHaveUser(res);

    return res.render("password", { user, error: null, success: null });
  } catch (err) {
    return next(err);
  }
});

// POST profile password reset
router.post("/profile/password", requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    const user = await findUserById(req.user.id);

    const errors = [];

    // Basic presence checks
    if (!currentPassword) errors.push("Current password is required.");
    if (!newPassword) errors.push("New password is required.");

    if (newPassword !== confirmNewPassword) {
      errors.push("New passwords must match");
    }

    // Make sure passwords match
    if(currentPassword == newPassword) {
      errors.push("New password cannot be old password");
    }

    // Only do expensive checks if we have required inputs
    if (errors.length === 0) {
      const ok = await verifyPassword(user.password_hash, String(currentPassword));
      if (!ok) errors.push("Current password is incorrect.");

      const pwIssues = validatePasswordStrength(String(newPassword));
      if (pwIssues) {
        // If validatePasswordStrength returns a string, push it.
        if (Array.isArray(pwIssues)) errors.push(...pwIssues);
        else errors.push(pwIssues);
      }
    }

    if (errors.length > 0) {
      return res.status(400).render("password", {
        user,
        errors,        // array
        error: null,   // keep null to avoid duplicate UI
        success: null,
      });
    }

    const newHash = await hashPassword(String(newPassword));
    await updatePasswordHash(user.id, newHash);
    await deleteSessionsForUser(user.id);

    res.clearCookie("session_id");
    return res.redirect("/login");
  } catch (err) {
    return next(err);
  }
});


// POST profile email change
router.post("/profile/email", requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newEmail } = req.body;
    const user = await findUserById(req.user.id);
    if (!user) return mustHaveUser(res);

    if (!currentPassword || !newEmail) {
      return res.status(400).render("edit", {
        user,
        error: "Current password and new email are required.",
        success: null,
      });
    }

    const ok = await verifyPassword(user.password_hash, String(currentPassword));
    if (!ok) {
      return res.status(400).render("edit", {
        user,
        error: "Password is incorrect.",
        success: null,
      });
    }

    const email = String(newEmail).trim().toLowerCase();
    if (!isValidEmail(email)) {
      return res.status(400).render("edit", {
        user,
        error: "Invalid email format.",
        success: null,
      });
    }

    try {
      await updateEmail(user.id, email);
    } catch (e) {
      return res.status(400).render("edit", {
        user,
        error: "That email is already in use.",
        success: null,
      });
    }

    const updated = await findUserById(req.user.id);
    return res.render("edit", {
      user: updated || user,
      error: null,
      success: "Email updated.",
    });
  } catch (err) {
    return next(err);
  }
});

// POST profile display name change
router.post("/profile/display-name", requireAuth, async (req, res, next) => {
  try {
    const { displayName } = req.body;
    const user = await findUserById(req.user.id);
    if (!user) return mustHaveUser(res);

    const name = String(displayName || "").trim();
    const errors = [];

    if (!isValidDisplayName(name)) {
      errors.push("Invalid display name.");
    }

    if (errors.length) {
      return res.status(400).render("edit", {
        user,
        errors,
        error: null,
        success: null,
      });
    }

    await updateDisplayName(user.id, name);

    // Redirect to GET so the next render is always fresh
    return res.redirect("/profile/edit?success=display-name");
  } catch (err) {
    return next(err);
  }
});


// POST /profile/customize
router.post("/profile/customize", requireAuth, async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) return mustHaveUser(res);

    // Avatar border colors
    const allowedColors = new Set(["", "#c0392b", "#27ae60", "#2980b9"]);
    // Avatar icons
    const allowedAvatars = new Set(["", "cowboy", "sheriff", "horse", "boot", "horseshoe"]);

    const profileColorRaw = String(req.body.profileColor || "").trim();
    const profileAvatarRaw = String(req.body.profileAvatar || "").trim();

    const errors = [];

    if (!allowedColors.has(profileColorRaw)) {
      errors.push("Invalid profile color selection.");
    }

    if (!allowedAvatars.has(profileAvatarRaw)) {
      errors.push("Invalid avatar selection.");
    }

    if (errors.length) {
      return res.status(400).render("edit", {
        user,
        errors,
        error: null,
        success: null,
      });
    }

    const profileColor = profileColorRaw === "" ? null : profileColorRaw;
    const profileAvatar = profileAvatarRaw === "" ? null : profileAvatarRaw;

    await updateProfileColor(user.id, profileColor);
    await updateProfileAvatar(user.id, profileAvatar);

    // Ensures the GET fetches fresh values after POST
    return res.redirect("/profile/edit?success=customize");
  } catch (err) {
    return next(err);
  }
});


module.exports = router;
