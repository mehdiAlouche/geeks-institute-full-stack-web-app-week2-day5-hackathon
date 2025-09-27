from flask import Blueprint, request, jsonify
from app.models.enrollment import EnrollmentModel
from app.database import get_db

bp = Blueprint('enrollments', __name__)

@bp.route('/', methods=['GET'])
def get_enrollments():
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("SELECT id, student_id, course_id, enrolled_at FROM enrollments")
        enrollments = cur.fetchall()
    enrollment_list = [dict(zip(['id', 'student_id', 'course_id', 'enrolled_at'], enrollment)) for enrollment in enrollments]
    return jsonify(enrollment_list)

@bp.route('/<uuid:enrollment_id>', methods=['GET'])
def get_enrollment(enrollment_id):
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("SELECT id, student_id, course_id, enrolled_at FROM enrollments WHERE id = %s", (str(enrollment_id),))
        enrollment = cur.fetchone()
    if enrollment:
        return jsonify(dict(zip(['id', 'student_id', 'course_id', 'enrolled_at'], enrollment)))
    return jsonify({'error': 'Enrollment not found'}), 404

@bp.route('/', methods=['POST'])
def create_enrollment():
    data = request.json
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO enrollments (student_id, course_id)
            VALUES (%s, %s) RETURNING id
        """, (data['student_id'], data['course_id']))
        enrollment_id = cur.fetchone()[0]
        conn.commit()
    return jsonify({'id': enrollment_id}), 201

@bp.route('/<uuid:enrollment_id>', methods=['PUT'])
def update_enrollment(enrollment_id):
    data = request.json
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE enrollments SET student_id=%s, course_id=%s
            WHERE id=%s RETURNING id
        """, (data['student_id'], data['course_id'], str(enrollment_id)))
        updated = cur.fetchone()
        conn.commit()
    if updated:
        return jsonify({'id': updated[0]})
    return jsonify({'error': 'Enrollment not found'}), 404

@bp.route('/<uuid:enrollment_id>', methods=['DELETE'])
def delete_enrollment(enrollment_id):
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM enrollments WHERE id = %s RETURNING id", (str(enrollment_id),))
        deleted = cur.fetchone()
        conn.commit()
    if deleted:
        return jsonify({'id': deleted[0]})
    return jsonify({'error': 'Enrollment not found'}), 404
