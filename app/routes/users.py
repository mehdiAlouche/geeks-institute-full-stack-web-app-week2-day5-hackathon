from flask import Blueprint, request, jsonify
from app.models.user import UserModel
from app.database import get_db_connection
from app.middleware.auth import require_admin

bp = Blueprint('users', __name__)

@bp.route('/', methods=['GET'])
@require_admin
def get_users():
    """Get users with pagination - admin only"""
    conn = get_db_connection()
    
    # Pagination parameters
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 6, type=int)
    search = request.args.get('search', '', type=str)
    role_filter = request.args.get('role', '', type=str)
    
    try:
        with conn.cursor() as cur:
            # Build WHERE conditions
            where_conditions = []
            params = []
            
            if search:
                where_conditions.append("(name ILIKE %s OR email ILIKE %s)")
                params.extend([f'%{search}%', f'%{search}%'])
            
            if role_filter and role_filter in ['admin', 'teacher', 'student']:
                where_conditions.append("role = %s")
                params.append(role_filter)
            
            where_clause = ""
            if where_conditions:
                where_clause = "WHERE " + " AND ".join(where_conditions)
            
            # Count total users
            count_query = f"SELECT COUNT(*) FROM users {where_clause}"
            cur.execute(count_query, params)
            total_users = cur.fetchone()[0]
            total_pages = (total_users + per_page - 1) // per_page
            
            # Get paginated users
            offset = (page - 1) * per_page
            users_query = f"""
                SELECT id, email, name, role, created_at 
                FROM users 
                {where_clause}
                ORDER BY created_at DESC 
                LIMIT %s OFFSET %s
            """
            
            query_params = params + [per_page, offset]
            cur.execute(users_query, query_params)
            users = cur.fetchall()
            
        user_list = []
        for user in users:
            user_dict = {
                'id': str(user[0]),
                'email': user[1],
                'name': user[2],
                'role': user[3],
                'created_at': user[4].isoformat() if user[4] else None
            }
            user_list.append(user_dict)
        
        return jsonify({
            'users': user_list,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total_users,
                'total_pages': total_pages,
                'has_next': page < total_pages,
                'has_prev': page > 1
            }
        })
        
    finally:
        conn.close()

@bp.route('/<uuid:user_id>', methods=['GET'])
@require_admin
def get_user(user_id):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, email, name, role, created_at FROM users WHERE id = %s", (str(user_id),))
            user = cur.fetchone()
            
            if user:
                user_dict = {
                    'id': str(user[0]),
                    'email': user[1],
                    'name': user[2],
                    'role': user[3],
                    'created_at': user[4].isoformat() if user[4] else None
                }
                return jsonify(user_dict)
            return jsonify({'error': 'User not found'}), 404
    finally:
        conn.close()

@bp.route('/', methods=['POST'])
@require_admin
def create_user():
    """Create a new user - admin only"""
    data = request.json
    
    # Validation
    if not data.get('email') or not data.get('name') or not data.get('role'):
        return jsonify({'error': 'Email, name, and role are required'}), 400
    
    if data.get('role') not in ['student', 'teacher', 'admin']:
        return jsonify({'error': 'Invalid role. Must be student, teacher, or admin'}), 400
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Check if email already exists
            cur.execute("SELECT id FROM users WHERE email = %s", (data['email'],))
            if cur.fetchone():
                return jsonify({'error': 'Email already exists'}), 400
            
            # Hash password
            import hashlib
            password_hash = hashlib.sha256(data.get('password', '').encode()).hexdigest()
            
            cur.execute("""
                INSERT INTO users (email, password_hash, name, role) 
                VALUES (%s, %s, %s, %s) 
                RETURNING id
            """, (data['email'], password_hash, data['name'], data['role']))
            
            user_id = cur.fetchone()[0]
            conn.commit()
            
        return jsonify({'id': str(user_id), 'message': 'User created successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@bp.route('/<uuid:user_id>', methods=['PUT'])
@require_admin
def update_user(user_id):
    """Update user - admin only"""
    data = request.json
    conn = get_db_connection()
    
    try:
        with conn.cursor() as cur:
            # Check if user exists
            cur.execute("SELECT id FROM users WHERE id = %s", (str(user_id),))
            if not cur.fetchone():
                return jsonify({'error': 'User not found'}), 404
            
            # Update user
            update_fields = []
            values = []
            
            if 'email' in data:
                update_fields.append("email = %s")
                values.append(data['email'])
            if 'name' in data:
                update_fields.append("name = %s")
                values.append(data['name'])
            if 'role' in data:
                if data['role'] not in ['student', 'teacher', 'admin']:
                    return jsonify({'error': 'Invalid role'}), 400
                update_fields.append("role = %s")
                values.append(data['role'])
            if 'password' in data:
                import hashlib
                password_hash = hashlib.sha256(data['password'].encode()).hexdigest()
                update_fields.append("password_hash = %s")
                values.append(password_hash)
            
            if not update_fields:
                return jsonify({'error': 'No fields to update'}), 400
            
            values.append(str(user_id))
            query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = %s RETURNING id"
            
            cur.execute(query, values)
            updated = cur.fetchone()
            conn.commit()
            
        if updated:
            return jsonify({'id': str(updated[0]), 'message': 'User updated successfully'})
        return jsonify({'error': 'User not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@bp.route('/<uuid:user_id>', methods=['DELETE'])
@require_admin
def delete_user(user_id):
    """Delete user - admin only"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM users WHERE id = %s RETURNING id", (str(user_id),))
            deleted = cur.fetchone()
            conn.commit()
            
        if deleted:
            return jsonify({'id': str(deleted[0]), 'message': 'User deleted successfully'})
        return jsonify({'error': 'User not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
