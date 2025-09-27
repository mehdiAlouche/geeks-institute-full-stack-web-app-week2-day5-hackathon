import psycopg2
from psycopg2.extras import RealDictCursor

class EnrollmentModel:
    def __init__(self, conn):
        self.conn = conn

    def get_by_id(self, enrollment_id):
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM enrollments WHERE id = %s", (enrollment_id,))
            return cur.fetchone()

    def create(self, student_id, course_id):
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO enrollments (student_id, course_id)
                VALUES (%s, %s) RETURNING id
            """, (student_id, course_id))
            self.conn.commit()
            return cur.fetchone()[0]
