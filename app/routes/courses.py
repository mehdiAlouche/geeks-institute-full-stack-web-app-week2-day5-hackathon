from flask import Blueprint, request, jsonify
from app.models.course import CourseModel
from app.database import get_db_connection
from app.middleware.auth import require_auth, require_teacher_or_admin, require_admin, get_current_user

bp = Blueprint('courses', __name__)

@bp.route('/', methods=['GET'])
@require_auth
def get_courses():
    """Get courses - all users can view published courses"""
    conn = get_db_connection()
    current_user = get_current_user()
    
    try:
        with conn.cursor() as cur:
            if current_user['role'] in ['teacher', 'admin']:
                # Teachers and admins can see all courses (published and draft)
                cur.execute("""
                    SELECT c.id, c.teacher_id, c.title, c.description, c.is_published, c.created_at,
                           u.name as teacher_name,
                           COUNT(e.id) as enrolled_count
                    FROM courses c
                    LEFT JOIN users u ON c.teacher_id = u.id
                    LEFT JOIN enrollments e ON c.id = e.course_id
                    GROUP BY c.id, c.teacher_id, c.title, c.description, c.is_published, c.created_at, u.name
                    ORDER BY c.created_at DESC
                """)
            else:
                # Students can only see published courses
                cur.execute("""
                    SELECT c.id, c.teacher_id, c.title, c.description, c.is_published, c.created_at,
                           u.name as teacher_name,
                           COUNT(e.id) as enrolled_count
                    FROM courses c
                    LEFT JOIN users u ON c.teacher_id = u.id
                    LEFT JOIN enrollments e ON c.id = e.course_id
                    WHERE c.is_published = true
                    GROUP BY c.id, c.teacher_id, c.title, c.description, c.is_published, c.created_at, u.name
                    ORDER BY c.created_at DESC
                """)
            
            courses = cur.fetchall()
            
        course_list = []
        for course in courses:
            course_dict = {
                'id': str(course[0]),
                'teacher_id': str(course[1]),
                'title': course[2],
                'description': course[3],
                'is_published': course[4],
                'created_at': course[5].isoformat() if course[5] else None,
                'teacher_name': course[6],
                'enrolled_count': course[7] or 0
            }
            course_list.append(course_dict)
            
        return jsonify({'courses': course_list})
        
    finally:
        conn.close()

@bp.route('/<uuid:course_id>', methods=['GET'])
@require_auth
def get_course(course_id):
    """Get specific course - all users can view if published or if they're the teacher/admin"""
    conn = get_db_connection()
    current_user = get_current_user()
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT c.id, c.teacher_id, c.title, c.description, c.is_published, c.created_at,
                       u.name as teacher_name,
                       COUNT(e.id) as enrolled_count
                FROM courses c
                LEFT JOIN users u ON c.teacher_id = u.id
                LEFT JOIN enrollments e ON c.id = e.course_id
                WHERE c.id = %s
                GROUP BY c.id, c.teacher_id, c.title, c.description, c.is_published, c.created_at, u.name
            """, (str(course_id),))
            
            course = cur.fetchone()
            
        if not course:
            return jsonify({'error': 'Course not found'}), 404
            
        # Check if user can view this course
        is_published = course[4]
        teacher_id = str(course[1])
        
        # Allow if published OR if user is teacher/admin
        if not is_published and current_user['role'] not in ['teacher', 'admin']:
            return jsonify({'error': 'Course not available'}), 403
            
        # Allow if user is the teacher of this course or admin
        if not is_published and teacher_id != current_user['id'] and current_user['role'] != 'admin':
            return jsonify({'error': 'Course not available'}), 403
            
        course_dict = {
            'id': str(course[0]),
            'teacher_id': str(course[1]),
            'title': course[2],
            'description': course[3],
            'is_published': course[4],
            'created_at': course[5].isoformat() if course[5] else None,
            'teacher_name': course[6],
            'enrolled_count': course[7] or 0
        }
        
        return jsonify(course_dict)
        
    finally:
        conn.close()

@bp.route('/', methods=['POST'])
@require_teacher_or_admin
def create_course():
    """Create course - only teachers and admins"""
    data = request.json
    current_user = get_current_user()
    conn = get_db_connection()
    
    try:
        with conn.cursor() as cur:
            # If user is teacher, they can only create courses for themselves
            # If user is admin, they can create courses for any teacher
            teacher_id = data.get('teacher_id')
            if current_user['role'] == 'teacher':
                teacher_id = current_user['id']
            elif current_user['role'] == 'admin' and not teacher_id:
                return jsonify({'error': 'teacher_id is required for admin'}), 400
                
            cur.execute("""
                INSERT INTO courses (teacher_id, title, description, is_published)
                VALUES (%s, %s, %s, %s) RETURNING id
            """, (teacher_id, data['title'], data['description'], data.get('is_published', False)))
            
            course_id = cur.fetchone()[0]
            conn.commit()
            
        return jsonify({'id': str(course_id), 'message': 'Course created successfully'}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@bp.route('/<uuid:course_id>', methods=['PUT'])
@require_teacher_or_admin
def update_course(course_id):
    """Update course - only teachers and admins"""
    data = request.json
    current_user = get_current_user()
    conn = get_db_connection()
    
    try:
        with conn.cursor() as cur:
            # Check if course exists and user has permission
            cur.execute("SELECT teacher_id FROM courses WHERE id = %s", (str(course_id),))
            course = cur.fetchone()
            
            if not course:
                return jsonify({'error': 'Course not found'}), 404
                
            # Teachers can only update their own courses, admins can update any
            if current_user['role'] == 'teacher' and str(course[0]) != current_user['id']:
                return jsonify({'error': 'Permission denied'}), 403
                
            # Update course
            teacher_id = data.get('teacher_id', str(course[0]))
            if current_user['role'] == 'teacher':
                teacher_id = current_user['id']
                
            cur.execute("""
                UPDATE courses SET teacher_id=%s, title=%s, description=%s, is_published=%s
                WHERE id=%s RETURNING id
            """, (teacher_id, data['title'], data['description'], data.get('is_published', False), str(course_id)))
            
            updated = cur.fetchone()
            conn.commit()
            
        if updated:
            return jsonify({'id': str(updated[0]), 'message': 'Course updated successfully'})
        return jsonify({'error': 'Course not found'}), 404
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@bp.route('/<uuid:course_id>', methods=['DELETE'])
@require_teacher_or_admin
def delete_course(course_id):
    """Delete course - only teachers and admins"""
    current_user = get_current_user()
    conn = get_db_connection()
    
    try:
        with conn.cursor() as cur:
            # Check if course exists and user has permission
            cur.execute("SELECT teacher_id FROM courses WHERE id = %s", (str(course_id),))
            course = cur.fetchone()
            
            if not course:
                return jsonify({'error': 'Course not found'}), 404
                
            # Teachers can only delete their own courses, admins can delete any
            if current_user['role'] == 'teacher' and str(course[0]) != current_user['id']:
                return jsonify({'error': 'Permission denied'}), 403
                
            cur.execute("DELETE FROM courses WHERE id = %s RETURNING id", (str(course_id),))
            deleted = cur.fetchone()
            conn.commit()
            
        if deleted:
            return jsonify({'id': str(deleted[0]), 'message': 'Course deleted successfully'})
        return jsonify({'error': 'Course not found'}), 404
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
