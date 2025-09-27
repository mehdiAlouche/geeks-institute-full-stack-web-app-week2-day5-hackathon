import psycopg2
from psycopg2.extras import RealDictCursor

class CommentLikeModel:
    def __init__(self, conn):
        self.conn = conn

    def get_by_id(self, like_id):
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM comment_likes WHERE id = %s", (like_id,))
            return cur.fetchone()

    def create(self, comment_id, user_id):
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO comment_likes (comment_id, user_id)
                VALUES (%s, %s) RETURNING id
            """, (comment_id, user_id))
            self.conn.commit()
            return cur.fetchone()[0]
