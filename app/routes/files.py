from flask import Blueprint, request, jsonify
from app.models.course_file import CourseFileModel
from app.database import get_db

bp = Blueprint('files', __name__)

@bp.route('/', methods=['GET'])
def get_files():
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("SELECT id, course_id, title, file_type, file_url, file_order FROM course_files")
        files = cur.fetchall()
    file_list = [dict(zip(['id', 'course_id', 'title', 'file_type', 'file_url', 'file_order'], file)) for file in files]
    return jsonify(file_list)

@bp.route('/<uuid:file_id>', methods=['GET'])
def get_file(file_id):
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("SELECT id, course_id, title, file_type, file_url, file_order FROM course_files WHERE id = %s", (str(file_id),))
        file = cur.fetchone()
    if file:
        return jsonify(dict(zip(['id', 'course_id', 'title', 'file_type', 'file_url', 'file_order'], file)))
    return jsonify({'error': 'File not found'}), 404

@bp.route('/', methods=['POST'])
def create_file():
    data = request.json
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO course_files (course_id, title, file_type, file_url, file_order)
            VALUES (%s, %s, %s, %s, %s) RETURNING id
        """, (data['course_id'], data['title'], data['file_type'], data['file_url'], data.get('file_order', 0)))
        file_id = cur.fetchone()[0]
        conn.commit()
    return jsonify({'id': file_id}), 201

@bp.route('/<uuid:file_id>', methods=['PUT'])
def update_file(file_id):
    data = request.json
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE course_files SET course_id=%s, title=%s, file_type=%s, file_url=%s, file_order=%s
            WHERE id=%s RETURNING id
        """, (data['course_id'], data['title'], data['file_type'], data['file_url'], data.get('file_order', 0), str(file_id)))
        updated = cur.fetchone()
        conn.commit()
    if updated:
        return jsonify({'id': updated[0]})
    return jsonify({'error': 'File not found'}), 404

@bp.route('/<uuid:file_id>', methods=['DELETE'])
def delete_file(file_id):
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM course_files WHERE id = %s RETURNING id", (str(file_id),))
        deleted = cur.fetchone()
        conn.commit()
    if deleted:
        return jsonify({'id': deleted[0]})
    return jsonify({'error': 'File not found'}), 404
