import psycopg2
from psycopg2.extras import RealDictCursor

class CommentModel:
    def __init__(self, conn):
        self.conn = conn

    def get_by_id(self, comment_id):
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM comments WHERE id = %s", (comment_id,))
            return cur.fetchone()

    def create(self, file_id, user_id, comment, parent_id=None, likes=0):
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO comments (file_id, user_id, comment, parent_id, likes)
                VALUES (%s, %s, %s, %s, %s) RETURNING id
            """, (file_id, user_id, comment, parent_id, likes))
            self.conn.commit()
            return cur.fetchone()[0]
