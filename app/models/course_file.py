import psycopg2
from psycopg2.extras import RealDictCursor

class CourseFileModel:
    def __init__(self, conn):
        self.conn = conn

    def get_by_id(self, file_id):
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM course_files WHERE id = %s", (file_id,))
            return cur.fetchone()

    def create(self, course_id, title, file_type, file_url, file_order):
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO course_files (course_id, title, file_type, file_url, file_order)
                VALUES (%s, %s, %s, %s, %s) RETURNING id
            """, (course_id, title, file_type, file_url, file_order))
            self.conn.commit()
            return cur.fetchone()[0]
