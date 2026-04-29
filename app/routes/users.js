const express = require('express');
const db = require('../services/db');

const router = express.Router();

/* =========================================================
   USERS LIST PAGE
========================================================= */
router.get('/', async (req, res) => {
    try {
        const [users] = await db.query(`
            SELECT 
                users.id,
                users.username,
                users.avatar_url,
                users.bio,
                users.location,
                users.favorite_game,
                users.website,

                COUNT(DISTINCT posts.id) AS post_count,
                COALESCE(SUM(posts.likes), 0) AS total_likes,
                COALESCE(SUM(posts.views), 0) AS total_views,

                COALESCE(follower_counts.total_followers, 0) AS follower_count,
                COALESCE(following_counts.total_following, 0) AS following_count

            FROM users

            LEFT JOIN posts ON posts.user_id = users.id

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

            GROUP BY 
                users.id,
                users.username,
                users.avatar_url,
                users.bio,
                users.location,
                users.favorite_game,
                users.website,
                follower_counts.total_followers,
                following_counts.total_following

            ORDER BY post_count DESC, users.username ASC
        `);

        const formattedUsers = users.map(user => ({
            ...user,
            posts_count: user.post_count,
            followers_count: user.follower_count,
            following_count: user.following_count,
            points: (Number(user.post_count) * 25) + (Number(user.total_likes) * 5)
        }));

        const totalMembers = formattedUsers.length;
        const totalPosts = formattedUsers.reduce(
            (sum, user) => sum + Number(user.post_count || 0),
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
            user: req.session.user || null,
            currentUser: req.session.user || null
        });

    } catch (err) {
        console.error(err);
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

        const redirectUrl = req.body.redirect || `/users/${followingId}`;

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
        console.error(err);
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

                COALESCE(follower_counts.total_followers, 0) AS follower_count,
                COALESCE(following_counts.total_following, 0) AS following_count,

                EXISTS (
                    SELECT 1
                    FROM user_follows
                    WHERE user_follows.follower_id = ?
                    AND user_follows.following_id = users.id
                ) AS is_following

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
            [currentUserId, userId]
        );

        if (!users.length) {
            return res.status(404).send('User not found');
        }

        const profileUser = users[0];

        profileUser.followers_count = profileUser.follower_count;
        profileUser.isFollowing = Boolean(profileUser.is_following);
        profileUser.isOwnProfile = currentUserId === Number(profileUser.id);

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

        const postCount = Number(statsRows[0].postCount || 0);
        const totalLikes = Number(statsRows[0].totalLikes || 0);
        const totalViews = Number(statsRows[0].totalViews || 0);

        const stats = {
            postCount,
            totalLikes,
            totalViews,
            followerCount: Number(profileUser.follower_count || 0),
            followingCount: Number(profileUser.following_count || 0),
            points: (postCount * 25) + (totalLikes * 5)
        };

        res.render('user-profile', {
            profileUser,
            posts,
            stats,
            user: req.session.user || null,
            currentUser: req.session.user || null
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;