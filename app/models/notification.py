import psycopg2
from psycopg2.extras import RealDictCursor

class NotificationModel:
    def __init__(self, conn):
        self.conn = conn

    def get_by_id(self, notification_id):
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM notifications WHERE id = %s", (notification_id,))
            return cur.fetchone()

    def create(self, user_id, title, message, is_read=False):
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO notifications (user_id, title, message, is_read)
                VALUES (%s, %s, %s, %s) RETURNING id
            """, (user_id, title, message, is_read))
            self.conn.commit()
            return cur.fetchone()[0]
