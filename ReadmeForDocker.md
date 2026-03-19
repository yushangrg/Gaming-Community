# 🎮 Gaming Platform – Sprint 3

## 📌 Overview

This project is a full-stack **Gaming Platform web application** developed for Sprint 3.
It allows users to register, log in, view posts, explore users, and interact with tagged gaming content.

The application is built using:

* **Node.js & Express** (Backend)
* **Pug** (Templating engine)
* **MySQL** (Database)
* **Docker** (Development environment)

---

## 🚀 Features Implemented

### 🔐 Authentication

* User registration with hashed passwords (bcrypt)
* User login system with sessions

### 📝 Posts

* View all posts (Listing page)
* View individual post details (Detail page)
* Posts linked to users

### 👥 Users

* Users listing page
* Individual user profile page showing their posts

### 🏷️ Tags / Categories

* Posts are associated with tags
* Tags displayed on post detail page

### ℹ️ Additional Page

* About Us page describing the platform and technologies used

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

## 🐬 Database

The application uses a MySQL database with the following tables:

* `users`
* `posts`
* `tags`
* `post_tags`

Sample data is included in:

```
sd2-db.sql
```

---

## 🐳 Running the Application (Docker)

### 1. Build and start containers

```
docker-compose up --build
```

### 2. Access the application

```
http://localhost:3000/login
```

---

## 🔑 Demo Login

Use the following credentials:

```
Username: alex
Password: pass123
```

---

## 🛠️ Technologies Used

* Node.js
* Express.js
* MySQL
* Pug
* Docker
* bcrypt (authentication)
* express-session

---

## 📈 Sprint 3 Deliverables

* ✔ Listing page (Posts)
* ✔ Detail page (Post view)
* ✔ Users list page
* ✔ User profile page
* ✔ Tags/categories system
* ✔ MySQL database integration
* ✔ Dockerised development environment

---

## 🔄 Development Workflow

* Frequent commits with descriptive messages
* Modular route structure
* Separation of concerns (routes, views, services)

---

## 🎯 Future Improvements

* Create / edit / delete posts
* Search and filtering by tags
* User authentication middleware
* Improved UI/UX design
* Image uploads for posts

---

## 👨‍💻 Author

Developed as part of Sprint 3 coursework.

---

## 📄 License

This project is for educational purposes.
