"""
Authentication middleware for role-based access control
"""
import jwt
import os
from functools import wraps
from flask import request, jsonify, current_app
from app.database import get_db_connection

SECRET_KEY = os.getenv('JWT_SECRET', 'your_secret_key')
ALGORITHM = 'HS256'

def get_current_user():
    """Extract current user from JWT token"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    
    token = auth_header.split(' ')[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get('sub')
        
        if not user_id:
            return None
            
        # Get user details from database
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute('SELECT id, email, name, role FROM users WHERE id = %s', (user_id,))
                user = cur.fetchone()
                if user:
                    return {
                        'id': str(user[0]),
                        'email': user[1],
                        'name': user[2],
                        'role': user[3]
                    }
        finally:
            conn.close()
            
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
    
    return None

def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Add user to request context
        request.current_user = user
        return f(*args, **kwargs)
    return decorated_function

def require_role(roles):
    """Decorator to require specific roles"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({'error': 'Authentication required'}), 401
            
            if user['role'] not in roles:
                return jsonify({'error': 'Insufficient permissions'}), 403
            
            request.current_user = user
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def require_teacher_or_admin(f):
    """Decorator to require teacher or admin role"""
    return require_role(['teacher', 'admin'])(f)

def require_admin(f):
    """Decorator to require admin role"""
    return require_role(['admin'])(f)

def require_student(f):
    """Decorator to require student role"""
    return require_role(['student'])(f)

def get_user_role():
    """Get current user role from request context"""
    return getattr(request, 'current_user', {}).get('role')

def is_teacher_or_admin():
    """Check if current user is teacher or admin"""
    role = get_user_role()
    return role in ['teacher', 'admin']

def is_admin():
    """Check if current user is admin"""
    return get_user_role() == 'admin'

def is_student():
    """Check if current user is student"""
    return get_user_role() == 'student'
