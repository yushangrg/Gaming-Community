CREATE DATABASE IF NOT EXISTS sprint3;
USE sprint3;

CREATE TABLE users (
 id INT AUTO_INCREMENT PRIMARY KEY,
 username VARCHAR(50),
 email VARCHAR(100),
 password VARCHAR(255)
);

CREATE TABLE posts (
 id INT AUTO_INCREMENT PRIMARY KEY,
 title VARCHAR(255),
 content TEXT,
 user_id INT
);

CREATE TABLE tags (
 id INT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(50)
);

CREATE TABLE post_tags (
 post_id INT,
 tag_id INT
);

ALTER TABLE posts 
ADD COLUMN image VARCHAR(255),
ADD COLUMN rating INT DEFAULT 0,
ADD COLUMN likes INT DEFAULT 0;

USE sprint3;

-- =========================
-- USERS (keep or replace)
-- =========================
DELETE FROM users;

INSERT INTO users (id, username, email, password) VALUES
(1, 'player1', 'player1@email.com', '$2b$10$KbQi4vQ8zQ8vFQnKz3U2fO6vX6YyS2Zz2ZK9Q7k9Q7YwW1F5YwZyG'),
(2, 'gamerX', 'gamer@email.com', '$2b$10$KbQi4vQ8zQ8vFQnKz3U2fO6vX6YyS2Zz2ZK9Q7k9Q7YwW1F5YwZyG'),
(3, 'proPlayer', 'pro@email.com', '$2b$10$KbQi4vQ8zQ8vFQnKz3U2fO6vX6YyS2Zz2ZK9Q7k9Q7YwW1F5YwZyG');

-- =========================
-- POSTS (WITH IMAGES + RATING + LIKES)
-- =========================
DELETE FROM posts;

INSERT INTO posts (id, title, content, user_id, image, rating, likes) VALUES
(1, 'Best FPS Games 2026', 'Call of Duty and Apex Legends dominate FPS gaming.', 1, 'fps.jpg', 5, 10),
(2, 'Top RPG Games', 'Elden Ring and Witcher 3 are top RPG experiences.', 2, 'rpg.jpg', 4, 7),
(3, 'Gaming Setup Tips', 'Upgrade your GPU and use a mechanical keyboard.', 1, 'setup.jpg', 3, 5),
(4, 'Mobile Gaming Trends', 'Mobile esports are rapidly growing worldwide.', 3, 'mobile.jpg', 4, 8),
(5, 'Best Indie Games', 'Hades and Hollow Knight are amazing indie titles.', 2, 'indie.jpg', 5, 12);

-- =========================
-- TAGS
-- =========================
DELETE FROM tags;

INSERT INTO tags (id, name) VALUES
(1, 'FPS'),
(2, 'RPG'),
(3, 'Tips'),
(4, 'Mobile'),
(5, 'Indie');

-- =========================
-- POST TAGS (LINK)
-- =========================
DELETE FROM post_tags;

INSERT INTO post_tags (post_id, tag_id) VALUES
(1, 1), (1, 3),
(2, 2), (2, 3),
(3, 3),
(4, 4),
(5, 5), (5, 2);

-- =========================
-- COMMENTS TABLE (CREATE IF NOT EXISTS)
-- =========================
CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content TEXT,
    post_id INT,
    username VARCHAR(50),
    FOREIGN KEY (post_id) REFERENCES posts(id)
);

-- =========================
-- COMMENTS DATA
-- =========================
DELETE FROM comments;

INSERT INTO comments (content, post_id, username) VALUES
('🔥 This FPS list is amazing!', 1, 'player1'),
('I love RPG games so much!', 2, 'gamerX'),
('These setup tips helped me a lot!', 3, 'proPlayer'),
('Mobile gaming is the future!', 4, 'player1'),
('Indie games are underrated!', 5, 'gamerX');