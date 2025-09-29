from flask import Blueprint, request, jsonify
from app.models.course import CourseModel
from app.database import get_db_connection
from app.middleware.auth import require_auth, require_teacher_or_admin, require_admin, get_current_user

bp = Blueprint('courses', __name__)

@bp.route('/', methods=['GET'])
@require_auth
def get_courses():
    """Get courses with pagination - all users can view published courses"""
    conn = get_db_connection()
    current_user = get_current_user()
    
    # Pagination parameters
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 6, type=int)
    search = request.args.get('search', '', type=str)
    
    try:
        with conn.cursor() as cur:
            # Base query conditions
            base_where = "WHERE c.is_published = true" if current_user['role'] == 'student' else ""
            search_condition = f"AND (c.title ILIKE %s OR c.description ILIKE %s)" if search else ""
            
            # Count total courses for pagination
            count_query = f"""
                SELECT COUNT(DISTINCT c.id)
                FROM courses c
                LEFT JOIN users u ON c.teacher_id = u.id
                {base_where}
                {search_condition}
            """
            
            if search:
                cur.execute(count_query, (f'%{search}%', f'%{search}%'))
            else:
                cur.execute(count_query)
            
            total_courses = cur.fetchone()[0]
            total_pages = (total_courses + per_page - 1) // per_page
            
            # Get paginated courses
            offset = (page - 1) * per_page
            
            courses_query = f"""
                SELECT c.id, c.teacher_id, c.title, c.description, c.video_url, c.is_published, c.created_at,
                       u.name as teacher_name,
                       COUNT(e.id) as enrolled_count
                FROM courses c
                LEFT JOIN users u ON c.teacher_id = u.id
                LEFT JOIN enrollments e ON c.id = e.course_id
                {base_where}
                {search_condition}
                GROUP BY c.id, c.teacher_id, c.title, c.description, c.video_url, c.is_published, c.created_at, u.name
                ORDER BY c.created_at DESC
                LIMIT %s OFFSET %s
            """
            
            if search:
                cur.execute(courses_query, (f'%{search}%', f'%{search}%', per_page, offset))
            else:
                cur.execute(courses_query, (per_page, offset))
            
            courses = cur.fetchall()
            
        course_list = []
        for course in courses:
            course_dict = {
                'id': str(course[0]),
                'teacher_id': str(course[1]),
                'title': course[2],
                'description': course[3],
                'video_url': course[4],
                'is_published': course[5],
                'created_at': course[6].isoformat() if course[6] else None,
                'teacher_name': course[7],
                'enrolled_count': course[8] or 0
            }
            course_list.append(course_dict)
            
        return jsonify({
            'courses': course_list,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total_courses,
                'total_pages': total_pages,
                'has_next': page < total_pages,
                'has_prev': page > 1
            }
        })
        
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
                SELECT c.id, c.teacher_id, c.title, c.description, c.video_url, c.is_published, c.created_at,
                       u.name as teacher_name,
                       COUNT(e.id) as enrolled_count
                FROM courses c
                LEFT JOIN users u ON c.teacher_id = u.id
                LEFT JOIN enrollments e ON c.id = e.course_id
                WHERE c.id = %s
                GROUP BY c.id, c.teacher_id, c.title, c.description, c.video_url, c.is_published, c.created_at, u.name
            """, (str(course_id),))
            
            course = cur.fetchone()
            
        if not course:
            return jsonify({'error': 'Course not found'}), 404
            
        # Check if user can view this course
        is_published = course[5]
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
            'video_url': course[4],
            'is_published': course[5],
            'created_at': course[6].isoformat() if course[6] else None,
            'teacher_name': course[7],
            'enrolled_count': course[8] or 0
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
                INSERT INTO courses (teacher_id, title, description, video_url, is_published)
                VALUES (%s, %s, %s, %s, %s) RETURNING id
            """, (teacher_id, data['title'], data['description'], data.get('video_url'), data.get('is_published', False)))
            
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
                UPDATE courses SET teacher_id=%s, title=%s, description=%s, video_url=%s, is_published=%s
                WHERE id=%s RETURNING id
            """, (teacher_id, data['title'], data['description'], data.get('video_url'), data.get('is_published', False), str(course_id)))
            
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
