// server.js
const express = require('express');
const session = require('express-session');
const path = require('path');
const apiRoutes = require('./routes/apiRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// === CONFIG ===
const APP_PASSWORD = process.env.APP_PASSWORD || 'mySecret123'; // Set this in env for production
const SESSION_SECRET = process.env.SESSION_SECRET || 'verysecretkey';

// === MIDDLEWARE ===
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true if using HTTPS in production
  })
);

// === AUTH MIDDLEWARE ===
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  return res.redirect('/login');
}

// === LOGIN ROUTES ===
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === APP_PASSWORD) {
    req.session.authenticated = true;
    return res.redirect('/');
  }
  return res.send('Invalid password. <a href="/login">Try again</a>.');
});

// === LOGOUT ROUTE (optional) ===
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// === PROTECTED STATIC ASSETS ===
app.use(requireAuth, express.static(path.join(__dirname, 'public')));

// === PROTECTED API ROUTES ===
app.use('/api', requireAuth, apiRoutes);

// === PROTECTED ROOT ===
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// === START SERVER ===
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
