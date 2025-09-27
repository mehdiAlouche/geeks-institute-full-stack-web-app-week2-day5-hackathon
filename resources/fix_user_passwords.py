"""
Script to update all user password_hash fields to valid bcrypt hashes
"""
import os
from passlib.hash import bcrypt
import psycopg2
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(
    dbname=os.getenv('POSTGRES_DB', 'sm-db'),
    user=os.getenv('POSTGRES_USER', 'postgres'),
    password=os.getenv('POSTGRES_PASSWORD', 'root'),
    host=os.getenv('POSTGRES_HOST', 'localhost'),
    port=os.getenv('POSTGRES_PORT', '5432')
)

with conn.cursor() as cur:
    cur.execute("SELECT id, password_hash FROM users")
    users = cur.fetchall()
    for user_id, old_hash in users:
        # Only update if hash is not a valid bcrypt hash
        if not (isinstance(old_hash, str) and old_hash.startswith('$2b$')):
            # Assume old_hash is actually the plain password
            new_hash = bcrypt.hash(old_hash)
            cur.execute("UPDATE users SET password_hash = %s WHERE id = %s", (new_hash, user_id))
            print(f"Updated user {user_id}")
    conn.commit()

print("All user password_hash fields updated to bcrypt hashes.")
