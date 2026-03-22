const express = require('express');
const session = require('express-session');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const aboutRoutes = require('./routes/about');
const db = require('./services/db');

const app = express();

// VIEW ENGINE
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// MIDDLEWARE
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../static')));

// SESSION
app.use(session({
    secret: 'gaming-secret',
    resave: false,
    saveUninitialized: false
}));

// GLOBAL USER
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// ROUTES
app.use('/', authRoutes);
app.use('/users', userRoutes);
app.use('/posts', postRoutes);
app.use('/about', aboutRoutes);

// PROFILE (AUTH-BASED)
app.get('/profile', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.render('profile', { user: null, posts: [] });
        }

        const userId = req.session.user.id;

        const [users] = await db.query(
            'SELECT * FROM users WHERE id=?',
            [userId]
        );

        if (!users.length) {
            return res.render('profile', { user: null, posts: [] });
        }

        const [posts] = await db.query(
            'SELECT * FROM posts WHERE user_id=?',
            [userId]
        );

        res.render('profile', {
            user: users[0],
            posts
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

// HOME
app.get('/', (req, res) => {
    res.redirect('/posts');
});

// 404
app.use((req, res) => {
    res.status(404).send("404 - Page Not Found");
});

// SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎮 Gaming Platform running at http://localhost:3000`);
});