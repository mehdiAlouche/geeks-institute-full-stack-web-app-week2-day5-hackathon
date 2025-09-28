from flask import Blueprint, request, jsonify
from app.models.comment import CommentModel
from app.database import get_db_connection
from app.middleware.auth import require_auth, get_current_user


bp = Blueprint('comments', __name__)

@bp.route('/', methods=['GET'])
@require_auth
def get_comments():
    conn = get_db_connection()
    try:
        file_id = request.args.get('file_id')
        course_id = request.args.get('course_id')
        
        current_user = get_current_user()
        
        if file_id:
            # Get comments for specific file
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT c.id, c.file_id, c.user_id, c.parent_id, c.comment, c.likes, c.created_at,
                           u.name as user_name, u.role as user_role,
                           CASE WHEN cl.user_id IS NOT NULL THEN true ELSE false END as is_liked
                    FROM comments c
                    LEFT JOIN users u ON c.user_id = u.id
                    LEFT JOIN comment_likes cl ON c.id = cl.comment_id AND cl.user_id = %s
                    WHERE c.file_id = %s
                    ORDER BY c.created_at ASC
                """, (current_user['id'], file_id))
                comments = cur.fetchall()
        elif course_id:
            # Get comments for course - handle both file-based and course-based comments
            with conn.cursor() as cur:
                # First, try to get or create a course discussion file
                cur.execute("""
                    SELECT id FROM course_files 
                    WHERE course_id = %s AND file_type = 'discussion' 
                    LIMIT 1
                """, (course_id,))
                discussion_file = cur.fetchone()
                
                if discussion_file:
                    # Get comments for the discussion file
                    cur.execute("""
                        SELECT c.id, c.file_id, c.user_id, c.parent_id, c.comment, c.likes, c.created_at,
                               u.name as user_name, u.role as user_role,
                               CASE WHEN cl.user_id IS NOT NULL THEN true ELSE false END as is_liked
                        FROM comments c
                        LEFT JOIN users u ON c.user_id = u.id
                        LEFT JOIN comment_likes cl ON c.id = cl.comment_id AND cl.user_id = %s
                        WHERE c.file_id = %s
                        ORDER BY c.created_at ASC
                    """, (current_user['id'], discussion_file[0]))
                    comments = cur.fetchall()
                else:
                    # No discussion file exists yet, return empty comments
                    comments = []
        else:
            # Get all comments
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT c.id, c.file_id, c.user_id, c.parent_id, c.comment, c.likes, c.created_at,
                           u.name as user_name, u.role as user_role,
                           CASE WHEN cl.user_id IS NOT NULL THEN true ELSE false END as is_liked
                    FROM comments c
                    LEFT JOIN users u ON c.user_id = u.id
                    LEFT JOIN comment_likes cl ON c.id = cl.comment_id AND cl.user_id = %s
                    ORDER BY c.created_at ASC
                """, (current_user['id'],))
                comments = cur.fetchall()
        
        comment_list = []
        for comment in comments:
            comment_dict = {
                'id': str(comment[0]),
                'file_id': str(comment[1]) if comment[1] else None,
                'user_id': str(comment[2]),
                'parent_id': str(comment[3]) if comment[3] else None,
                'comment': comment[4],
                'likes': comment[5] or 0,
                'created_at': comment[6].isoformat() if comment[6] else None,
                'user_name': comment[7],
                'user_role': comment[8],
                'is_liked': comment[9] if len(comment) > 9 else False
            }
            comment_list.append(comment_dict)
        
        return jsonify({'comments': comment_list})
    except Exception as e:
        print(f"ERROR in get_comments: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@bp.route('/<uuid:comment_id>', methods=['GET'])
@require_auth
def get_comment(comment_id):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT c.id, c.file_id, c.user_id, c.parent_id, c.comment, c.likes, c.created_at,
                       u.name as user_name, u.role as user_role
                FROM comments c
                LEFT JOIN users u ON c.user_id = u.id
                WHERE c.id = %s
            """, (str(comment_id),))
            comment = cur.fetchone()
        if comment:
            comment_dict = {
                'id': str(comment[0]),
                'file_id': str(comment[1]) if comment[1] else None,
                'user_id': str(comment[2]),
                'parent_id': str(comment[3]) if comment[3] else None,
                'comment': comment[4],
                'likes': comment[5] or 0,
                'created_at': comment[6].isoformat() if comment[6] else None,
                'user_name': comment[7],
                'user_role': comment[8]
            }
            return jsonify(comment_dict)
        return jsonify({'error': 'Comment not found'}), 404
    finally:
        conn.close()

@bp.route('/', methods=['POST'])
@require_auth
def create_comment():
    data = request.json
    current_user = get_current_user()
    conn = get_db_connection()
    
    try:
        with conn.cursor() as cur:
            # For course-level comments, we'll create a placeholder file entry
            file_id = data.get('file_id')
            course_id = data.get('course_id')
            
            if course_id and not file_id:
                # Check if discussion file already exists
                cur.execute("""
                    SELECT id FROM course_files 
                    WHERE course_id = %s AND file_type = 'discussion' 
                    LIMIT 1
                """, (course_id,))
                discussion_file = cur.fetchone()
                
                if discussion_file:
                    file_id = discussion_file[0]
                else:
                    # Create a course-level comment by creating a discussion file entry
                    cur.execute("""
                        INSERT INTO course_files (course_id, title, file_type, file_url, file_order)
                        VALUES (%s, %s, %s, %s, %s) RETURNING id
                    """, (course_id, 'Course Discussion', 'discussion', '/course-discussion', 999))
                    file_id = cur.fetchone()[0]
            
            if not file_id:
                return jsonify({'error': 'file_id or course_id is required'}), 400
            
            cur.execute("""
                INSERT INTO comments (file_id, user_id, parent_id, comment, likes)
                VALUES (%s, %s, %s, %s, %s) RETURNING id
            """, (file_id, current_user['id'], data.get('parent_id'), data['comment'], data.get('likes', 0)))
            comment_id = cur.fetchone()[0]
            conn.commit()
        
        return jsonify({'id': str(comment_id), 'message': 'Comment created successfully'}), 201
    finally:
        conn.close()

@bp.route('/<uuid:comment_id>', methods=['PUT'])
@require_auth
def update_comment(comment_id):
    data = request.json
    current_user = get_current_user()
    conn = get_db_connection()
    
    try:
        with conn.cursor() as cur:
            # Check if user owns the comment
            cur.execute("SELECT user_id FROM comments WHERE id = %s", (str(comment_id),))
            comment = cur.fetchone()
            
            if not comment:
                return jsonify({'error': 'Comment not found'}), 404
            
            if str(comment[0]) != current_user['id']:
                return jsonify({'error': 'Permission denied'}), 403
            
            cur.execute("""
                UPDATE comments SET comment=%s
                WHERE id=%s RETURNING id
            """, (data['comment'], str(comment_id)))
            updated = cur.fetchone()
            conn.commit()
        
        if updated:
            return jsonify({'id': str(updated[0]), 'message': 'Comment updated successfully'})
        return jsonify({'error': 'Comment not found'}), 404
    finally:
        conn.close()

@bp.route('/<uuid:comment_id>', methods=['DELETE'])
@require_auth
def delete_comment(comment_id):
    current_user = get_current_user()
    conn = get_db_connection()
    
    try:
        with conn.cursor() as cur:
            # Check if user owns the comment
            cur.execute("SELECT user_id FROM comments WHERE id = %s", (str(comment_id),))
            comment = cur.fetchone()
            
            if not comment:
                return jsonify({'error': 'Comment not found'}), 404
            
            if str(comment[0]) != current_user['id']:
                return jsonify({'error': 'Permission denied'}), 403
            
            cur.execute("DELETE FROM comments WHERE id = %s RETURNING id", (str(comment_id),))
            deleted = cur.fetchone()
            conn.commit()
        
        if deleted:
            return jsonify({'id': str(deleted[0]), 'message': 'Comment deleted successfully'})
        return jsonify({'error': 'Comment not found'}), 404
    finally:
        conn.close()

@bp.route('/<uuid:comment_id>/like', methods=['POST', 'DELETE'])
@require_auth
def toggle_comment_like(comment_id):
    current_user = get_current_user()
    conn = get_db_connection()
    
    try:
        with conn.cursor() as cur:
            if request.method == 'POST':
                # Add like
                try:
                    cur.execute("""
                        INSERT INTO comment_likes (comment_id, user_id)
                        VALUES (%s, %s)
                    """, (str(comment_id), current_user['id']))
                    
                    # Update comment likes count
                    cur.execute("""
                        UPDATE comments SET likes = likes + 1
                        WHERE id = %s
                    """, (str(comment_id),))
                    
                    conn.commit()
                    return jsonify({'message': 'Like added successfully'})
                except Exception as e:
                    if 'unique' in str(e).lower():
                        return jsonify({'error': 'Already liked'}), 400
                    raise e
            else:
                # Remove like
                cur.execute("""
                    DELETE FROM comment_likes 
                    WHERE comment_id = %s AND user_id = %s
                """, (str(comment_id), current_user['id']))
                
                if cur.rowcount > 0:
                    # Update comment likes count
                    cur.execute("""
                        UPDATE comments SET likes = GREATEST(likes - 1, 0)
                        WHERE id = %s
                    """, (str(comment_id),))
                    
                    conn.commit()
                    return jsonify({'message': 'Like removed successfully'})
                else:
                    return jsonify({'error': 'Like not found'}), 404
    finally:
        conn.close()
