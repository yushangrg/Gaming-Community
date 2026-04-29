const express = require('express');
const session = require('express-session');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const aboutRoutes = require('./routes/about');
const notificationRoutes = require('./routes/notifications');

const db = require('./services/db');
const { getUnreadNotificationCount } = require('./services/notifications');

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
   GLOBAL USER + NOTIFICATION COUNT FOR ALL PUG FILES
========================================================= */
app.use(async (req, res, next) => {
    try {
        res.locals.user = req.session.user || null;
        res.locals.currentUser = req.session.user || null;
        res.locals.notificationCount = 0;

        if (req.session.user) {
            res.locals.notificationCount = await getUnreadNotificationCount(req.session.user.id);
        }

        next();
    } catch (err) {
        console.error('GLOBAL LOCALS ERROR:', err);

        res.locals.user = req.session.user || null;
        res.locals.currentUser = req.session.user || null;
        res.locals.notificationCount = 0;

        next();
    }
});

/* =========================================================
   MAIN ROUTES
========================================================= */
app.use('/', authRoutes);
app.use('/users', userRoutes);
app.use('/posts', postRoutes);
app.use('/notifications', notificationRoutes);
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
   QUICK SAVED POSTS REDIRECT
========================================================= */
app.get('/saved', (req, res) => {
    res.redirect('/posts/saved');
});

/* =========================================================
   PROFILE PAGE
========================================================= */
app.get('/profile', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.render('profile', {
                user: null,
                currentUser: null,
                posts: [],
                stats: {
                    postCount: 0,
                    points: 0,
                    totalViews: 0,
                    totalLikes: 0,
                    followerCount: 0,
                    followingCount: 0,
                    savedCount: 0
                }
            });
        }

        const userId = req.session.user.id;

        const [users] = await db.query(
            `
            SELECT 
                users.id,
                users.username,
                users.email,
                users.avatar_url,
                users.bio,
                users.location,
                users.favorite_game,
                users.website,

                COALESCE(follower_counts.total_followers, 0) AS follower_count,
                COALESCE(following_counts.total_following, 0) AS following_count

            FROM users

            LEFT JOIN (
                SELECT following_id, COUNT(*) AS total_followers
                FROM user_follows
                GROUP BY following_id
            ) AS follower_counts ON follower_counts.following_id = users.id

            LEFT JOIN (
                SELECT follower_id, COUNT(*) AS total_following
                FROM user_follows
                GROUP BY follower_id
            ) AS following_counts ON following_counts.follower_id = users.id

            WHERE users.id = ?
            `,
            [userId]
        );

        if (!users.length) {
            req.session.destroy(() => {});

            return res.render('profile', {
                user: null,
                currentUser: null,
                posts: [],
                stats: {
                    postCount: 0,
                    points: 0,
                    totalViews: 0,
                    totalLikes: 0,
                    followerCount: 0,
                    followingCount: 0,
                    savedCount: 0
                }
            });
        }

        const profileUser = users[0];

        const [posts] = await db.query(
            `
            SELECT 
                posts.*,

                COALESCE(comment_counts.total_comments, 0) AS comment_count,
                COALESCE(comment_counts.total_comments, 0) AS comments_count,
                COALESCE(comment_counts.total_comments, 0) AS total_comments,

                COALESCE(save_counts.total_saves, 0) AS save_count,

                EXISTS (
                    SELECT 1
                    FROM saved_posts
                    WHERE saved_posts.post_id = posts.id
                    AND saved_posts.user_id = ?
                ) AS is_saved

            FROM posts

            LEFT JOIN (
                SELECT post_id, COUNT(*) AS total_comments
                FROM comments
                GROUP BY post_id
            ) AS comment_counts ON comment_counts.post_id = posts.id

            LEFT JOIN (
                SELECT post_id, COUNT(*) AS total_saves
                FROM saved_posts
                GROUP BY post_id
            ) AS save_counts ON save_counts.post_id = posts.id

            WHERE posts.user_id = ?
            ORDER BY posts.id DESC
            `,
            [userId, userId]
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

        const [savedRows] = await db.query(
            `
            SELECT COUNT(*) AS savedCount
            FROM saved_posts
            WHERE user_id = ?
            `,
            [userId]
        );

        const postCount = Number(statsRows[0].postCount || 0);
        const totalLikes = Number(statsRows[0].totalLikes || 0);
        const totalViews = Number(statsRows[0].totalViews || 0);
        const followerCount = Number(profileUser.follower_count || 0);
        const followingCount = Number(profileUser.following_count || 0);
        const savedCount = Number(savedRows[0].savedCount || 0);

        const stats = {
            postCount,
            totalLikes,
            totalViews,
            followerCount,
            followingCount,
            savedCount,
            points: (postCount * 25) + (totalLikes * 5)
        };

        res.render('profile', {
            user: profileUser,
            currentUser: req.session.user || null,
            posts,
            stats
        });

    } catch (err) {
        console.error('PROFILE PAGE ERROR:', err);
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
        console.error('UPDATE PROFILE ERROR:', err);
        res.status(500).send('Server Error');
    }
});

/* =========================================================
   HOME DASHBOARD
========================================================= */
app.get('/', async (req, res) => {
    try {
        const currentUserId = req.session.user ? req.session.user.id : 0;

        const [statsRows] = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM users) AS totalMembers,
                (SELECT COUNT(*) FROM posts) AS totalPosts,
                (SELECT COUNT(*) FROM comments) AS totalComments,
                (SELECT COALESCE(SUM(views), 0) FROM posts) AS totalViews
        `);

        const stats = {
            totalMembers: Number(statsRows[0].totalMembers || 0),
            totalPosts: Number(statsRows[0].totalPosts || 0),
            totalComments: Number(statsRows[0].totalComments || 0),
            totalViews: Number(statsRows[0].totalViews || 0)
        };

        const [trendingPosts] = await db.query(
            `
            SELECT
                posts.*,
                users.username,

                COALESCE(comment_counts.total_comments, 0) AS comment_count,
                COALESCE(comment_counts.total_comments, 0) AS comments_count,
                COALESCE(comment_counts.total_comments, 0) AS total_comments,

                COALESCE(save_counts.total_saves, 0) AS save_count,

                EXISTS (
                    SELECT 1
                    FROM saved_posts
                    WHERE saved_posts.post_id = posts.id
                    AND saved_posts.user_id = ?
                ) AS is_saved,

                (
                    (COALESCE(posts.likes, 0) * 5) +
                    (COALESCE(posts.views, 0) * 1) +
                    (COALESCE(comment_counts.total_comments, 0) * 4) +
                    (COALESCE(save_counts.total_saves, 0) * 6)
                ) AS trending_score

            FROM posts

            JOIN users ON posts.user_id = users.id

            LEFT JOIN (
                SELECT post_id, COUNT(*) AS total_comments
                FROM comments
                GROUP BY post_id
            ) AS comment_counts ON comment_counts.post_id = posts.id

            LEFT JOIN (
                SELECT post_id, COUNT(*) AS total_saves
                FROM saved_posts
                GROUP BY post_id
            ) AS save_counts ON save_counts.post_id = posts.id

            ORDER BY trending_score DESC, posts.id DESC
            LIMIT 4
            `,
            [currentUserId]
        );

        const [latestGuides] = await db.query(
            `
            SELECT
                posts.*,
                users.username,

                COALESCE(comment_counts.total_comments, 0) AS comment_count,
                COALESCE(comment_counts.total_comments, 0) AS comments_count,
                COALESCE(comment_counts.total_comments, 0) AS total_comments,

                COALESCE(save_counts.total_saves, 0) AS save_count,

                EXISTS (
                    SELECT 1
                    FROM saved_posts
                    WHERE saved_posts.post_id = posts.id
                    AND saved_posts.user_id = ?
                ) AS is_saved

            FROM posts

            JOIN users ON posts.user_id = users.id

            LEFT JOIN (
                SELECT post_id, COUNT(*) AS total_comments
                FROM comments
                GROUP BY post_id
            ) AS comment_counts ON comment_counts.post_id = posts.id

            LEFT JOIN (
                SELECT post_id, COUNT(*) AS total_saves
                FROM saved_posts
                GROUP BY post_id
            ) AS save_counts ON save_counts.post_id = posts.id

            WHERE posts.post_type IN ('Guide', 'Tip', 'Trick', 'Review')
            ORDER BY posts.id DESC
            LIMIT 4
            `,
            [currentUserId]
        );

        const [topRatedPosts] = await db.query(
            `
            SELECT
                posts.*,
                users.username,

                COALESCE(comment_counts.total_comments, 0) AS comment_count,
                COALESCE(comment_counts.total_comments, 0) AS comments_count,
                COALESCE(comment_counts.total_comments, 0) AS total_comments,

                COALESCE(save_counts.total_saves, 0) AS save_count,

                EXISTS (
                    SELECT 1
                    FROM saved_posts
                    WHERE saved_posts.post_id = posts.id
                    AND saved_posts.user_id = ?
                ) AS is_saved

            FROM posts

            JOIN users ON posts.user_id = users.id

            LEFT JOIN (
                SELECT post_id, COUNT(*) AS total_comments
                FROM comments
                GROUP BY post_id
            ) AS comment_counts ON comment_counts.post_id = posts.id

            LEFT JOIN (
                SELECT post_id, COUNT(*) AS total_saves
                FROM saved_posts
                GROUP BY post_id
            ) AS save_counts ON save_counts.post_id = posts.id

            WHERE COALESCE(posts.rating, 0) > 0
            ORDER BY posts.rating DESC, posts.likes DESC, posts.views DESC, posts.id DESC
            LIMIT 4
            `,
            [currentUserId]
        );

        const [popularGames] = await db.query(
            `
            SELECT
                category,
                COUNT(*) AS post_count,
                COALESCE(SUM(likes), 0) AS total_likes,
                COALESCE(SUM(views), 0) AS total_views
            FROM posts
            WHERE category IS NOT NULL AND category <> ''
            GROUP BY category
            ORDER BY post_count DESC, total_likes DESC, total_views DESC
            LIMIT 8
            `
        );

        const [topCreators] = await db.query(
            `
            SELECT
                users.id,
                users.username,
                users.avatar_url,
                users.favorite_game,

                COUNT(DISTINCT posts.id) AS post_count,
                COALESCE(SUM(posts.likes), 0) AS total_likes,
                COALESCE(SUM(posts.views), 0) AS total_views,
                COALESCE(follower_counts.total_followers, 0) AS follower_count,

                (
                    (COUNT(DISTINCT posts.id) * 25) +
                    (COALESCE(SUM(posts.likes), 0) * 5) +
                    (COALESCE(follower_counts.total_followers, 0) * 15)
                ) AS creator_score

            FROM users

            LEFT JOIN posts ON posts.user_id = users.id

            LEFT JOIN (
                SELECT following_id, COUNT(*) AS total_followers
                FROM user_follows
                GROUP BY following_id
            ) AS follower_counts ON follower_counts.following_id = users.id

            GROUP BY
                users.id,
                users.username,
                users.avatar_url,
                users.favorite_game,
                follower_counts.total_followers

            ORDER BY creator_score DESC, post_count DESC, users.username ASC
            LIMIT 5
            `
        );

        const [recentDiscussions] = await db.query(
            `
            SELECT
                comments.id,
                comments.comment,
                comments.created_at,
                comments.post_id,
                users.username,
                posts.title AS post_title
            FROM comments

            JOIN users ON comments.user_id = users.id
            JOIN posts ON comments.post_id = posts.id

            ORDER BY comments.created_at DESC
            LIMIT 5
            `
        );

        const [featuredVideoRows] = await db.query(
            `
            SELECT
                posts.*,
                users.username,

                COALESCE(comment_counts.total_comments, 0) AS comment_count,
                COALESCE(save_counts.total_saves, 0) AS save_count

            FROM posts

            JOIN users ON posts.user_id = users.id

            LEFT JOIN (
                SELECT post_id, COUNT(*) AS total_comments
                FROM comments
                GROUP BY post_id
            ) AS comment_counts ON comment_counts.post_id = posts.id

            LEFT JOIN (
                SELECT post_id, COUNT(*) AS total_saves
                FROM saved_posts
                GROUP BY post_id
            ) AS save_counts ON save_counts.post_id = posts.id

            WHERE posts.video IS NOT NULL AND posts.video <> ''
            ORDER BY posts.views DESC, posts.likes DESC, posts.id DESC
            LIMIT 1
            `
        );

        const featuredVideo = featuredVideoRows.length ? featuredVideoRows[0] : null;

        res.render('home', {
            stats,
            trendingPosts,
            latestGuides,
            topRatedPosts,
            popularGames,
            topCreators,
            recentDiscussions,
            featuredVideo,
            user: req.session.user || null,
            currentUser: req.session.user || null
        });

    } catch (err) {
        console.error('HOME DASHBOARD ERROR:', err);
        res.status(500).send('Server Error');
    }
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