from flask import Blueprint, request, jsonify
from app.models.comment import CommentModel
from app.database import get_db


bp = Blueprint('comments', __name__)

@bp.route('/', methods=['GET'])
def get_comments():
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("SELECT id, file_id, user_id, parent_id, comment, likes, created_at FROM comments")
        comments = cur.fetchall()
    comment_list = [dict(zip(['id', 'file_id', 'user_id', 'parent_id', 'comment', 'likes', 'created_at'], comment)) for comment in comments]
    return jsonify(comment_list)

@bp.route('/<uuid:comment_id>', methods=['GET'])
def get_comment(comment_id):
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("SELECT id, file_id, user_id, parent_id, comment, likes, created_at FROM comments WHERE id = %s", (str(comment_id),))
        comment = cur.fetchone()
    if comment:
        return jsonify(dict(zip(['id', 'file_id', 'user_id', 'parent_id', 'comment', 'likes', 'created_at'], comment)))
    return jsonify({'error': 'Comment not found'}), 404

@bp.route('/', methods=['POST'])
def create_comment():
    data = request.json
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO comments (file_id, user_id, parent_id, comment, likes)
            VALUES (%s, %s, %s, %s, %s) RETURNING id
        """, (data['file_id'], data['user_id'], data.get('parent_id'), data['comment'], data.get('likes', 0)))
        comment_id = cur.fetchone()[0]
        conn.commit()
    return jsonify({'id': comment_id}), 201

@bp.route('/<uuid:comment_id>', methods=['PUT'])
def update_comment(comment_id):
    data = request.json
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE comments SET file_id=%s, user_id=%s, parent_id=%s, comment=%s, likes=%s
            WHERE id=%s RETURNING id
        """, (data['file_id'], data['user_id'], data.get('parent_id'), data['comment'], data.get('likes', 0), str(comment_id)))
        updated = cur.fetchone()
        conn.commit()
    if updated:
        return jsonify({'id': updated[0]})
    return jsonify({'error': 'Comment not found'}), 404

@bp.route('/<uuid:comment_id>', methods=['DELETE'])
def delete_comment(comment_id):
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM comments WHERE id = %s RETURNING id", (str(comment_id),))
        deleted = cur.fetchone()
        conn.commit()
    if deleted:
        return jsonify({'id': deleted[0]})
    return jsonify({'error': 'Comment not found'}), 404
