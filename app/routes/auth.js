const express = require('express');
const db = require('../services/db');
const bcrypt = require('bcrypt');

const router = express.Router();

// ======================
// LOGIN PAGE
// ======================
router.get('/login', (req, res) => {
    res.render('login');
});

// ======================
// LOGIN
// ======================
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const [users] = await db.query(
            'SELECT * FROM users WHERE username=?',
            [username]
        );

        if (users.length === 0) {
            return res.send("❌ User not found");
        }

        const user = users[0];

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.send("❌ Wrong password");
        }

        // ✅ SAVE SESSION
        req.session.user = {
            id: user.id,
            username: user.username
        };

        // ✅ REDIRECT TO PROFILE (IMPORTANT)
        res.redirect('/profile');

    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

// ======================
// REGISTER PAGE
// ======================
router.get('/register', (req, res) => {
    res.render('register');
});

// ======================
// REGISTER
// ======================
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // ✅ CHECK IF USER EXISTS
        const [existing] = await db.query(
            'SELECT * FROM users WHERE username=? OR email=?',
            [username, email]
        );

        if (existing.length > 0) {
            return res.send("❌ User already exists");
        }

        const hashed = await bcrypt.hash(password, 10);

        await db.query(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashed]
        );

        res.redirect('/login');

    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

// ======================
// LOGOUT
// ======================
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

module.exports = router;