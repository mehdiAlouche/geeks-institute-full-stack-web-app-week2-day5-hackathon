import psycopg2
from psycopg2.extras import RealDictCursor

class CourseModel:
    def __init__(self, conn):
        self.conn = conn

    def get_by_id(self, course_id):
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM courses WHERE id = %s", (course_id,))
            return cur.fetchone()

    def create(self, teacher_id, title, description, is_published):
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO courses (teacher_id, title, description, is_published)
                VALUES (%s, %s, %s, %s) RETURNING id
            """, (teacher_id, title, description, is_published))
            self.conn.commit()
            return cur.fetchone()[0]
