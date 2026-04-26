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
                COUNT(posts.id) AS post_count,
                COALESCE(SUM(posts.likes), 0) AS total_likes,
                COALESCE(SUM(posts.views), 0) AS total_views
            FROM users
            LEFT JOIN posts ON posts.user_id = users.id
            GROUP BY 
                users.id,
                users.username,
                users.avatar_url,
                users.bio,
                users.location,
                users.favorite_game,
                users.website
            ORDER BY post_count DESC, users.username ASC
        `);

        const formattedUsers = users.map(user => ({
            ...user,
            posts_count: user.post_count,
            points: (Number(user.post_count) * 25) + (Number(user.total_likes) * 5)
        }));

        const totalMembers = formattedUsers.length;
        const totalPosts = formattedUsers.reduce((sum, user) => sum + Number(user.post_count || 0), 0);
        const averagePosts = totalMembers ? (totalPosts / totalMembers).toFixed(1) : '0.0';

        res.render('users', {
            users: formattedUsers,
            stats: {
                totalMembers,
                totalPosts,
                averagePosts
            }
        });

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
        const userId = req.params.id;

        const [users] = await db.query(
            `
            SELECT 
                id,
                username,
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
            return res.status(404).send('User not found');
        }

        const profileUser = users[0];

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

        const postCount = Number(statsRows[0].postCount || 0);
        const totalLikes = Number(statsRows[0].totalLikes || 0);
        const totalViews = Number(statsRows[0].totalViews || 0);

        const stats = {
            postCount,
            totalLikes,
            totalViews,
            points: (postCount * 25) + (totalLikes * 5)
        };

        res.render('user-profile', {
            profileUser,
            posts,
            stats
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;