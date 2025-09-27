from flask import Blueprint, request, jsonify
from app.models.notification import NotificationModel
from app.database import get_db

bp = Blueprint('notifications', __name__)

@bp.route('/', methods=['GET'])
def get_notifications():
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("SELECT id, user_id, title, message, is_read, created_at FROM notifications")
        notifications = cur.fetchall()
    notification_list = [dict(zip(['id', 'user_id', 'title', 'message', 'is_read', 'created_at'], notification)) for notification in notifications]
    return jsonify(notification_list)

@bp.route('/<uuid:notification_id>', methods=['GET'])
def get_notification(notification_id):
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("SELECT id, user_id, title, message, is_read, created_at FROM notifications WHERE id = %s", (str(notification_id),))
        notification = cur.fetchone()
    if notification:
        return jsonify(dict(zip(['id', 'user_id', 'title', 'message', 'is_read', 'created_at'], notification)))
    return jsonify({'error': 'Notification not found'}), 404

@bp.route('/', methods=['POST'])
def create_notification():
    data = request.json
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO notifications (user_id, title, message, is_read)
            VALUES (%s, %s, %s, %s) RETURNING id
        """, (data['user_id'], data['title'], data['message'], data.get('is_read', False)))
        notification_id = cur.fetchone()[0]
        conn.commit()
    return jsonify({'id': notification_id}), 201

@bp.route('/<uuid:notification_id>', methods=['PUT'])
def update_notification(notification_id):
    data = request.json
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE notifications SET user_id=%s, title=%s, message=%s, is_read=%s
            WHERE id=%s RETURNING id
        """, (data['user_id'], data['title'], data['message'], data.get('is_read', False), str(notification_id)))
        updated = cur.fetchone()
        conn.commit()
    if updated:
        return jsonify({'id': updated[0]})
    return jsonify({'error': 'Notification not found'}), 404

@bp.route('/<uuid:notification_id>', methods=['DELETE'])
def delete_notification(notification_id):
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM notifications WHERE id = %s RETURNING id", (str(notification_id),))
        deleted = cur.fetchone()
        conn.commit()
    if deleted:
        return jsonify({'id': deleted[0]})
    return jsonify({'error': 'Notification not found'}), 404
