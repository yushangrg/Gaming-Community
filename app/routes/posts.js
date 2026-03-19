const express = require('express');
const db = require('../services/db');

const router = express.Router();

// LISTING PAGE
router.get('/', async (req, res) => {
    const [posts] = await db.query(`
        SELECT posts.*, users.username 
        FROM posts 
        JOIN users ON posts.user_id = users.id
    `);

    res.render('index', { posts });
});

// DETAIL PAGE
router.get('/:id', async (req, res) => {
    const [posts] = await db.query(`
        SELECT posts.*, users.username 
        FROM posts 
        JOIN users ON posts.user_id = users.id
        WHERE posts.id=?
    `, [req.params.id]);

    const [tags] = await db.query(`
        SELECT tags.name FROM tags
        JOIN post_tags ON tags.id = post_tags.tag_id
        WHERE post_tags.post_id=?
    `, [req.params.id]);

    // ✅ NEW: COMMENTS
    const [comments] = await db.query(
        'SELECT * FROM comments WHERE post_id=?',
        [req.params.id]
    );

    res.render('post', { post: posts[0], tags, comments });
});

module.exports = router;