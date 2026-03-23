# 🎮 Gaming Platform – Sprint 3

## 📌 Overview

This project is a full-stack **Gaming Community Platform** developed as part of Sprint 3 for the Software Engineering module.

The application allows users to browse gaming-related posts, view user profiles, and interact with content through likes, comments, and tags.

The system uses a **dynamic web architecture**, where data is retrieved from a MySQL database and rendered using server-side templates.

---

## 🏗️ System Architecture

The application follows a structured approach:

* **Routes** → Handle HTTP requests
* **Services** → Manage business logic and database queries
* **Views (Pug)** → Render dynamic UI

This separation improves maintainability and scalability.

---

## 🚀 Features Implemented

### 🔐 Authentication

* User login system using sessions
* Password hashing using bcrypt

### 📝 Posts

* View all posts (Listing page)
* View individual post details (Detail page)
* Posts include ratings, likes, tags, and comments

### 👥 Users

* Users listing page
* User profile page displaying associated posts

### 🏷️ Tags / Categories

* Many-to-many relationship between posts and tags
* Tags displayed on post detail page

### 💬 Interaction

* Users can like posts
* Users can view and add comments

---

## 🗂️ Project Structure

```
PG-SD2/
│
├── app/
│   ├── routes/
│   ├── services/
│   ├── views/
│   └── app.js
│
├── static/
│   ├── css/
│   └── js/
│
├── sd2-db.sql
├── Dockerfile
├── docker-compose.yml
└── package.json
```

---

## 🐬 Database Design

The system uses a relational MySQL database with the following tables:

* `users`
* `posts`
* `tags`
* `post_tags` (junction table)
* `comments`

### Relationships:

* One-to-many: Users → Posts
* One-to-many: Posts → Comments
* Many-to-many: Posts ↔ Tags

This structure ensures data consistency and avoids duplication.

---

## 🐳 Running the Application (Docker)

### 1. Build and start containers

```
docker-compose up --build
```

### 2. Access the application

```
http://localhost:3000
```

---

## 🔑 Demo Login

```
Username: player1
Password: (use seeded password)
```

---

## 🛠️ Technologies Used

* Node.js
* Express.js
* MySQL
* Pug
* Docker
* bcrypt
* express-session

---

## 📈 Sprint 3 Deliverables

✔ Posts listing page
✔ Post detail page
✔ Users list page
✔ User profile page
✔ Tags/categories system
✔ MySQL database integration
✔ Authentication system
✔ Dockerised environment

---

## 🔄 Development Workflow

* GitHub used for version control
* Kanban board used for task tracking
* Tasks divided based on team roles
* Frequent commits ensured progress tracking

---

## 🎯 Future Improvements

* Create, edit, delete posts (CRUD)
* Advanced search and filtering
* Role-based authentication
* Improved UI/UX
* Image upload functionality

---

## 👨‍💻 Contributors

* **Yushan Gurung** – Full-stack development (backend, frontend, integration)
* **Jordan Thomas** – Frontend design and UI
* **Laxman Kathayat** – Database and documentation
* **Anil Kumar Chauhan** – ERD diagram

---

## 📄 License

This project is developed for educational purposes as part of coursework.
