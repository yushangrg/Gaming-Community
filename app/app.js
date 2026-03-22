const express = require('express');
const session = require('express-session');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const aboutRoutes = require('./routes/about');

const app = express();

// ======================
// VIEW ENGINE
// ======================
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// ======================
// MIDDLEWARE
// ======================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ✅ STATIC FILES (IMPORTANT)
app.use(express.static(path.join(__dirname, '../static')));

// ======================
// SESSION
// ======================
app.use(session({
    secret: 'gaming-secret',
    resave: false,
    saveUninitialized: false
}));

// ======================
// GLOBAL VARIABLES (for Pug)
// ======================
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// ======================
// ROUTES
// ======================
app.use('/', authRoutes);
app.use('/users', userRoutes);
app.use('/posts', postRoutes);
app.use('/about', aboutRoutes);

// ======================
// HOME ROUTE
// ======================
app.get('/', (req, res) => {
    res.redirect('/posts');
});

// ======================
// ERROR HANDLING
// ======================
app.use((req, res) => {
    res.status(404).send("404 - Page Not Found");
});

// ======================
// SERVER (DOCKER READY)
// ======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎮 Gaming Platform running at http://localhost:3000`);
});