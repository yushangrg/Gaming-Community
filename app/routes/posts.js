const express = require('express');
const db = require('../services/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// make sure upload folder exists
const uploadDir = path.join(__dirname, '../../static/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// multer config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '-');
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'), false);
    }
};

const upload = multer({
    storage,
    fileFilter
});

// ======================
// LISTING PAGE
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
router.post('/create', upload.single('image'), async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const { title, content, category, video } = req.body;
        const user_id = req.session.user.id;

        let imagePath = null;
        if (req.file) {
            imagePath = '/uploads/' + req.file.filename;
        }

        await db.query(
            `INSERT INTO posts (title, content, category, image, video, user_id, likes, rating)
             VALUES (?, ?, ?, ?, ?, ?, 0, 0)`,
            [title, content, category, imagePath, video || null, user_id]
        );

        res.redirect('/posts');
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

// ======================
// EDIT POST PAGE
// ======================
router.get('/:id/edit', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const [posts] = await db.query(
            'SELECT * FROM posts WHERE id = ?',
            [req.params.id]
        );

        if (!posts.length) {
            return res.status(404).send('Post not found');
        }

        const post = posts[0];

        if (post.user_id !== req.session.user.id) {
            return res.status(403).send('You can only edit your own posts');
        }

        res.render('edit-post', { post });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// ======================
// EDIT POST SUBMIT
// ======================
router.post('/:id/edit', upload.single('image'), async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const [posts] = await db.query(
            'SELECT * FROM posts WHERE id = ?',
            [req.params.id]
        );

        if (!posts.length) {
            return res.status(404).send('Post not found');
        }

        const oldPost = posts[0];

        if (oldPost.user_id !== req.session.user.id) {
            return res.status(403).send('You can only edit your own posts');
        }

        const { title, content, category, video } = req.body;

        let imagePath = oldPost.image;
        if (req.file) {
            imagePath = '/uploads/' + req.file.filename;
        }

        await db.query(
            `UPDATE posts
             SET title = ?, content = ?, category = ?, image = ?, video = ?
             WHERE id = ?`,
            [title, content, category, imagePath, video || null, req.params.id]
        );

        res.redirect('/posts/' + req.params.id);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// ======================
// DELETE POST
// ======================
router.post('/:id/delete', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const [posts] = await db.query(
            'SELECT * FROM posts WHERE id = ?',
            [req.params.id]
        );

        if (!posts.length) {
            return res.status(404).send('Post not found');
        }

        const post = posts[0];

        if (post.user_id !== req.session.user.id) {
            return res.status(403).send('You can only delete your own posts');
        }

        await db.query('DELETE FROM posts WHERE id = ?', [req.params.id]);

        res.redirect('/posts');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
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

// ======================
// RATE A POST
// ======================
router.post('/:id/rate', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const rating = Number(req.body.rating);

        if (!rating || rating < 1 || rating > 5) {
            return res.redirect('/posts/' + req.params.id);
        }

        await db.query(
            'UPDATE posts SET rating = ? WHERE id = ?',
            [rating, req.params.id]
        );

        res.redirect('/posts/' + req.params.id);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

// ======================
// COMMENT ON A POST
// ======================
router.post('/:id/comment', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const content = req.body.content;
        const user_id = req.session.user.id;
        const post_id = req.params.id;

        if (!content || !content.trim()) {
            return res.redirect('/posts/' + post_id);
        }

        await db.query(
            'INSERT INTO comments (post_id, user_id, comment) VALUES (?, ?, ?)',
            [post_id, user_id, content]
        );

        res.redirect('/posts/' + post_id);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

module.exports = router;