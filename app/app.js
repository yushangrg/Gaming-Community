const express = require('express');
const session = require('express-session');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const aboutRoutes = require('./routes/about'); // ✅ NEW

const app = express();

// VIEW ENGINE
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// MIDDLEWARE
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../static')));

app.use(session({
    secret: 'gaming-secret',
    resave: false,
    saveUninitialized: true
}));

// ROUTES
app.use('/', authRoutes);
app.use('/users', userRoutes);
app.use('/posts', postRoutes);
app.use('/about', aboutRoutes); 

// HOME
app.get('/', (req, res) => {
    res.redirect('/posts');
});

// IMPORTANT FOR DOCKER
app.listen(3000, '0.0.0.0', () => {
    console.log("🎮 Gaming Platform running at http://localhost:3000");
});