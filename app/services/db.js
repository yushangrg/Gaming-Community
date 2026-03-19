const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'db',
    user: 'root',
    password: 'root',
    database: 'sprint3'
});

module.exports = pool.promise();