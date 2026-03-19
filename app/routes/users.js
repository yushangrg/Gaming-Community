const express = require('express');
const db = require('../services/db');

const router = express.Router();

// USERS LIST
router.get('/', async (req, res) => {
    const [users] = await db.query('SELECT * FROM users');
    res.render('users', { users });
});

// PROFILE PAGE
router.get('/:id', async (req, res) => {
    const [users] = await db.query('SELECT * FROM users WHERE id=?', [req.params.id]);
    const [posts] = await db.query('SELECT * FROM posts WHERE user_id=?', [req.params.id]);

    res.render('profile', { user: users[0], posts });
});

module.exports = router;