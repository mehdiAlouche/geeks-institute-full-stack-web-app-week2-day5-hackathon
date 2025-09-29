from flask import Blueprint, request, jsonify
from app.models.course_file import CourseFileModel
from app.database import get_db_connection
from app.middleware.auth import require_auth, require_teacher_or_admin
import os
import uuid

bp = Blueprint('files', __name__)

@bp.route('/', methods=['GET'])
@require_auth
def get_files():
    conn = get_db_connection()
    try:
        course_id = request.args.get('course_id')
        
        if course_id:
            # Get files for specific course
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, course_id, title, file_type, file_url, file_order 
                    FROM course_files 
                    WHERE course_id = %s 
                    ORDER BY file_order ASC
                """, (course_id,))
                files = cur.fetchall()
        else:
            # Get all files
            with conn.cursor() as cur:
                cur.execute("SELECT id, course_id, title, file_type, file_url, file_order FROM course_files")
                files = cur.fetchall()
        
        file_list = [dict(zip(['id', 'course_id', 'title', 'file_type', 'file_url', 'file_order'], file)) for file in files]
        return jsonify({'files': file_list})
    finally:
        conn.close()

@bp.route('/<uuid:file_id>', methods=['GET'])
@require_auth
def get_file(file_id):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, course_id, title, file_type, file_url, file_order FROM course_files WHERE id = %s", (str(file_id),))
            file = cur.fetchone()
        if file:
            return jsonify(dict(zip(['id', 'course_id', 'title', 'file_type', 'file_url', 'file_order'], file)))
        return jsonify({'error': 'File not found'}), 404
    finally:
        conn.close()

@bp.route('/', methods=['POST'])
@require_teacher_or_admin
def create_file():
    data = request.json
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO course_files (course_id, title, file_type, file_url, file_order)
                VALUES (%s, %s, %s, %s, %s) RETURNING id
            """, (data['course_id'], data['title'], data['file_type'], data['file_url'], data.get('file_order', 0)))
            file_id = cur.fetchone()[0]
            conn.commit()
        return jsonify({'id': str(file_id)}), 201
    finally:
        conn.close()

@bp.route('/upload', methods=['POST'])
@require_teacher_or_admin
def upload_file():
    """Handle file uploads"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Get form data
    course_id = request.form.get('course_id')
    title = request.form.get('title', file.filename)
    file_type = request.form.get('file_type', 'document')
    file_order = int(request.form.get('file_order', 0))
    
    if not course_id:
        return jsonify({'error': 'Course ID is required'}), 400
    
    # Create upload directory if it doesn't exist
    upload_dir = 'app/static/uploads'
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    try:
        # Save file
        file.save(file_path)
        
        # Save file info to database
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO course_files (course_id, title, file_type, file_url, file_order)
                    VALUES (%s, %s, %s, %s, %s) RETURNING id
                """, (course_id, title, file_type, f"/static/uploads/{unique_filename}", file_order))
                file_id = cur.fetchone()[0]
                conn.commit()
            
            return jsonify({
                'id': str(file_id),
                'message': 'File uploaded successfully',
                'file_url': f"/static/uploads/{unique_filename}"
            }), 201
        finally:
            conn.close()
            
    except Exception as e:
        # Clean up file if database save fails
        if os.path.exists(file_path):
            os.remove(file_path)
        return jsonify({'error': str(e)}), 500

@bp.route('/<uuid:file_id>', methods=['PUT'])
@require_teacher_or_admin
def update_file(file_id):
    data = request.json
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE course_files SET course_id=%s, title=%s, file_type=%s, file_url=%s, file_order=%s
                WHERE id=%s RETURNING id
            """, (data['course_id'], data['title'], data['file_type'], data['file_url'], data.get('file_order', 0), str(file_id)))
            updated = cur.fetchone()
            conn.commit()
        if updated:
            return jsonify({'id': str(updated[0])})
        return jsonify({'error': 'File not found'}), 404
    finally:
        conn.close()

@bp.route('/<uuid:file_id>', methods=['DELETE'])
@require_teacher_or_admin
def delete_file(file_id):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM course_files WHERE id = %s RETURNING id", (str(file_id),))
            deleted = cur.fetchone()
            conn.commit()
        if deleted:
            return jsonify({'id': str(deleted[0])})
        return jsonify({'error': 'File not found'}), 404
    finally:
        conn.close()
