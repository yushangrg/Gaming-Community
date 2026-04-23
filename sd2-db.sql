DROP DATABASE IF EXISTS sprint3;
CREATE DATABASE sprint3;
USE sprint3;

-- =========================
-- USERS
-- =========================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    points INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- POSTS
-- =========================
CREATE TABLE posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    user_id INT NOT NULL,
    image VARCHAR(255) DEFAULT NULL,
    rating INT DEFAULT 0,
    likes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =========================
-- COMMENTS
-- =========================
CREATE TABLE comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =========================
-- TAGS
-- =========================
CREATE TABLE tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- =========================
-- POST_TAGS
-- =========================
CREATE TABLE post_tags (
    post_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (post_id, tag_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- =========================
-- SAMPLE USERS
-- =========================
INSERT INTO users (username, email, password, points) VALUES
('alice', 'alice@example.com', 'password123', 120),
('bob', 'bob@example.com', 'password123', 90),
('charlie', 'charlie@example.com', 'password123', 75);

-- =========================
-- SAMPLE POSTS
-- =========================
INSERT INTO posts (title, content, category, user_id, image, rating, likes) VALUES
('Best RPG Games in 2025', 'Here are some amazing RPG games you should try this year.', 'RPG', 1, NULL, 5, 12),
('Top FPS Tips for Beginners', 'Practice aim, learn maps, and communicate with your team.', 'FPS', 2, NULL, 4, 8),
('Gaming Tips for New Players', 'A few useful tips for players who are just starting out.', 'Tips', 3, NULL, 4, 7),
('Best Mobile Games Right Now', 'These mobile games are fun and easy to get into.', 'Mobile', 1, NULL, 4, 6),
('Indie Games You Should Not Miss', 'A list of creative indie titles worth checking out.', 'Indie', 2, NULL, 5, 10);

-- =========================
-- SAMPLE COMMENTS
-- =========================
INSERT INTO comments (post_id, user_id, comment) VALUES
(1, 2, 'Great list, I love RPG games.'),
(1, 3, 'I will definitely try some of these.'),
(2, 1, 'These FPS tips are really helpful.'),
(3, 2, 'Good advice for beginners.'),
(4, 3, 'Mobile gaming is getting better every year.'),
(5, 1, 'Indie games deserve more attention.');

-- =========================
-- SAMPLE TAGS
-- =========================
INSERT INTO tags (name) VALUES
('RPG'),
('FPS'),
('Tips'),
('Mobile'),
('Indie');

-- =========================
-- SAMPLE POST_TAGS
-- =========================
INSERT INTO post_tags (post_id, tag_id) VALUES
(1, 1),
(2, 2),
(2, 3),
(3, 3),
(4, 4),
(5, 5);