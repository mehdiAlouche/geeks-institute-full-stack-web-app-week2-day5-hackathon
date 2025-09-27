"""
Flask crud backend
"""

from flask import Flask, jsonify
from app.routes.users import bp as users_bp
from app.routes.courses import bp as courses_bp
from app.routes.files import bp as files_bp
from app.routes.enrollments import bp as enrollments_bp
from app.routes.comments import bp as comments_bp
from app.routes.notifications import bp as notifications_bp
from app.routes.auth import bp as auth_bp

app = Flask(__name__)

app.register_blueprint(users_bp, url_prefix="/api/users")
app.register_blueprint(courses_bp, url_prefix="/api/courses")
app.register_blueprint(files_bp, url_prefix="/api/files")
app.register_blueprint(enrollments_bp, url_prefix="/api/enrollments")
app.register_blueprint(comments_bp, url_prefix="/api/comments")
app.register_blueprint(notifications_bp, url_prefix="/api/notifications")
app.register_blueprint(auth_bp, url_prefix="/api/auth")

@app.errorhandler(404)
def not_found(e):
    """ Handle 404 errors """
    return jsonify({"error": "Not found", "message": str(e)}), 404

@app.errorhandler(Exception)
def handle_exception(e):
    """ Handle Exception errors """
    return jsonify({"error": "An error occurred", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5001)
