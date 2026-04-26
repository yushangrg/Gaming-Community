const express = require('express');
const session = require('express-session');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const aboutRoutes = require('./routes/about');
const db = require('./services/db');

const app = express();

/* =========================================================
   VIEW ENGINE
========================================================= */
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

/* =========================================================
   MIDDLEWARE
========================================================= */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../static')));

/* =========================================================
   SESSION
========================================================= */
app.use(session({
    secret: 'gaming-secret',
    resave: false,
    saveUninitialized: false
}));

/* =========================================================
   GLOBAL USER FOR ALL PUG FILES
========================================================= */
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

/* =========================================================
   MAIN ROUTES
========================================================= */
app.use('/', authRoutes);
app.use('/users', userRoutes);
app.use('/posts', postRoutes);
app.use('/about', aboutRoutes);

/* =========================================================
   STATIC FOOTER PAGES
========================================================= */
app.get('/privacy-policy', (req, res) => {
    res.render('privacy-policy');
});

app.get('/terms-of-service', (req, res) => {
    res.render('terms-of-service');
});

app.get('/support', (req, res) => {
    res.render('support');
});

/* =========================================================
   PROFILE PAGE
========================================================= */
app.get('/profile', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.render('profile', {
                user: null,
                posts: [],
                stats: {
                    postCount: 0,
                    points: 0,
                    totalViews: 0,
                    totalLikes: 0
                }
            });
        }

        const userId = req.session.user.id;

        const [users] = await db.query(
            `
            SELECT 
                id,
                username,
                email,
                avatar_url,
                bio,
                location,
                favorite_game,
                website
            FROM users
            WHERE id = ?
            `,
            [userId]
        );

        if (!users.length) {
            req.session.destroy(() => {});
            return res.render('profile', {
                user: null,
                posts: [],
                stats: {
                    postCount: 0,
                    points: 0,
                    totalViews: 0,
                    totalLikes: 0
                }
            });
        }

        const [posts] = await db.query(
            `
            SELECT 
                posts.*,
                COALESCE(comment_counts.total_comments, 0) AS comment_count
            FROM posts
            LEFT JOIN (
                SELECT post_id, COUNT(*) AS total_comments
                FROM comments
                GROUP BY post_id
            ) AS comment_counts ON comment_counts.post_id = posts.id
            WHERE posts.user_id = ?
            ORDER BY posts.id DESC
            `,
            [userId]
        );

        const [statsRows] = await db.query(
            `
            SELECT
                COUNT(*) AS postCount,
                COALESCE(SUM(likes), 0) AS totalLikes,
                COALESCE(SUM(views), 0) AS totalViews
            FROM posts
            WHERE user_id = ?
            `,
            [userId]
        );

        const postCount = statsRows[0].postCount || 0;
        const totalLikes = statsRows[0].totalLikes || 0;
        const totalViews = statsRows[0].totalViews || 0;

        const stats = {
            postCount,
            totalLikes,
            totalViews,
            points: (postCount * 25) + (totalLikes * 5)
        };

        res.render('profile', {
            user: users[0],
            posts,
            stats
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

/* =========================================================
   UPDATE PROFILE
========================================================= */
app.post('/profile/update', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const userId = req.session.user.id;

        const {
            username,
            email,
            avatar_url,
            bio,
            location,
            favorite_game,
            website
        } = req.body;

        if (!username || !email) {
            return res.redirect('/profile');
        }

        await db.query(
            `
            UPDATE users
            SET 
                username = ?,
                email = ?,
                avatar_url = ?,
                bio = ?,
                location = ?,
                favorite_game = ?,
                website = ?
            WHERE id = ?
            `,
            [
                username.trim(),
                email.trim(),
                avatar_url && avatar_url.trim() ? avatar_url.trim() : null,
                bio && bio.trim() ? bio.trim() : null,
                location && location.trim() ? location.trim() : null,
                favorite_game && favorite_game.trim() ? favorite_game.trim() : null,
                website && website.trim() ? website.trim() : null,
                userId
            ]
        );

        req.session.user.username = username.trim();
        req.session.user.email = email.trim();
        req.session.user.avatar_url = avatar_url && avatar_url.trim() ? avatar_url.trim() : null;

        res.redirect('/profile');

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

/* =========================================================
   HOME
========================================================= */
app.get('/', (req, res) => {
    res.redirect('/posts');
});

/* =========================================================
   404
========================================================= */
app.use((req, res) => {
    res.status(404).send("404 - Page Not Found");
});

// SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎮 Gaming Platform running at http://localhost:3000`);
});