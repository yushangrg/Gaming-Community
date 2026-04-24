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
('bob', 'bob@example.com', 'password123', 95),
('charlie', 'charlie@example.com', 'password123', 80);

-- =========================
-- SAMPLE POSTS
-- =========================
INSERT INTO posts (title, content, category, user_id, image, rating, likes) VALUES
('Elden Ring Review', 'Elden Ring offers a massive open world, challenging bosses, and deep RPG systems that reward exploration.', 'RPG', 1, 'https://placehold.co/400x200/1a1a2e/ffffff?text=Elden+Ring', 5, 18),
('Valorant Aim Tips', 'Improve in Valorant by mastering crosshair placement, recoil control, and communication with teammates.', 'FPS', 2, 'https://placehold.co/400x200/1a1a2e/ffffff?text=Valorant', 4, 11),
('Genshin Impact Beginner Guide', 'Learn how to build your team, spend resources wisely, and progress smoothly in Genshin Impact.', 'Mobile', 3, 'https://placehold.co/400x200/1a1a2e/ffffff?text=Genshin+Impact', 4, 9),
('Hades is One of the Best Indie Games', 'Hades combines fast action, beautiful art, and great storytelling to create one of the top indie experiences.', 'Indie', 1, 'https://placehold.co/400x200/1a1a2e/ffffff?text=Hades', 5, 14),
('Minecraft Survival Tips', 'These Minecraft survival tips will help you gather resources quickly, stay safe at night, and build a strong base.', 'Tips', 2, 'https://placehold.co/400x200/1a1a2e/ffffff?text=Minecraft', 5, 12),
('Cyberpunk 2077 Update Review', 'Cyberpunk 2077 has improved significantly with updates and now feels much more polished and enjoyable.', 'RPG', 3, 'https://placehold.co/400x200/1a1a2e/ffffff?text=Cyberpunk+2077', 4, 10),
('Call of Duty Warzone Loadout Guide', 'Choosing the right loadout in Warzone can greatly improve your range, recoil control, and mobility.', 'FPS', 1, 'https://placehold.co/400x200/1a1a2e/ffffff?text=Warzone', 4, 8),
('Clash Royale Deck Tips', 'A strong Clash Royale deck needs balance, good elixir control, and answers for both ground and air units.', 'Mobile', 2, 'https://placehold.co/400x200/1a1a2e/ffffff?text=Clash+Royale', 4, 7),
('Stardew Valley Still Feels Fresh', 'Stardew Valley remains one of the most relaxing and rewarding indie games thanks to its freedom and charm.', 'Indie', 3, 'https://placehold.co/400x200/1a1a2e/ffffff?text=Stardew+Valley', 5, 13),
('Fortnite Building Tips for Beginners', 'Start with simple wall and ramp builds, then improve your edits and reaction time in Fortnite.', 'Tips', 1, 'https://placehold.co/400x200/1a1a2e/ffffff?text=Fortnite', 4, 9);

-- =========================
-- SAMPLE COMMENTS
-- =========================
INSERT INTO comments (post_id, user_id, comment) VALUES
(1, 2, 'Elden Ring is one of the best RPGs I have ever played.'),
(1, 3, 'The boss fights in Elden Ring are unforgettable.'),
(2, 1, 'These Valorant aim tips are really useful in ranked games.'),
(3, 2, 'This guide helped me understand Genshin much better.'),
(4, 3, 'Hades deserves all the praise it gets.'),
(5, 1, 'Minecraft is always more fun with good survival strategies.'),
(6, 2, 'Cyberpunk feels much better after the updates.'),
(7, 3, 'Warzone loadouts really make a difference in matches.'),
(8, 1, 'Deck building is the hardest part of Clash Royale for me.'),
(9, 2, 'Stardew Valley is such a relaxing game to play.'),
(10, 3, 'Fortnite building takes practice but this is a good start.');

-- =========================
-- SAMPLE TAGS
-- =========================
INSERT INTO tags (name) VALUES
('RPG'),
('Open World'),
('Fantasy'),
('FPS'),
('Shooter'),
('Strategy'),
('Mobile'),
('Guide'),
('Indie'),
('Roguelike'),
('Sandbox'),
('Survival'),
('Battle Royale'),
('Farming'),
('Action');

-- =========================
-- SAMPLE POST_TAGS
-- =========================
INSERT INTO post_tags (post_id, tag_id) VALUES
-- Elden Ring
(1, 1),
(1, 2),
(1, 3),

-- Valorant
(2, 4),
(2, 5),
(2, 8),

-- Genshin Impact
(3, 1),
(3, 2),
(3, 7),

-- Hades
(4, 9),
(4, 10),
(4, 15),

-- Minecraft
(5, 11),
(5, 12),
(5, 8),

-- Cyberpunk 2077
(6, 1),
(6, 2),
(6, 15),

-- Warzone
(7, 4),
(7, 5),
(7, 13),

-- Clash Royale
(8, 7),
(8, 6),
(8, 8),

-- Stardew Valley
(9, 9),
(9, 14),
(9, 12),

-- Fortnite
(10, 13),
(10, 4),
(10, 8);