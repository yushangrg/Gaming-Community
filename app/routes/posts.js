const express = require('express');
const db = require('../services/db');

const router = express.Router();

// ======================
// LISTING PAGE (with category filter)
// ======================
router.get('/', async (req, res) => {
    try {
        const category = req.query.category;

        let query = `
            SELECT posts.*, users.username 
            FROM posts 
            JOIN users ON posts.user_id = users.id
        `;

        let params = [];

        // ✅ If category is selected
        if (category) {
            query += ' WHERE posts.category = ?';
            params.push(category);
        }

        const [posts] = await db.query(query, params);

        res.render('index', { posts, category });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});


// ======================
// DETAIL PAGE
// ======================
router.get('/:id', async (req, res) => {
    try {
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

        const [comments] = await db.query(
            'SELECT * FROM comments WHERE post_id=?',
            [req.params.id]
        );

        res.render('post', { 
            post: posts[0], 
            tags, 
            comments 
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});
// ======================
// LIKE A POST
// ======================
router.get('/:id/like', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }
        await db.query(
            'UPDATE posts SET likes = likes + 1 WHERE id = ?',
            [req.params.id]
        );
        res.redirect('/posts/' + req.params.id);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});
// ======================
// CREATE POST PAGE
// ======================
router.get('/create', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }
        res.render('create-post');
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

// ======================
// CREATE POST SUBMIT
// ======================
router.post('/create', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }
        const { title, content, category } = req.body;
        const user_id = req.session.user.id;

        await db.query(
            'INSERT INTO posts (title, content, category, user_id, likes, rating) VALUES (?, ?, ?, ?, 0, 0)',
            [title, content, category, user_id]
        );

        res.redirect('/posts');
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

module.exports = router;