from flask import Blueprint, request, jsonify
from app.models.enrollment import EnrollmentModel
from app.database import get_db_connection
from app.middleware.auth import get_current_user

bp = Blueprint('enrollments', __name__)

@bp.route('/my-courses', methods=['GET'])
def get_my_courses():
    """Get current user's enrolled courses"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
            
        conn = get_db_connection()
        with conn.cursor() as cur:
            # Get enrolled courses with course details
            cur.execute("""
                SELECT 
                    c.id,
                    c.title,
                    c.description,
                    c.teacher_id,
                    c.is_published,
                    c.created_at,
                    u.name as teacher_name,
                    e.enrolled_at
                FROM enrollments e
                JOIN courses c ON e.course_id = c.id
                JOIN users u ON c.teacher_id = u.id
                WHERE e.student_id = %s
                ORDER BY e.enrolled_at DESC
            """, (str(user['id']),))
            
            courses = cur.fetchall()
            
            course_list = []
            for course in courses:
                course_data = {
                    'id': course[0],
                    'title': course[1],
                    'description': course[2],
                    'teacher_id': course[3],
                    'is_published': course[4],
                    'created_at': course[5].isoformat() if course[5] else None,
                    'teacher_name': course[6],
                    'enrolled_at': course[7].isoformat() if course[7] else None
                }
                course_list.append(course_data)
                
        conn.close()
        return jsonify(course_list)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/', methods=['GET'])
def get_enrollments():
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT id, student_id, course_id, enrolled_at FROM enrollments")
        enrollments = cur.fetchall()
    enrollment_list = [dict(zip(['id', 'student_id', 'course_id', 'enrolled_at'], enrollment)) for enrollment in enrollments]
    conn.close()
    return jsonify(enrollment_list)

@bp.route('/<uuid:enrollment_id>', methods=['GET'])
def get_enrollment(enrollment_id):
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT id, student_id, course_id, enrolled_at FROM enrollments WHERE id = %s", (str(enrollment_id),))
        enrollment = cur.fetchone()
    conn.close()
    if enrollment:
        return jsonify(dict(zip(['id', 'student_id', 'course_id', 'enrolled_at'], enrollment)))
    return jsonify({'error': 'Enrollment not found'}), 404

@bp.route('/', methods=['POST'])
def create_enrollment():
    data = request.json
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO enrollments (student_id, course_id)
            VALUES (%s, %s) RETURNING id
        """, (data['student_id'], data['course_id']))
        enrollment_id = cur.fetchone()[0]
        conn.commit()
    conn.close()
    return jsonify({'id': enrollment_id}), 201

@bp.route('/<uuid:enrollment_id>', methods=['PUT'])
def update_enrollment(enrollment_id):
    data = request.json
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE enrollments SET student_id=%s, course_id=%s
            WHERE id=%s RETURNING id
        """, (data['student_id'], data['course_id'], str(enrollment_id)))
        updated = cur.fetchone()
        conn.commit()
    conn.close()
    if updated:
        return jsonify({'id': updated[0]})
    return jsonify({'error': 'Enrollment not found'}), 404

@bp.route('/<uuid:enrollment_id>', methods=['DELETE'])
def delete_enrollment(enrollment_id):
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM enrollments WHERE id = %s RETURNING id", (str(enrollment_id),))
        deleted = cur.fetchone()
        conn.commit()
    conn.close()
    if deleted:
        return jsonify({'id': deleted[0]})
    return jsonify({'error': 'Enrollment not found'}), 404
