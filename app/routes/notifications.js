const express = require('express');
const db = require('../services/db');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const userId = req.session.user.id;

        const [notifications] = await db.query(
            `
            SELECT
                id,
                user_id,
                type,
                message,
                link,
                is_read,
                created_at
            FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 80
            `,
            [userId]
        );

        await db.query(
            `
            UPDATE notifications
            SET is_read = TRUE
            WHERE user_id = ? AND is_read = FALSE
            `,
            [userId]
        );

        res.locals.notificationCount = 0;

        res.render('notifications', {
            notifications,
            user: req.session.user || null,
            currentUser: req.session.user || null
        });

    } catch (err) {
        console.error('NOTIFICATIONS PAGE ERROR:', err);
        res.status(500).send('Server Error');
    }
});

router.post('/read-all', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        await db.query(
            `
            UPDATE notifications
            SET is_read = TRUE
            WHERE user_id = ?
            `,
            [req.session.user.id]
        );

        res.redirect('/notifications');

    } catch (err) {
        console.error('MARK NOTIFICATIONS READ ERROR:', err);
        res.status(500).send('Server Error');
    }
});

router.post('/:id/delete', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        await db.query(
            `
            DELETE FROM notifications
            WHERE id = ? AND user_id = ?
            `,
            [req.params.id, req.session.user.id]
        );

        res.redirect('/notifications');

    } catch (err) {
        console.error('DELETE NOTIFICATION ERROR:', err);
        res.status(500).send('Server Error');
    }
});

router.post('/clear', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        await db.query(
            `
            DELETE FROM notifications
            WHERE user_id = ?
            `,
            [req.session.user.id]
        );

        res.redirect('/notifications');

    } catch (err) {
        console.error('CLEAR NOTIFICATIONS ERROR:', err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;