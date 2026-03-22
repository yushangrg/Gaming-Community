const express = require('express');
const db = require('../services/db');

const router = express.Router();

// ======================
// USERS LIST
// ======================
router.get('/', async (req, res) => {
    try {
        const [users] = await db.query(`
            SELECT users.id, users.username,
                   COUNT(posts.id) AS post_count
            FROM users
            LEFT JOIN posts ON users.id = posts.user_id
            GROUP BY users.id
        `);

        res.render('users', { users });

    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});


// ======================
// LOGGED-IN PROFILE (/profile)
// ======================
router.get('/profile', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.render('profile', { user: null, posts: [] });
        }

        const userId = req.session.user.id;

        const [users] = await db.query(
            'SELECT * FROM users WHERE id=?',
            [userId]
        );

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


// ======================
// PUBLIC PROFILE (/users/:id)
// ======================
router.get('/:id', async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT * FROM users WHERE id=?',
            [req.params.id]
        );

        if (!users.length) {
            return res.status(404).send("User not found");
        }

        const [posts] = await db.query(
            'SELECT * FROM posts WHERE user_id=?',
            [req.params.id]
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


module.exports = router;