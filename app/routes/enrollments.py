from flask import Blueprint, request, jsonify
from app.models.enrollment import EnrollmentModel
from app.database import get_db_connection
from app.middleware.auth import get_current_user, require_auth

bp = Blueprint('enrollments', __name__)

@bp.route('/check/<uuid:course_id>', methods=['GET'])
@require_auth
def check_enrollment(course_id):
    """Check if current user is enrolled in a specific course"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
            
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, enrolled_at FROM enrollments 
                WHERE student_id = %s AND course_id = %s
            """, (str(user['id']), str(course_id)))
            
            enrollment = cur.fetchone()
            
        conn.close()
        
        if enrollment:
            return jsonify({
                'enrolled': True,
                'enrollment_id': str(enrollment[0]),
                'enrolled_at': enrollment[1].isoformat() if enrollment[1] else None
            })
        else:
            return jsonify({'enrolled': False})
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
@require_auth
def create_enrollment():
    """Create enrollment - students can enroll themselves in courses"""
    data = request.json
    current_user = get_current_user()
    
    if not current_user:
        return jsonify({'error': 'Authentication required'}), 401
    
    # Students can only enroll themselves
    if current_user['role'] != 'student':
        return jsonify({'error': 'Only students can enroll in courses'}), 403
    
    if not data.get('course_id'):
        return jsonify({'error': 'course_id is required'}), 400
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Check if course exists and is published
            cur.execute("SELECT id, is_published FROM courses WHERE id = %s", (data['course_id'],))
            course = cur.fetchone()
            
            if not course:
                return jsonify({'error': 'Course not found'}), 404
            
            if not course[1]:  # is_published
                return jsonify({'error': 'Course is not published'}), 403
            
            # Check if already enrolled
            cur.execute("SELECT id FROM enrollments WHERE student_id = %s AND course_id = %s", 
                       (current_user['id'], data['course_id']))
            existing = cur.fetchone()
            
            if existing:
                return jsonify({'error': 'Already enrolled in this course'}), 409
            
            # Create enrollment
            cur.execute("""
                INSERT INTO enrollments (student_id, course_id)
                VALUES (%s, %s) RETURNING id
            """, (current_user['id'], data['course_id']))
            enrollment_id = cur.fetchone()[0]
            conn.commit()
            
        return jsonify({'id': str(enrollment_id), 'message': 'Successfully enrolled in course'}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

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
