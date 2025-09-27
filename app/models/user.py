import psycopg2
from psycopg2.extras import RealDictCursor

class UserModel:
    def __init__(self, conn):
        self.conn = conn

    def get_by_id(self, user_id):
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            return cur.fetchone()

    def create(self, email, password_hash, name, role):
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO users (email, password_hash, name, role)
                VALUES (%s, %s, %s, %s) RETURNING id
            """, (email, password_hash, name, role))
            self.conn.commit()
            return cur.fetchone()[0]
