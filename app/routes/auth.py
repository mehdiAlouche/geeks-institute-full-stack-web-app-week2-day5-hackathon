from flask import Blueprint, request, jsonify
from app.models.user import UserModel
from app.database import get_db_connection
import jwt
import hashlib
from datetime import datetime, timedelta
import os

bp = Blueprint('auth', __name__)

SECRET_KEY = os.getenv('JWT_SECRET', 'your_secret_key')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('JWT_EXPIRE_MINUTES', '60'))

def create_access_token(identity):
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        'sub': identity,
        'exp': expire
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token):
    """Verify JWT token and return user information"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get('sub')
        if not user_id:
            return None
        
        # Get user information from database
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
                return None
        finally:
            conn.close()
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
    except Exception:
        return None

@bp.route('/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')
    role = data.get('role', 'student')
    
    # Validate required fields
    if not all([email, password, name]):
        return jsonify({'error': 'Email, password, and name are required'}), 400
    
    # Validate role
    if role not in ['teacher', 'student', 'admin']:
        return jsonify({'error': 'Invalid role. Must be teacher, student, or admin'}), 400
    
    # Validate password strength
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters long'}), 400
    
    try:
        conn = get_db_connection()
        user_model = UserModel(conn)
        
        # Check if user already exists
        with conn.cursor() as cur:
            cur.execute('SELECT id FROM users WHERE email = %s', (email,))
            if cur.fetchone():
                return jsonify({'error': 'User with this email already exists'}), 409
        
        # Hash password and create user
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        user_id = user_model.create(email, password_hash, name, role)
        
        # Generate token for new user
        token = create_access_token(str(user_id))
        
        return jsonify({
            'message': 'User created successfully',
            'access_token': token,
            'token_type': 'bearer',
            'user': {
                'id': str(user_id),
                'email': email,
                'name': name,
                'role': role
            }
        }), 201
        
    except Exception as e:
        return jsonify({'error': 'Failed to create user', 'details': str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@bp.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    
    try:
        conn = get_db_connection()
        user_model = UserModel(conn)
        
        with conn.cursor() as cur:
            cur.execute('SELECT * FROM users WHERE email = %s', (email,))
            user = cur.fetchone()
        
        if not user or hashlib.sha256(password.encode()).hexdigest() != user[2]:  # user[2] is password_hash
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Generate token
        token = create_access_token(str(user[0]))  # user[0] is id (UUID)
        
        return jsonify({
            'access_token': token,
            'token_type': 'bearer',
            'user': {
                'id': str(user[0]),
                'email': user[1],
                'name': user[3],
                'role': user[4]
            }
        })
        
    except Exception as e:
        return jsonify({'error': 'Login failed', 'details': str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()
