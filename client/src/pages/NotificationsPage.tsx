import { useState, useEffect } from 'react';
import api from '../services/api';
import { NOTIFICATION_API } from '../config/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`${NOTIFICATION_API}/notifications`);
      setNotifications(response.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch notifications';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`${NOTIFICATION_API}/notifications/${id}/mark-read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to mark as read';
      alert(message);
    }
  };

  const markAllAsRead = async () => {
    setMarkingAllRead(true);
    try {
      await api.patch(`${NOTIFICATION_API}/notifications/mark-all-read`);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to mark all as read';
      alert(message);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'low_stock': return '⚠️';
      case 'order': return '📦';
      case 'payment': return '💳';
      default: return '🔔';
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'low_stock': return 'badge-warning';
      case 'order': return 'badge-primary';
      case 'payment': return 'badge-success';
      default: return 'badge-secondary';
    }
  };

  return (
    <div className="notifications-page">
      <div className="page-header">
        <h1>Notifications</h1>
        {notifications.some((n) => !n.isRead) && (
          <button
            className="btn btn-secondary"
            onClick={markAllAsRead}
            disabled={markingAllRead}
          >
            {markingAllRead ? 'Marking...' : 'Mark All as Read'}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="loading">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <p className="empty-state">No notifications yet.</p>
          ) : (
            <div className="notification-list">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                  onClick={() => !notification.isRead && markAsRead(notification.id)}
                >
                  <div className="notification-icon">
                    {getTypeIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-header">
                      <span className="notification-title">{notification.title}</span>
                      <span className={`badge ${getTypeBadgeClass(notification.type)}`}>
                        {notification.type.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">
                      {new Date(notification.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {!notification.isRead && <span className="unread-dot" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;