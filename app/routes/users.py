from flask import Blueprint, request, jsonify
from app.models.user import UserModel
from app.database import get_db

bp = Blueprint('users', __name__)

@bp.route('/', methods=['GET'])
def get_users():
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("SELECT id, email, name, role FROM users")
        users = cur.fetchall()
    user_list = [
        dict(zip(['id', 'email', 'name', 'role'], user))
        for user in users
    ]
    return jsonify(user_list)

@bp.route('/<uuid:user_id>', methods=['GET'])
def get_user(user_id):
    conn = get_db()
    user = UserModel(conn).get_by_id(str(user_id))
    if user:
        return jsonify(user)
    return jsonify({'error': 'User not found'}), 404

@bp.route('/', methods=['POST'])
def create_user():
    from passlib.hash import bcrypt
    data = request.json
    conn = get_db()
    password_hash = bcrypt.hash(data['password'])
    user_id = UserModel(conn).create(
        data['email'], password_hash, data['name'], data['role']
    )
    return jsonify({'id': user_id}), 201

@bp.route('/<uuid:user_id>', methods=['PUT'])
def update_user(user_id):
    data = request.json
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE users SET email=%s, password_hash=%s, name=%s, role=%s
            WHERE id=%s RETURNING id
        """, (data['email'], data['password_hash'], data['name'], data['role'], str(user_id)))
        updated = cur.fetchone()
        conn.commit()
    if updated:
        return jsonify({'id': updated[0]})
    return jsonify({'error': 'User not found'}), 404

@bp.route('/<uuid:user_id>', methods=['DELETE'])
def delete_user(user_id):
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM users WHERE id = %s RETURNING id", (str(user_id),))
        deleted = cur.fetchone()
        conn.commit()
    if deleted:
        return jsonify({'id': deleted[0]})
    return jsonify({'error': 'User not found'}), 404
