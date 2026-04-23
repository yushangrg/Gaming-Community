const mysql = require('mysql2');

const pool = mysql.createPool({
    host: process.env.DB_CONTAINER || process.env.MYSQL_HOST || 'db',
    port: process.env.DB_PORT || 3306,
    user: process.env.MYSQL_USER || 'admin',
    password: process.env.MYSQL_PASS || 'password',
    database: process.env.MYSQL_DATABASE || 'sprint3',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool.promise();