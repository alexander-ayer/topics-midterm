// src/middleware/apiAuth.js
// API auth middleware: return JSON 401 instead of redirecting to /login

function requireApiAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  return next();
}

module.exports = { requireApiAuth };
