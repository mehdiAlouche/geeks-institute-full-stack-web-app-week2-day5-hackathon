from flask import Blueprint, request, jsonify
from app.models.user import UserModel
from app.database import get_db
import jwt
from passlib.hash import bcrypt
from datetime import datetime, timedelta
import os

bp = Blueprint('auth', __name__)

SECRET_KEY = os.getenv('JWT_SECRET', 'your_secret_key')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 60

def create_access_token(identity):
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        'sub': identity,
        'exp': expire
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

@bp.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    conn = get_db()
    user_model = UserModel(conn)
    with conn.cursor() as cur:
        cur.execute('SELECT * FROM users WHERE email = %s', (email,))
        user = cur.fetchone()
    if not user or not bcrypt.verify(password, user[2]):  # user[2] is password_hash
        return jsonify({'error': 'Invalid credentials'}), 401
    token = create_access_token(user[0])  # user[0] is id
    return jsonify({'access_token': token, 'token_type': 'bearer'})
