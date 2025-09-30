
# 🎓 School Management System (Flask + PostgreSQL)

A full-stack web application built with **Flask**, **PostgreSQL**, and **Bootstrap**, using **uv** for dependency management.  
This project demonstrates CRUD operations, relational database design, analytics with Chart.js, and clean Flask project structure.

---

## 🚀 Live Demo

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Watch%20Video-blue?style=for-the-badge)](https://www.loom.com/share/ddc202403860441994a3abfe2ce87617?sid=68e846d4-29a2-406d-b7af-787c79b4d4b1)

**📹 [Watch the Demo Video](https://www.loom.com/share/ddc202403860441994a3abfe2ce87617?sid=68e846d4-29a2-406d-b7af-787c79b4d4b1)**

---

## 📌 Features
- 👩‍🏫 User roles: **teacher**, **student**, **admin**
- 📚 Courses: create, update, publish/unpublish with categories and levels
- 📂 Course files: videos, PDFs, documents (ordered)
- 📝 Enrollments: students can enroll in courses
- 💬 Comments: threaded replies and likes
- 🔔 Notifications: simple alert system
- 🔍 Advanced course filtering by category, level, and status
- 🎨 Modern UI with Web Components and Tailwind CSS

# 🎓 School Management System (Flask + PostgreSQL)

A full-stack web application for managing courses, users, enrollments, files, comments, and notifications. Built with **Flask**, **PostgreSQL**, and **Bootstrap**, using **uv** for dependency management. The project demonstrates CRUD operations, relational database design, analytics with Chart.js, and a modular Flask structure.

---

## 📌 Features

- 👩‍� User roles: **teacher**, **student**, **admin**
- 📚 Courses: create, update, publish/unpublish
- 📂 Course files: videos, PDFs, documents (ordered)
- 📝 Enrollments: students can enroll in courses
- 💬 Comments: threaded replies and likes
- � Comment likes
- 🔔 Notifications: alert system for users
- 📊 Dashboard: statistics and analytics with Chart.js
- 🎨 Mobile-friendly UI with Bootstrap
- 🔐 JWT Authentication with configurable token expiration

---

## ⚙️ Tech Stack

- **Backend:** Flask (Python)
- **Database:** PostgreSQL (UUID-based schema)
- **Frontend:** HTML, CSS, JavaScript, Bootstrap 5, Tailwind CSS, Jinja2
- **Analytics:** Chart.js
- **Dependency Manager:** [uv](https://github.com/astral-sh/uv)

---

## 🚀 Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/mehdiAlouche/geeks-institute-full-stack-web-app-week2-day5-hackathon.git
cd geeks-institute-full-stack-web-app-week2-day5-hackathon.git
````

### 2. Create Virtual Environment with uv
```bash
uv venv
```
Activate it:
```bash
source .venv/bin/activate   # macOS/Linux
.venv\Scripts\activate      # Windows
```

### 3. Install Dependencies
```bash
uv pip install -r requirements.txt
```

### 4. Setup PostgreSQL Database
Create the database:
```sql
CREATE DATABASE sm_db;
```
Apply schema + seed data:
```bash
psql -U postgres -d school_db -f seed/index.sql
```

### 5. Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE_MINUTES=60

# Database Configuration
POSTGRES_DB=YOUR_POSTGRES_DB
POSTGRES_USER=YOUR_POSTGRES_USER  
POSTGRES_PASSWORD=YOUR_POSTGRES_PASSWORD
POSTGRES_HOST=YOUR_POSTGRES_HOST
POSTGRES_PORT=YOUR_POSTGRES_PORT
```

**Important:** Change the `JWT_SECRET` to a secure random string in production!

### 6. Run the Application

```bash
python -m app.main
```
Visit in browser: [http://localhost:5000](http://localhost:5000)

---

## 📂 Project Structure

```
geeks-institute-full-stack-web-app-week2-day5-hackathon/
├── app/
│   ├── main.py                # Flask app entry point
│   ├── database/              # DB connection helpers
│   ├── middleware/            # Auth and other middleware
│   ├── models/                # Data models (user, course, etc.)
│   ├── routes/                # API routes (auth, users, courses, etc.)
│   ├── static/
│   │   └── components/        # JS web components (navbar, course, user, etc.)
│   └── templates/             # Jinja2 HTML templates
├── resources/                 # Docs, cheatsheets, web component demos
├── seed/                      # SQL schema and seed data
├── test/                      # REST API test files
├── requirements.txt           # Python dependencies
├── pyproject.toml             # Project metadata
├── uv.lock                    # uv dependency lock file
└── README.md                  # Project documentation
```

---

## 🗄️ Database Schema

See `seed/index.sql` for full schema and seed data. Models use UUIDs for primary keys and enforce referential integrity with `ON DELETE CASCADE`.

---

## 🧩 API Endpoints

RESTful endpoints are organized by resource:

- `/api/auth` — Authentication (login, register)
- `/api/users` — User management
- `/api/courses` — Course CRUD
- `/api/files` — Course file management
- `/api/enrollments` — Enrollments
- `/api/comments` — Comments and likes
- `/api/notifications` — User notifications

See the `test/` folder for example REST requests.

---

## 🖥️ Frontend

- Jinja2 templates for server-rendered pages
- Web components for UI (see `app/static/components/`)
- Responsive design with Bootstrap 5 & Tailwind CSS

---

## 🔧 Development Notes

- Uses **UUIDs** for primary keys
- Foreign keys use `ON DELETE CASCADE` to prevent orphaned rows
- Direct SQL queries via **psycopg2** (no ORM)
- Templates use **Bootstrap 5, Tailwind CSS** for responsive UI
- Inline code comments for clarity

---

## ✅ Roadmap (Optional Features)

- 🔍 Advanced search & filtering
- 📺 Video progress tracking (resume where left off)
- 🔐 User authentication with Flask-Login
- 🔔 Real-time notifications via WebSockets
- ☁️ File uploads

---

## 📜 License

This project is for educational purposes.
Feel free to fork and extend for your own use.
* Templates use **Bootstrap 5, Tailwind CSS** for responsive UI
* Code includes **inline comments** for clarity

---

## ✅ Roadmap (Optional Features)

* 🔍 Advanced search & filtering
* 📺 Video progress tracking (resume where left off)
* 🔐 User authentication with Flask-Login
* 🔔 Real-time notifications via WebSockets
* ☁️ File uploads

---

## 📜 License

This project is for educational purposes.
Feel free to fork and extend for your own use.
