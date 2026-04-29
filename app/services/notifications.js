const db = require('./db');

async function createNotification({ userId, actorId = null, type, message, link = null }) {
    try {
        if (!userId || !type || !message) {
            return;
        }

        // Do not notify users about their own actions
        if (actorId && Number(actorId) === Number(userId)) {
            return;
        }

        await db.query(
            `
            INSERT INTO notifications
            (user_id, type, message, link, is_read)
            VALUES (?, ?, ?, ?, FALSE)
            `,
            [userId, type, message, link]
        );
    } catch (err) {
        console.error('CREATE NOTIFICATION ERROR:', err);
    }
}

async function getUnreadNotificationCount(userId) {
    try {
        if (!userId) {
            return 0;
        }

        const [rows] = await db.query(
            `
            SELECT COUNT(*) AS unread_count
            FROM notifications
            WHERE user_id = ? AND is_read = FALSE
            `,
            [userId]
        );

        return Number(rows[0].unread_count || 0);
    } catch (err) {
        console.error('GET UNREAD NOTIFICATION COUNT ERROR:', err);
        return 0;
    }
}

module.exports = {
    createNotification,
    getUnreadNotificationCount
};