// nodejs/src/middleware/security.js
// Centralized security helpers
// Includes helpers for password policy, validation, lockout logic, and IP extraction.

const argon2 = require("argon2");

// basic email validation
function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// display name validation
function isValidDisplayName(displayName) {
  if (typeof displayName !== "string") return false;
  const v = displayName.trim();
  if (v.length < 3 || v.length > 30) return false;
  return /^[a-zA-Z0-9 _-]+$/.test(v);
}

// Password strength validation helper. Updated to return list of errors opposed to first one that gets flagged
function validatePasswordStrength(password, username) {
  const p = String(password || "");
  const u = String(username || "").trim().toLowerCase();

  const issues = [];

  if (p.length < 12) issues.push("Password must be at least 12 characters.");
  if (!/[a-z]/.test(p)) issues.push("Password must include a lowercase letter.");
  if (!/[A-Z]/.test(p)) issues.push("Password must include an uppercase letter.");
  if (!/[0-9]/.test(p)) issues.push("Password must include a number.");
  if (!/[^a-zA-Z0-9]/.test(p)) issues.push("Password must include a symbol.");
  if (u && p.toLowerCase().includes(u)) issues.push("Password must not contain your username.");

  return issues.length ? issues : null;
}

// Helper to capture user IP, used in login attempt tracking
function getClientIp(req) {
  if (Array.isArray(req.ips) && req.ips.length > 0) {
    return req.ips[0];
  }

  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) {
    // first IP is the original client
    return xff.split(",")[0].trim();
  }

  return req.ip;
}

// Hahing helpers
async function hashPassword(plainPassword) {
  return argon2.hash(String(plainPassword), { type: argon2.argon2id });
}

async function verifyPassword(hash, plainPassword) {
  if (!hash) return false;
  return argon2.verify(hash, String(plainPassword));
}

module.exports = { isValidEmail, isValidDisplayName, validatePasswordStrength, getClientIp, hashPassword, verifyPassword, };
