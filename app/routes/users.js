const express = require('express');
const db = require('../services/db');

const router = express.Router();

// ======================
// USERS LIST (IMPROVED)
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
// PROFILE PAGE (IMPROVED)
// ======================
router.get('/profile', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
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

    res.render('profile', { user: users[0], posts });
});

module.exports = router;