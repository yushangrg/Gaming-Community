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
   PROFILE POINTS / LEVEL HELPERS
========================================================= */
function calculateProfilePoints(stats) {
    const postCount = Number(stats.postCount || 0);
    const totalLikes = Number(stats.totalLikes || 0);
    const followersCount = Number(stats.followersCount || stats.followerCount || 0);
    const commentsCount = Number(stats.commentsCount || 0);
    const savesReceivedCount = Number(stats.savesReceivedCount || 0);

    return (
        (postCount * 25) +
        (totalLikes * 5) +
        (savesReceivedCount * 10) +
        (followersCount * 15) +
        (commentsCount * 3)
    );
}

function getUserLevel(points) {
    const safePoints = Number(points || 0);
    const level = Math.min(10, Math.max(1, Math.floor(safePoints / 100) + 1));

    const levelNames = {
        1: 'Rookie',
        2: 'Scout',
        3: 'Gamer',
        4: 'Grinder',
        5: 'Strategist',
        6: 'Expert',
        7: 'Elite',
        8: 'Master',
        9: 'Legend',
        10: 'Pro Creator'
    };

    return {
        level,
        name: levelNames[level],
        label: `Level ${level} ${levelNames[level]}`
    };
}

function getRankProgress(points) {
    const safePoints = Number(points || 0);

    if (safePoints >= 900) {
        return 100;
    }

    return safePoints % 100;
}

function getUserBadges(stats, user) {
    const badges = [];

    if (Number(stats.postCount || 0) <= 1) {
        badges.push('New Member');
    }

    if (Number(stats.postCount || 0) >= 3) {
        badges.push('Guide Creator');
    }

    if (Number(stats.commentsCount || 0) >= 10) {
        badges.push('Helpful Gamer');
    }

    if (Number(stats.followersCount || stats.followerCount || 0) >= 5) {
        badges.push('Popular Creator');
    }

    if (Number(stats.points || 0) >= 300) {
        badges.push('Top Contributor');
    }

    if (user && user.is_verified) {
        badges.push('Verified Creator');
    }

    return badges;
}

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
            const emptyRank = getUserLevel(0);

            return res.render('profile', {
                user: null,
                currentUser: null,
                posts: [],
                bestPosts: [],
                recentActivity: [],
                favoriteGames: [],
                badges: [],
                stats: {
                    postCount: 0,
                    totalLikes: 0,
                    totalViews: 0,
                    followersCount: 0,
                    followerCount: 0,
                    followingCount: 0,
                    savedPostsCount: 0,
                    savedCount: 0,
                    savesReceivedCount: 0,
                    commentsCount: 0,
                    commentsReceivedCount: 0,
                    points: 0,
                    rank: emptyRank,
                    rankProgress: 0
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
                users.joined_at,
                users.twitter_url,
                users.youtube_url,
                users.twitch_url,
                users.discord_name,
                users.is_verified,

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

            const emptyRank = getUserLevel(0);

            return res.render('profile', {
                user: null,
                currentUser: null,
                posts: [],
                bestPosts: [],
                recentActivity: [],
                favoriteGames: [],
                badges: [],
                stats: {
                    postCount: 0,
                    totalLikes: 0,
                    totalViews: 0,
                    followersCount: 0,
                    followerCount: 0,
                    followingCount: 0,
                    savedPostsCount: 0,
                    savedCount: 0,
                    savesReceivedCount: 0,
                    commentsCount: 0,
                    commentsReceivedCount: 0,
                    points: 0,
                    rank: emptyRank,
                    rankProgress: 0
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
                COALESCE(post_stats.postCount, 0) AS postCount,
                COALESCE(post_stats.totalLikes, 0) AS totalLikes,
                COALESCE(post_stats.totalViews, 0) AS totalViews,

                COALESCE(follower_stats.followersCount, 0) AS followersCount,
                COALESCE(following_stats.followingCount, 0) AS followingCount,

                COALESCE(saved_by_user_stats.savedPostsCount, 0) AS savedPostsCount,
                COALESCE(saves_received_stats.savesReceivedCount, 0) AS savesReceivedCount,

                COALESCE(comment_stats.commentsCount, 0) AS commentsCount,
                COALESCE(received_comment_stats.commentsReceivedCount, 0) AS commentsReceivedCount

            FROM users

            LEFT JOIN (
                SELECT 
                    user_id,
                    COUNT(*) AS postCount,
                    COALESCE(SUM(likes), 0) AS totalLikes,
                    COALESCE(SUM(views), 0) AS totalViews
                FROM posts
                GROUP BY user_id
            ) AS post_stats ON post_stats.user_id = users.id

            LEFT JOIN (
                SELECT following_id, COUNT(*) AS followersCount
                FROM user_follows
                GROUP BY following_id
            ) AS follower_stats ON follower_stats.following_id = users.id

            LEFT JOIN (
                SELECT follower_id, COUNT(*) AS followingCount
                FROM user_follows
                GROUP BY follower_id
            ) AS following_stats ON following_stats.follower_id = users.id

            LEFT JOIN (
                SELECT user_id, COUNT(*) AS savedPostsCount
                FROM saved_posts
                GROUP BY user_id
            ) AS saved_by_user_stats ON saved_by_user_stats.user_id = users.id

            LEFT JOIN (
                SELECT posts.user_id, COUNT(saved_posts.post_id) AS savesReceivedCount
                FROM posts
                LEFT JOIN saved_posts ON saved_posts.post_id = posts.id
                GROUP BY posts.user_id
            ) AS saves_received_stats ON saves_received_stats.user_id = users.id

            LEFT JOIN (
                SELECT user_id, COUNT(*) AS commentsCount
                FROM comments
                GROUP BY user_id
            ) AS comment_stats ON comment_stats.user_id = users.id

            LEFT JOIN (
                SELECT posts.user_id, COUNT(comments.id) AS commentsReceivedCount
                FROM posts
                LEFT JOIN comments ON comments.post_id = posts.id
                GROUP BY posts.user_id
            ) AS received_comment_stats ON received_comment_stats.user_id = users.id

            WHERE users.id = ?
            `,
            [userId]
        );

        const baseStats = {
            postCount: Number(statsRows[0].postCount || 0),
            totalLikes: Number(statsRows[0].totalLikes || 0),
            totalViews: Number(statsRows[0].totalViews || 0),

            followersCount: Number(statsRows[0].followersCount || 0),
            followerCount: Number(statsRows[0].followersCount || 0),
            followingCount: Number(statsRows[0].followingCount || 0),

            savedPostsCount: Number(statsRows[0].savedPostsCount || 0),
            savedCount: Number(statsRows[0].savedPostsCount || 0),
            savesReceivedCount: Number(statsRows[0].savesReceivedCount || 0),

            commentsCount: Number(statsRows[0].commentsCount || 0),
            commentsReceivedCount: Number(statsRows[0].commentsReceivedCount || 0)
        };

        const points = calculateProfilePoints(baseStats);
        const rank = getUserLevel(points);
        const rankProgress = getRankProgress(points);

        const stats = {
            ...baseStats,
            points,
            rank,
            rankProgress
        };

        const badges = getUserBadges(stats, profileUser);

        const [bestPosts] = await db.query(
            `
            SELECT 
                posts.*,

                COALESCE(comment_counts.total_comments, 0) AS comment_count,
                COALESCE(comment_counts.total_comments, 0) AS comments_count,
                COALESCE(comment_counts.total_comments, 0) AS total_comments,

                COALESCE(save_counts.total_saves, 0) AS save_count,

                (
                    (COALESCE(posts.likes, 0) * 5) +
                    (COALESCE(posts.views, 0) * 1) +
                    (COALESCE(save_counts.total_saves, 0) * 10) +
                    (COALESCE(comment_counts.total_comments, 0) * 3)
                ) AS post_score

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
            ORDER BY post_score DESC, posts.id DESC
            LIMIT 5
            `,
            [userId]
        );

        const [recentActivity] = await db.query(
            `
            SELECT *
            FROM (
                SELECT 
                    'post' AS activity_type,
                    title AS activity_text,
                    CONCAT('/posts/', id) AS activity_link,
                    created_at AS activity_date
                FROM posts
                WHERE user_id = ?

                UNION ALL

                SELECT 
                    'comment' AS activity_type,
                    comment AS activity_text,
                    CONCAT('/posts/', post_id, '#comment-', id) AS activity_link,
                    created_at AS activity_date
                FROM comments
                WHERE user_id = ?
            ) AS activity
            ORDER BY activity_date DESC
            LIMIT 8
            `,
            [userId, userId]
        );

        const [favoriteGames] = await db.query(
            `
            SELECT 
                category AS name,
                COUNT(*) AS total
            FROM posts
            WHERE user_id = ?
            AND category IS NOT NULL
            AND category <> ''
            GROUP BY category
            ORDER BY total DESC, category ASC
            LIMIT 6
            `,
            [userId]
        );

        profileUser.followersCount = stats.followersCount;
        profileUser.followerCount = stats.followerCount;
        profileUser.followingCount = stats.followingCount;
        profileUser.savedPostsCount = stats.savedPostsCount;
        profileUser.savedCount = stats.savedCount;
        profileUser.savesReceivedCount = stats.savesReceivedCount;
        profileUser.commentsCount = stats.commentsCount;
        profileUser.commentsReceivedCount = stats.commentsReceivedCount;
        profileUser.totalLikes = stats.totalLikes;
        profileUser.totalViews = stats.totalViews;
        profileUser.postCount = stats.postCount;
        profileUser.points = points;
        profileUser.rank = rank;
        profileUser.rankLabel = rank.label;
        profileUser.rankProgress = rankProgress;
        profileUser.badges = badges;

        res.render('profile', {
            user: profileUser,
            currentUser: req.session.user || null,
            posts,
            bestPosts,
            recentActivity,
            favoriteGames,
            badges,
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
            website,
            twitter_url,
            youtube_url,
            twitch_url,
            discord_name
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
                website = ?,
                twitter_url = ?,
                youtube_url = ?,
                twitch_url = ?,
                discord_name = ?
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
                twitter_url && twitter_url.trim() ? twitter_url.trim() : null,
                youtube_url && youtube_url.trim() ? youtube_url.trim() : null,
                twitch_url && twitch_url.trim() ? twitch_url.trim() : null,
                discord_name && discord_name.trim() ? discord_name.trim() : null,
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