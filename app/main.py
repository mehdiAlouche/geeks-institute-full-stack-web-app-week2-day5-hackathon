"""
Flask crud backend
"""

from flask import Flask, jsonify, render_template, request, redirect, url_for
from app.routes.users import bp as users_bp
from app.routes.courses import bp as courses_bp
from app.routes.files import bp as files_bp
from app.routes.enrollments import bp as enrollments_bp
from app.routes.comments import bp as comments_bp
from app.routes.notifications import bp as notifications_bp
from app.routes.auth import bp as auth_bp, verify_token

app = Flask(__name__)

def require_teacher_or_admin():
    """Decorator to require teacher or admin role for frontend routes"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            token = request.cookies.get('auth_token') or request.headers.get('Authorization', '').replace('Bearer ', '')
            if not token:
                return redirect('/login')
            
            try:
                user = verify_token(token)
                if user['role'] not in ['teacher', 'admin']:
                    return redirect('/courses')  # Redirect to courses page if not authorized
                return func(*args, **kwargs)
            except:
                return redirect('/login')
        wrapper.__name__ = func.__name__
        return wrapper
    return decorator

def require_admin():
    """Decorator to require admin role for frontend routes"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            token = request.cookies.get('auth_token') or request.headers.get('Authorization', '').replace('Bearer ', '')
            if not token:
                return redirect('/login')
            
            try:
                user = verify_token(token)
                if user['role'] != 'admin':
                    return redirect('/courses')  # Redirect to courses page if not admin
                return func(*args, **kwargs)
            except:
                return redirect('/login')
        wrapper.__name__ = func.__name__
        return wrapper
    return decorator

# API Routes
app.register_blueprint(users_bp, url_prefix="/api/users")
app.register_blueprint(courses_bp, url_prefix="/api/courses")
app.register_blueprint(files_bp, url_prefix="/api/files")
app.register_blueprint(enrollments_bp, url_prefix="/api/enrollments")
app.register_blueprint(comments_bp, url_prefix="/api/comments")
app.register_blueprint(notifications_bp, url_prefix="/api/notifications")
app.register_blueprint(auth_bp, url_prefix="/api/auth")

# Frontend Routes
@app.route('/')
def landing():
    """Landing page"""
    return render_template('landing.html')

@app.route('/dashboard')
def dashboard():
    """Main dashboard page for teachers and admins"""
    return render_template('dashboard.html')

@app.route('/login')
def login():
    """Login page"""
    return render_template('auth/login.html')

@app.route('/register')
def register():
    """Registration page"""
    return render_template('auth/register.html')

@app.route('/courses')
def courses():
    """Courses listing page"""
    return render_template('courses/index.html')

@app.route('/courses/<course_id>')
def course_detail(course_id):
    """Course detail page"""
    return render_template('courses/detail.html', course={'id': course_id})

@app.route('/courses/create')
@require_teacher_or_admin()
def create_course():
    """Create course page - only for teachers and admins"""
    return render_template('courses/create.html')

@app.route('/users')
@require_admin()
def users():
    """Users listing page - only for admins"""
    return render_template('users/index.html')

@app.route('/users/<user_id>')
def user_detail(user_id):
    """User detail page"""
    return render_template('users/detail.html', user={'id': user_id})

@app.route('/users/create')
def create_user():
    """Create user page"""
    return render_template('users/create.html')

@app.route('/student-dashboard')
def student_dashboard():
    """Student-specific dashboard"""
    return render_template('student_dashboard.html')

@app.errorhandler(404)
def not_found(e):
    """ Handle 404 errors """
    return render_template('404.html'), 404

@app.errorhandler(Exception)
def handle_exception(e):
    """ Handle Exception errors """
    return jsonify({"error": "An error occurred", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5001)
