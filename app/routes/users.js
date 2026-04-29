const express = require('express');
const db = require('../services/db');

const router = express.Router();

/* =========================================================
   PROFILE POINTS / LEVEL HELPERS
========================================================= */
function calculatePoints(user) {
    const postCount = Number(user.postCount || user.post_count || 0);
    const totalLikes = Number(user.totalLikes || user.total_likes || 0);
    const savedPostsCount = Number(user.savedPostsCount || user.saved_posts_count || 0);
    const followersCount = Number(user.followersCount || user.followers_count || 0);
    const commentsCount = Number(user.commentsCount || user.comments_count || 0);

    return (
        (postCount * 25) +
        (totalLikes * 5) +
        (savedPostsCount * 10) +
        (followersCount * 15) +
        (commentsCount * 3)
    );
}

function getUserLevel(points) {
    const level = Math.min(10, Math.max(1, Math.floor(Number(points || 0) / 100) + 1));

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

function getUserBadges(user) {
    const badges = [];

    const postCount = Number(user.postCount || 0);
    const followersCount = Number(user.followersCount || 0);
    const commentsCount = Number(user.commentsCount || 0);
    const points = Number(user.points || 0);

    if (postCount <= 1) {
        badges.push('New Member');
    }

    if (postCount >= 3) {
        badges.push('Guide Creator');
    }

    if (commentsCount >= 10) {
        badges.push('Helpful Gamer');
    }

    if (followersCount >= 5) {
        badges.push('Popular Creator');
    }

    if (points >= 300) {
        badges.push('Top Contributor');
    }

    if (user.is_verified || user.isVerified) {
        badges.push('Verified Creator');
    }

    return badges;
}

function normalizeUser(row, currentUserId = 0) {
    const postCount = Number(row.postCount || 0);
    const totalLikes = Number(row.totalLikes || 0);
    const totalViews = Number(row.totalViews || 0);
    const followersCount = Number(row.followersCount || 0);
    const followingCount = Number(row.followingCount || 0);
    const savedPostsCount = Number(row.savedPostsCount || 0);
    const commentsCount = Number(row.commentsCount || 0);
    const commentsReceivedCount = Number(row.commentsReceivedCount || 0);

    const baseUser = {
        ...row,

        avatar: row.avatar_url,
        photo: row.avatar_url,
        profile_photo: row.avatar_url,

        postCount,
        post_count: postCount,
        posts_count: postCount,

        totalLikes,
        total_likes: totalLikes,

        totalViews,
        total_views: totalViews,

        followersCount,
        follower_count: followersCount,
        followers_count: followersCount,

        followingCount,
        following_count: followingCount,

        savedPostsCount,
        saved_posts_count: savedPostsCount,

        commentsCount,
        comments_count: commentsCount,

        commentsReceivedCount,
        comments_received_count: commentsReceivedCount,

        isFollowing: Boolean(row.is_following),
        is_following: Boolean(row.is_following),

        isOwnProfile: Number(currentUserId) === Number(row.id),
        isVerified: Boolean(row.is_verified),
        is_verified: Boolean(row.is_verified)
    };

    const points = calculatePoints(baseUser);
    const rank = getUserLevel(points);
    const rankProgress = getRankProgress(points);

    return {
        ...baseUser,
        points,
        rank,
        rankLevel: rank.level,
        rankName: rank.name,
        rankLabel: rank.label,
        rankProgress,
        badges: getUserBadges({
            ...baseUser,
            points
        })
    };
}

/* =========================================================
   SAFE OPTIONAL USER COLUMNS
   This prevents crashes if you have not added social fields yet.
========================================================= */
let cachedUserColumns = null;

async function getUserColumns() {
    if (cachedUserColumns) {
        return cachedUserColumns;
    }

    const [columns] = await db.query('SHOW COLUMNS FROM users');
    cachedUserColumns = new Set(columns.map(column => column.Field));

    return cachedUserColumns;
}

async function getUserExtraSelect(alias = 'users') {
    const columns = await getUserColumns();

    const joinedAt = columns.has('joined_at')
        ? `${alias}.joined_at AS joined_at`
        : columns.has('created_at')
            ? `${alias}.created_at AS joined_at`
            : `NULL AS joined_at`;

    const twitterUrl = columns.has('twitter_url')
        ? `${alias}.twitter_url AS twitter_url`
        : `NULL AS twitter_url`;

    const youtubeUrl = columns.has('youtube_url')
        ? `${alias}.youtube_url AS youtube_url`
        : `NULL AS youtube_url`;

    const twitchUrl = columns.has('twitch_url')
        ? `${alias}.twitch_url AS twitch_url`
        : `NULL AS twitch_url`;

    const discordName = columns.has('discord_name')
        ? `${alias}.discord_name AS discord_name`
        : `NULL AS discord_name`;

    const isVerified = columns.has('is_verified')
        ? `${alias}.is_verified AS is_verified`
        : `0 AS is_verified`;

    return [
        joinedAt,
        twitterUrl,
        youtubeUrl,
        twitchUrl,
        discordName,
        isVerified
    ].join(',\n                ');
}

function getUserStatsJoins() {
    return `
        LEFT JOIN (
            SELECT 
                user_id,
                COUNT(*) AS post_count,
                COALESCE(SUM(likes), 0) AS total_likes,
                COALESCE(SUM(views), 0) AS total_views
            FROM posts
            GROUP BY user_id
        ) AS post_stats ON post_stats.user_id = users.id

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

        LEFT JOIN (
            SELECT user_id, COUNT(*) AS total_saved_posts
            FROM saved_posts
            GROUP BY user_id
        ) AS saved_counts ON saved_counts.user_id = users.id

        LEFT JOIN (
            SELECT user_id, COUNT(*) AS total_comments_written
            FROM comments
            GROUP BY user_id
        ) AS comment_counts ON comment_counts.user_id = users.id

        LEFT JOIN (
            SELECT posts.user_id, COUNT(comments.id) AS total_comments_received
            FROM posts
            LEFT JOIN comments ON comments.post_id = posts.id
            GROUP BY posts.user_id
        ) AS received_comment_counts ON received_comment_counts.user_id = users.id
    `;
}

async function getUsersWithStats(whereSql = '', params = [], currentUserId = 0, orderSql = '') {
    const extraSelect = await getUserExtraSelect('users');

    const [users] = await db.query(
        `
        SELECT 
            users.id,
            users.username,
            users.avatar_url,
            users.bio,
            users.location,
            users.favorite_game,
            users.website,

            ${extraSelect},

            COALESCE(post_stats.post_count, 0) AS postCount,
            COALESCE(post_stats.total_likes, 0) AS totalLikes,
            COALESCE(post_stats.total_views, 0) AS totalViews,

            COALESCE(follower_counts.total_followers, 0) AS followersCount,
            COALESCE(following_counts.total_following, 0) AS followingCount,
            COALESCE(saved_counts.total_saved_posts, 0) AS savedPostsCount,
            COALESCE(comment_counts.total_comments_written, 0) AS commentsCount,
            COALESCE(received_comment_counts.total_comments_received, 0) AS commentsReceivedCount,

            EXISTS (
                SELECT 1
                FROM user_follows
                WHERE user_follows.follower_id = ?
                AND user_follows.following_id = users.id
            ) AS is_following

        FROM users

        ${getUserStatsJoins()}

        ${whereSql}

        ${orderSql || 'ORDER BY postCount DESC, followersCount DESC, users.username ASC'}
        `,
        [currentUserId, ...params]
    );

    return users.map(user => normalizeUser(user, currentUserId));
}

function safeRedirect(url, fallback) {
    if (url && typeof url === 'string' && url.startsWith('/')) {
        return url;
    }

    return fallback;
}

/* =========================================================
   USERS LIST PAGE
========================================================= */
router.get('/', async (req, res) => {
    try {
        const currentUserId = req.session.user ? Number(req.session.user.id) : 0;

        const formattedUsers = await getUsersWithStats(
            '',
            [],
            currentUserId,
            'ORDER BY postCount DESC, followersCount DESC, users.username ASC'
        );

        const totalMembers = formattedUsers.length;
        const totalPosts = formattedUsers.reduce(
            (sum, user) => sum + Number(user.postCount || 0),
            0
        );

        const averagePosts = totalMembers
            ? (totalPosts / totalMembers).toFixed(1)
            : '0.0';

        res.render('users', {
            users: formattedUsers,
            stats: {
                totalMembers,
                totalPosts,
                averagePosts
            },
            pageTitle: 'Community Members',
            user: req.session.user || null,
            currentUser: req.session.user || null
        });

    } catch (err) {
        console.error('USERS LIST ERROR:', err);
        res.status(500).send('Server Error');
    }
});

/* =========================================================
   FOLLOW / UNFOLLOW USER
========================================================= */
router.post('/:id/follow', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const followingId = Number(req.params.id);
        const followerId = Number(req.session.user.id);

        const redirectUrl = safeRedirect(
            req.body.redirect,
            `/users/${followingId}`
        );

        if (!followingId) {
            return res.status(400).send('Invalid user');
        }

        if (followerId === followingId) {
            return res.redirect(redirectUrl);
        }

        const [targetUserRows] = await db.query(
            'SELECT id FROM users WHERE id = ?',
            [followingId]
        );

        if (!targetUserRows.length) {
            return res.status(404).send('User not found');
        }

        const [existing] = await db.query(
            `
            SELECT follower_id, following_id
            FROM user_follows
            WHERE follower_id = ? AND following_id = ?
            `,
            [followerId, followingId]
        );

        if (existing.length) {
            await db.query(
                `
                DELETE FROM user_follows
                WHERE follower_id = ? AND following_id = ?
                `,
                [followerId, followingId]
            );
        } else {
            await db.query(
                `
                INSERT INTO user_follows
                (follower_id, following_id)
                VALUES (?, ?)
                `,
                [followerId, followingId]
            );
        }

        res.redirect(redirectUrl);

    } catch (err) {
        console.error('FOLLOW USER ERROR:', err);
        res.status(500).send('Server Error');
    }
});

/* =========================================================
   USER FOLLOWERS PAGE
   Keep before router.get('/:id')
========================================================= */
router.get('/:id/followers', async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const currentUserId = req.session.user ? Number(req.session.user.id) : 0;

        const [targetRows] = await db.query(
            'SELECT id, username FROM users WHERE id = ?',
            [userId]
        );

        if (!targetRows.length) {
            return res.status(404).send('User not found');
        }

        const followers = await getUsersWithStats(
            `
            JOIN user_follows AS relation_filter
            ON relation_filter.follower_id = users.id
            WHERE relation_filter.following_id = ?
            `,
            [userId],
            currentUserId,
            'ORDER BY relation_filter.follower_id DESC'
        );

        res.render('users', {
            users: followers,
            stats: {
                totalMembers: followers.length,
                totalPosts: followers.reduce((sum, user) => sum + Number(user.postCount || 0), 0),
                averagePosts: followers.length
                    ? (followers.reduce((sum, user) => sum + Number(user.postCount || 0), 0) / followers.length).toFixed(1)
                    : '0.0'
            },
            pageTitle: `${targetRows[0].username}'s Followers`,
            heroTitle: `${targetRows[0].username}'s Followers`,
            heroText: `People following ${targetRows[0].username}.`,
            user: req.session.user || null,
            currentUser: req.session.user || null
        });

    } catch (err) {
        console.error('FOLLOWERS PAGE ERROR:', err);
        res.status(500).send('Server Error');
    }
});

/* =========================================================
   USER FOLLOWING PAGE
   Keep before router.get('/:id')
========================================================= */
router.get('/:id/following', async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const currentUserId = req.session.user ? Number(req.session.user.id) : 0;

        const [targetRows] = await db.query(
            'SELECT id, username FROM users WHERE id = ?',
            [userId]
        );

        if (!targetRows.length) {
            return res.status(404).send('User not found');
        }

        const following = await getUsersWithStats(
            `
            JOIN user_follows AS relation_filter
            ON relation_filter.following_id = users.id
            WHERE relation_filter.follower_id = ?
            `,
            [userId],
            currentUserId,
            'ORDER BY relation_filter.following_id DESC'
        );

        res.render('users', {
            users: following,
            stats: {
                totalMembers: following.length,
                totalPosts: following.reduce((sum, user) => sum + Number(user.postCount || 0), 0),
                averagePosts: following.length
                    ? (following.reduce((sum, user) => sum + Number(user.postCount || 0), 0) / following.length).toFixed(1)
                    : '0.0'
            },
            pageTitle: `${targetRows[0].username}'s Following`,
            heroTitle: `${targetRows[0].username}'s Following`,
            heroText: `Creators followed by ${targetRows[0].username}.`,
            user: req.session.user || null,
            currentUser: req.session.user || null
        });

    } catch (err) {
        console.error('FOLLOWING PAGE ERROR:', err);
        res.status(500).send('Server Error');
    }
});

/* =========================================================
   PUBLIC USER PROFILE PAGE
========================================================= */
router.get('/:id', async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const currentUserId = req.session.user ? Number(req.session.user.id) : 0;

        const profileUsers = await getUsersWithStats(
            'WHERE users.id = ?',
            [userId],
            currentUserId,
            ''
        );

        if (!profileUsers.length) {
            return res.status(404).send('User not found');
        }

        const profileUser = profileUsers[0];

        const [posts] = await db.query(
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

            WHERE posts.user_id = ?
            ORDER BY posts.id DESC
            `,
            [currentUserId, userId]
        );

        const [bestPosts] = await db.query(
            `
            SELECT 
                posts.*,
                COALESCE(comment_counts.total_comments, 0) AS comment_count,
                COALESCE(save_counts.total_saves, 0) AS save_count,
                (
                    COALESCE(posts.likes, 0) * 5 +
                    COALESCE(posts.views, 0) +
                    COALESCE(save_counts.total_saves, 0) * 10 +
                    COALESCE(comment_counts.total_comments, 0) * 3
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
            AND category != ''
            GROUP BY category
            ORDER BY total DESC, category ASC
            LIMIT 6
            `,
            [userId]
        );

        const socialLinks = {
            website: profileUser.website || null,
            twitter: profileUser.twitter_url || null,
            youtube: profileUser.youtube_url || null,
            twitch: profileUser.twitch_url || null,
            discord: profileUser.discord_name || null
        };

        const stats = {
            postCount: profileUser.postCount,
            totalPosts: profileUser.postCount,
            total_posts: profileUser.postCount,

            totalLikes: profileUser.totalLikes,
            total_likes: profileUser.totalLikes,

            totalViews: profileUser.totalViews,
            total_views: profileUser.totalViews,

            followersCount: profileUser.followersCount,
            followerCount: profileUser.followersCount,
            followers_count: profileUser.followersCount,

            followingCount: profileUser.followingCount,
            following_count: profileUser.followingCount,

            savedPostsCount: profileUser.savedPostsCount,
            saved_posts_count: profileUser.savedPostsCount,

            commentsCount: profileUser.commentsCount,
            comments_count: profileUser.commentsCount,
            totalComments: profileUser.commentsCount,
            total_comments: profileUser.commentsCount,

            commentsReceivedCount: profileUser.commentsReceivedCount,
            comments_received_count: profileUser.commentsReceivedCount,

            points: profileUser.points,
            rank: profileUser.rank,
            rankProgress: profileUser.rankProgress
        };

        res.render('user-profile', {
            profileUser,
            posts,
            bestPosts,
            recentActivity,
            favoriteGames,
            socialLinks,
            badges: profileUser.badges,
            rank: profileUser.rank,
            rankProgress: profileUser.rankProgress,
            points: profileUser.points,
            stats,
            user: req.session.user || null,
            currentUser: req.session.user || null
        });

    } catch (err) {
        console.error('PUBLIC USER PROFILE ERROR:', err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;