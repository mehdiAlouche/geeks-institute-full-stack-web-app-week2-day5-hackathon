
# 🎓 School Management System (Flask + PostgreSQL)

A full-stack web application built with **Flask**, **PostgreSQL**, and **Bootstrap**, using **uv** for dependency management.  
This project demonstrates CRUD operations, relational database design, analytics with Chart.js, and clean Flask project structure.

---

## 📌 Features
- 👩‍🏫 User roles: **teacher**, **student**, **admin**
- 📚 Courses: create, update, publish/unpublish
- 📂 Course files: videos, PDFs, documents (ordered)
- 📝 Enrollments: students can enroll in courses
- 💬 Comments: threaded replies and likes
- 🔔 Notifications: simple alert system
- 📊 Dashboard: statistics and analytics with Chart.js
- 🎨 Mobile-friendly UI with Bootstrap

---

## ⚙️ Tech Stack
- **Backend:** Flask (Python)
- **Database:** PostgreSQL (UUID-based schema)
- **Frontend:** HTML, CSS, JavaScript, Bootstrap 5
- **Analytics:** Chart.js
- **Dependency Manager:** [uv](https://github.com/astral-sh/uv)

---

## 🚀 Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/school-app.git
cd school-app
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

From `requirements.txt`:

```bash
uv pip install -r requirements.txt
```

Or install manually:

```bash
uv pip install flask psycopg2-binary werkzeug python-dotenv
```

### 4. Setup PostgreSQL Database

Create the database:

```sql
CREATE DATABASE school_db;
```

Apply schema + seed data:

```bash
psql -U postgres -d school_db -f database/seed/index.sql
```

### 5. Run the Application

```bash
python index.py
```

Visit in browser: [http://localhost:5000](http://localhost:5000)

---

## 📂 Project Structure

```
project/
├── index.py              # Main Flask application
├── models/
│   └── users.py          # Example user model queries
├── database/
│   ├── index.py          # Database connection helpers
│   └── seed/
│       └── index.sql     # Schema + seed data
├── templates/
│   ├── base.html         # Base template with Bootstrap
│   └── stats.html        # Dashboard page
├── requirements.txt      # Dependencies (for uv or pip)
└── README.md             # Setup instructions
```

---

## 🗄️ Database Schema

The application uses **UUIDs** as primary keys.
Here’s the simplified ERD:

```
Users (id, email, password_hash, name, role, created_at)
    ├──< Courses (id, teacher_id → Users.id, title, description, is_published, created_at)
    │       ├──< Course_Files (id, course_id → Courses.id, title, file_type, file_url, file_order, created_at)
    │       │       └──< Comments (id, file_id → Course_Files.id, user_id → Users.id, parent_id → Comments.id, comment, likes, created_at)
    │       │              └──< Comment_Likes (id, comment_id → Comments.id, user_id → Users.id)
    │
    └──< Enrollments (id, student_id → Users.id, course_id → Courses.id, enrolled_at)

Notifications (id, user_id → Users.id, title, message, is_read, created_at)
```

---

## 🔧 Development Notes

* Uses **UUIDs** for primary keys
* Foreign keys use `ON DELETE CASCADE` to prevent orphaned rows
* Queries written in **psycopg2** (no ORM) for full SQL control
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
