const express = require('express');
const db = require('../services/db');
const bcrypt = require('bcrypt');

const router = express.Router();

router.get('/login', (req, res) => {
    res.render('login');
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const [users] = await db.query('SELECT * FROM users WHERE username=?', [username]);

    if (users.length === 0) return res.send("User not found");

    const user = users[0];

    const match = await bcrypt.compare(password, user.password);

    if (!match) return res.send("Wrong password");

    req.session.user = user;
    res.redirect('/posts');
});

router.get('/register', (req, res) => {
    res.render('register');
});

router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    await db.query(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, hashed]
    );

    res.redirect('/login');
});

module.exports = router;