// src/middleware/auth.js
// Authentication middleware that resolves current user based on cookie session ID

const { findSession } = require('../db/sessions');
const { findUserById } = require('../db/users');

async function attachCurrentUser(req, res, next) {
  try {
    const sessionId = req.cookies?.session_id;
    if (!sessionId) {
      res.locals.isLoggedIn = false;
      return next();
    }

    const session = await findSession(sessionId);
    if (!session) {
      res.locals.isLoggedIn = false;
      return next();
    }

    // Basic expiry
    if (new Date(session.expires_at) < new Date()) {
      res.locals.isLoggedIn = false;
      return next();
    }

    const user = await findUserById(session.user_id);
    if (!user) {
      res.locals.isLoggedIn = false;
      return next();
    }

    req.user = user;
    res.locals.isLoggedIn = true;
    res.locals.currentUser = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

function requireAuth(req, res, next) {
  if (!req.user) return res.redirect('/login');
  return next();
}

module.exports = { attachCurrentUser, requireAuth,
};
