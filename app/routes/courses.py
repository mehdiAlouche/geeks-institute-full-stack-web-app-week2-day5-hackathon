from flask import Blueprint, request, jsonify
from app.models.course import CourseModel
from app.database import get_db

bp = Blueprint('courses', __name__)

@bp.route('/', methods=['GET'])
def get_courses():
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("SELECT id, teacher_id, title, description, is_published FROM courses")
        courses = cur.fetchall()
    course_list = [dict(zip(['id', 'teacher_id', 'title', 'description', 'is_published'], course)) for course in courses]
    return jsonify(course_list)

@bp.route('/<uuid:course_id>', methods=['GET'])
def get_course(course_id):
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("SELECT id, teacher_id, title, description, is_published FROM courses WHERE id = %s", (str(course_id),))
        course = cur.fetchone()
    if course:
        return jsonify(dict(zip(['id', 'teacher_id', 'title', 'description', 'is_published'], course)))
    return jsonify({'error': 'Course not found'}), 404

@bp.route('/', methods=['POST'])
def create_course():
    data = request.json
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO courses (teacher_id, title, description, is_published)
            VALUES (%s, %s, %s, %s) RETURNING id
        """, (data['teacher_id'], data['title'], data['description'], data['is_published']))
        course_id = cur.fetchone()[0]
        conn.commit()
    return jsonify({'id': course_id}), 201

@bp.route('/<uuid:course_id>', methods=['PUT'])
def update_course(course_id):
    data = request.json
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE courses SET teacher_id=%s, title=%s, description=%s, is_published=%s
            WHERE id=%s RETURNING id
        """, (data['teacher_id'], data['title'], data['description'], data['is_published'], str(course_id)))
        updated = cur.fetchone()
        conn.commit()
    if updated:
        return jsonify({'id': updated[0]})
    return jsonify({'error': 'Course not found'}), 404

@bp.route('/<uuid:course_id>', methods=['DELETE'])
def delete_course(course_id):
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM courses WHERE id = %s RETURNING id", (str(course_id),))
        deleted = cur.fetchone()
        conn.commit()
    if deleted:
        return jsonify({'id': deleted[0]})
    return jsonify({'error': 'Course not found'}), 404
