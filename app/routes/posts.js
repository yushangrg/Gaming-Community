const express = require('express');
const db = require('../services/db');

const router = express.Router();

// ======================
// LISTING PAGE (category + tag + search)
// ======================
router.get('/', async (req, res) => {
    try {
        const category = req.query.category || '';
        const tag = req.query.tag || '';
        const search = req.query.search || '';

        let query = `
            SELECT DISTINCT posts.*, users.username
            FROM posts
            JOIN users ON posts.user_id = users.id
            LEFT JOIN post_tags ON posts.id = post_tags.post_id
            LEFT JOIN tags ON post_tags.tag_id = tags.id
            WHERE 1=1
        `;

        const params = [];

        if (category) {
            query += ' AND posts.category = ?';
            params.push(category);
        }

        if (tag) {
            query += ' AND tags.name = ?';
            params.push(tag);
        }

        if (search) {
            query += ' AND (posts.title LIKE ? OR posts.content LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY posts.id DESC';

        const [posts] = await db.query(query, params);

        res.render('index', { posts, category, tag, search });
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

// ======================
// DETAIL PAGE
// ======================
router.get('/:id', async (req, res) => {
    try {
        const [posts] = await db.query(`
            SELECT posts.*, users.username
            FROM posts
            JOIN users ON posts.user_id = users.id
            WHERE posts.id = ?
        `, [req.params.id]);

        if (!posts.length) {
            return res.status(404).send("Post not found");
        }

        const [tags] = await db.query(`
            SELECT tags.name
            FROM tags
            JOIN post_tags ON tags.id = post_tags.tag_id
            WHERE post_tags.post_id = ?
        `, [req.params.id]);

        const [comments] = await db.query(`
            SELECT comments.comment AS content, users.username
            FROM comments
            JOIN users ON comments.user_id = users.id
            WHERE comments.post_id = ?
            ORDER BY comments.id DESC
        `, [req.params.id]);

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

module.exports = router;