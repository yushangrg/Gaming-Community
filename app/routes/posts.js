const express = require('express');
const db = require('../services/db');

const router = express.Router();

function buildCommentTree(comments) {
    const map = {};
    const roots = [];

    comments.forEach(comment => {
        comment.replies = [];
        map[comment.id] = comment;
    });

    comments.forEach(comment => {
        if (comment.parent_id) {
            if (map[comment.parent_id]) {
                map[comment.parent_id].replies.push(comment);
            }
        } else {
            roots.push(comment);
        }
    });

    return roots;
}

// ======================
// LISTING PAGE
// ======================
router.get('/', async (req, res) => {
    try {
        const category = req.query.category || '';
        const tag = req.query.tag || '';
        const search = req.query.search || '';
        const userFilter = req.query.user || '';
        const currentUserId = req.session.user ? req.session.user.id : 0;

        let query = `
            SELECT DISTINCT
                posts.*,
                users.username,

                COALESCE(comment_counts.total_comments, 0) AS comment_count,
                COALESCE(comment_counts.total_comments, 0) AS comments_count,
                COALESCE(comment_counts.total_comments, 0) AS total_comments,

                COALESCE(save_counts.total_saves, 0) AS save_count,

                EXISTS (
                    SELECT 1
                    FROM saved_posts
                    WHERE saved_posts.post_id = posts.id
                    AND saved_posts.user_id = ?
                ) AS is_saved

            FROM posts
            JOIN users ON posts.user_id = users.id

            LEFT JOIN (
                SELECT post_id, COUNT(*) AS total_comments
                FROM comments
                GROUP BY post_id
            ) AS comment_counts ON comment_counts.post_id = posts.id

            LEFT JOIN (
                SELECT post_id, COUNT(*) AS total_saves
                FROM saved_posts
                GROUP BY post_id
            ) AS save_counts ON save_counts.post_id = posts.id

            LEFT JOIN post_tags ON posts.id = post_tags.post_id
            LEFT JOIN tags ON post_tags.tag_id = tags.id

            WHERE 1=1
        `;

        const params = [currentUserId];

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

        if (userFilter) {
            if (!isNaN(userFilter)) {
                query += ' AND posts.user_id = ?';
                params.push(userFilter);
            } else {
                query += ' AND users.username = ?';
                params.push(userFilter);
            }
        }

        query += ' ORDER BY posts.id DESC';

        const [posts] = await db.query(query, params);

        res.render('index', {
            posts,
            category,
            tag,
            search,
            selectedUser: userFilter,
            user: req.session.user || null,
            currentUser: req.session.user || null
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// ======================
// SAVED POSTS PAGE
// IMPORTANT: keep this before router.get('/:id')
// ======================
router.get('/saved', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const [posts] = await db.query(
            `
            SELECT 
                posts.*,
                users.username,

                COALESCE(comment_counts.total_comments, 0) AS comment_count,
                COALESCE(comment_counts.total_comments, 0) AS comments_count,
                COALESCE(comment_counts.total_comments, 0) AS total_comments,

                COALESCE(save_counts.total_saves, 0) AS save_count,
                1 AS is_saved

            FROM saved_posts
            JOIN posts ON saved_posts.post_id = posts.id
            JOIN users ON posts.user_id = users.id

            LEFT JOIN (
                SELECT post_id, COUNT(*) AS total_comments
                FROM comments
                GROUP BY post_id
            ) AS comment_counts ON comment_counts.post_id = posts.id

            LEFT JOIN (
                SELECT post_id, COUNT(*) AS total_saves
                FROM saved_posts
                GROUP BY post_id
            ) AS save_counts ON save_counts.post_id = posts.id

            WHERE saved_posts.user_id = ?
            ORDER BY saved_posts.created_at DESC
            `,
            [req.session.user.id]
        );

        res.render('index', {
            posts,
            category: '',
            tag: '',
            search: '',
            selectedUser: '',
            pageTitle: 'Saved Posts',
            user: req.session.user || null,
            currentUser: req.session.user || null
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
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

        res.render('create-post', {
            user: req.session.user || null,
            currentUser: req.session.user || null
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
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

        const { title, content, category, image, video } = req.body;
        const user_id = req.session.user.id;

        if (!title || !content || !category) {
            return res.redirect('/posts/create');
        }

        await db.query(
            `
            INSERT INTO posts 
            (title, content, category, image, video, user_id, likes, rating, views) 
            VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0)
            `,
            [
                title.trim(),
                content.trim(),
                category.trim(),
                image || null,
                video || null,
                user_id
            ]
        );

        res.redirect('/posts');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// ======================
// SAVE / UNSAVE A POST
// ======================
router.post('/:id/save', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const postId = req.params.id;
        const userId = req.session.user.id;

        const [postRows] = await db.query(
            'SELECT id FROM posts WHERE id = ?',
            [postId]
        );

        if (!postRows.length) {
            return res.status(404).send('Post not found');
        }

        const [existing] = await db.query(
            `
            SELECT user_id, post_id
            FROM saved_posts
            WHERE user_id = ? AND post_id = ?
            `,
            [userId, postId]
        );

        if (existing.length) {
            await db.query(
                `
                DELETE FROM saved_posts
                WHERE user_id = ? AND post_id = ?
                `,
                [userId, postId]
            );
        } else {
            await db.query(
                `
                INSERT INTO saved_posts
                (user_id, post_id)
                VALUES (?, ?)
                `,
                [userId, postId]
            );
        }

        res.redirect(`/posts/${postId}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// ======================
// FOLLOW / UNFOLLOW POST CREATOR
// ======================
router.post('/:id/follow-creator', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const postId = req.params.id;
        const followerId = req.session.user.id;

        const [postRows] = await db.query(
            'SELECT id, user_id FROM posts WHERE id = ?',
            [postId]
        );

        if (!postRows.length) {
            return res.status(404).send('Post not found');
        }

        const followingId = postRows[0].user_id;

        if (Number(followerId) === Number(followingId)) {
            return res.redirect(`/posts/${postId}`);
        }

        const [existing] = await db.query(
            `
            SELECT follower_id, following_id
            FROM user_follows
            WHERE follower_id = ? AND following_id = ?
            `,
            [followerId, followingId]
        );

        if (existing.length) {
            await db.query(
                `
                DELETE FROM user_follows
                WHERE follower_id = ? AND following_id = ?
                `,
                [followerId, followingId]
            );
        } else {
            await db.query(
                `
                INSERT INTO user_follows
                (follower_id, following_id)
                VALUES (?, ?)
                `,
                [followerId, followingId]
            );
        }

        res.redirect(`/posts/${postId}`);
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
        const postId = req.params.id;
        const currentUserId = req.session.user ? req.session.user.id : 0;

        await db.query(
            'UPDATE posts SET views = COALESCE(views, 0) + 1 WHERE id = ?',
            [postId]
        );

        const [posts] = await db.query(
            `
            SELECT 
                posts.*,
                users.username,

                COALESCE(comment_counts.total_comments, 0) AS comment_count,
                COALESCE(comment_counts.total_comments, 0) AS comments_count,
                COALESCE(comment_counts.total_comments, 0) AS total_comments,

                COALESCE(save_counts.total_saves, 0) AS save_count,

                EXISTS (
                    SELECT 1
                    FROM saved_posts
                    WHERE saved_posts.post_id = posts.id
                    AND saved_posts.user_id = ?
                ) AS is_saved,

                COALESCE(follower_counts.total_followers, 0) AS follower_count,

                EXISTS (
                    SELECT 1
                    FROM user_follows
                    WHERE user_follows.follower_id = ?
                    AND user_follows.following_id = posts.user_id
                ) AS is_following

            FROM posts
            JOIN users ON posts.user_id = users.id

            LEFT JOIN (
                SELECT post_id, COUNT(*) AS total_comments
                FROM comments
                GROUP BY post_id
            ) AS comment_counts ON comment_counts.post_id = posts.id

            LEFT JOIN (
                SELECT post_id, COUNT(*) AS total_saves
                FROM saved_posts
                GROUP BY post_id
            ) AS save_counts ON save_counts.post_id = posts.id

            LEFT JOIN (
                SELECT following_id, COUNT(*) AS total_followers
                FROM user_follows
                GROUP BY following_id
            ) AS follower_counts ON follower_counts.following_id = posts.user_id

            WHERE posts.id = ?
            `,
            [currentUserId, currentUserId, postId]
        );

        if (!posts.length) {
            return res.status(404).send('Post not found');
        }

        const post = posts[0];

        const [tags] = await db.query(
            `
            SELECT tags.name
            FROM tags
            JOIN post_tags ON tags.id = post_tags.tag_id
            WHERE post_tags.post_id = ?
            `,
            [postId]
        );

        const [rawComments] = await db.query(
            `
            SELECT 
                comments.id,
                comments.post_id,
                comments.user_id,
                comments.parent_id,
                comments.comment AS content,
                comments.created_at,
                users.username
            FROM comments
            JOIN users ON comments.user_id = users.id
            WHERE comments.post_id = ?
            ORDER BY comments.created_at ASC
            `,
            [postId]
        );

        const commentIds = rawComments.map(comment => comment.id);

        let reactionRows = [];
        let reportedRows = [];

        if (commentIds.length > 0) {
            [reactionRows] = await db.query(
                `
                SELECT comment_id, reaction, COUNT(*) AS total
                FROM comment_reactions
                WHERE comment_id IN (?)
                GROUP BY comment_id, reaction
                `,
                [commentIds]
            );

            if (req.session.user) {
                [reportedRows] = await db.query(
                    `
                    SELECT comment_id
                    FROM comment_reports
                    WHERE user_id = ? AND comment_id IN (?)
                    `,
                    [req.session.user.id, commentIds]
                );
            }
        }

        const reactionMap = {};

        reactionRows.forEach(row => {
            if (!reactionMap[row.comment_id]) {
                reactionMap[row.comment_id] = {
                    like: 0,
                    helpful: 0,
                    funny: 0
                };
            }

            reactionMap[row.comment_id][row.reaction] = row.total;
        });

        const reportedSet = new Set(reportedRows.map(row => row.comment_id));

        const comments = rawComments.map(comment => ({
            ...comment,
            reactionCounts: reactionMap[comment.id] || {
                like: 0,
                helpful: 0,
                funny: 0
            },
            hasReported: reportedSet.has(comment.id),
            isOwner: req.session.user && req.session.user.id === comment.user_id
        }));

        const commentTree = buildCommentTree(comments);

        res.render('post', {
            post,
            tags,
            comments: commentTree,
            user: req.session.user || null,
            currentUser: req.session.user || null
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
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
            'UPDATE posts SET likes = COALESCE(likes, 0) + 1 WHERE id = ?',
            [req.params.id]
        );

        res.redirect('/posts/' + req.params.id);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
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
        res.status(500).send('Server Error');
    }
});

// ======================
// ADD TOP-LEVEL COMMENT
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
            `
            INSERT INTO comments 
            (post_id, user_id, comment, parent_id) 
            VALUES (?, ?, ?, NULL)
            `,
            [post_id, user_id, content.trim()]
        );

        res.redirect('/posts/' + post_id);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// ======================
// REPLY TO COMMENT
// ======================
router.post('/:id/comment/:commentId/reply', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const content = req.body.content;
        const user_id = req.session.user.id;
        const post_id = req.params.id;
        const parent_id = req.params.commentId;

        if (!content || !content.trim()) {
            return res.redirect('/posts/' + post_id);
        }

        const [parentRows] = await db.query(
            'SELECT id, post_id FROM comments WHERE id = ?',
            [parent_id]
        );

        if (!parentRows.length || Number(parentRows[0].post_id) !== Number(post_id)) {
            return res.status(404).send('Parent comment not found');
        }

        await db.query(
            `
            INSERT INTO comments 
            (post_id, user_id, comment, parent_id) 
            VALUES (?, ?, ?, ?)
            `,
            [post_id, user_id, content.trim(), parent_id]
        );

        res.redirect(`/posts/${post_id}#comment-${parent_id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// ======================
// REACT TO COMMENT
// ======================
router.post('/comments/:commentId/react', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const commentId = req.params.commentId;
        const userId = req.session.user.id;
        const reaction = req.body.reaction;

        if (!['like', 'helpful', 'funny'].includes(reaction)) {
            return res.status(400).send('Invalid reaction');
        }

        const [commentRows] = await db.query(
            'SELECT post_id FROM comments WHERE id = ?',
            [commentId]
        );

        if (!commentRows.length) {
            return res.status(404).send('Comment not found');
        }

        const postId = commentRows[0].post_id;

        const [existing] = await db.query(
            `
            SELECT *
            FROM comment_reactions
            WHERE comment_id = ? AND user_id = ?
            `,
            [commentId, userId]
        );

        if (existing.length) {
            if (existing[0].reaction === reaction) {
                await db.query(
                    `
                    DELETE FROM comment_reactions
                    WHERE comment_id = ? AND user_id = ?
                    `,
                    [commentId, userId]
                );
            } else {
                await db.query(
                    `
                    UPDATE comment_reactions
                    SET reaction = ?
                    WHERE comment_id = ? AND user_id = ?
                    `,
                    [reaction, commentId, userId]
                );
            }
        } else {
            await db.query(
                `
                INSERT INTO comment_reactions
                (comment_id, user_id, reaction)
                VALUES (?, ?, ?)
                `,
                [commentId, userId, reaction]
            );
        }

        res.redirect(`/posts/${postId}#comment-${commentId}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// ======================
// REPORT COMMENT
// ======================
router.post('/comments/:commentId/report', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const commentId = req.params.commentId;
        const userId = req.session.user.id;

        const [commentRows] = await db.query(
            'SELECT post_id FROM comments WHERE id = ?',
            [commentId]
        );

        if (!commentRows.length) {
            return res.status(404).send('Comment not found');
        }

        const postId = commentRows[0].post_id;

        await db.query(
            `
            INSERT IGNORE INTO comment_reports
            (comment_id, user_id, reason)
            VALUES (?, ?, ?)
            `,
            [commentId, userId, 'Inappropriate']
        );

        res.redirect(`/posts/${postId}#comment-${commentId}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// ======================
// DELETE OWN COMMENT
// ======================
router.post('/comments/:commentId/delete', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const commentId = req.params.commentId;
        const userId = req.session.user.id;

        const [commentRows] = await db.query(
            'SELECT id, user_id, post_id FROM comments WHERE id = ?',
            [commentId]
        );

        if (!commentRows.length) {
            return res.status(404).send('Comment not found');
        }

        const comment = commentRows[0];

        if (Number(comment.user_id) !== Number(userId)) {
            return res.status(403).send('You can only delete your own comments');
        }

        await db.query(
            'DELETE FROM comments WHERE id = ?',
            [commentId]
        );

        res.redirect(`/posts/${comment.post_id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;