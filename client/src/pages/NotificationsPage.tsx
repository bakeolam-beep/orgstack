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

export const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  const fetchNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`${NOTIFICATION_API}`);
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

  const markAsRead = async (id: string, isRead: boolean) => {
    setToggling((prev) => new Set([...prev, id]));
    try {
      await api.patch(`${NOTIFICATION_API}/${id}/read`, { isRead });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead } : n))
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error &&
        (err as any).response &&
        (err as any).response.data &&
        (err as any).response.data.message
          ? (err as any).response.data.message
          : err instanceof Error
            ? err.message
            : `Failed to mark as ${isRead ? 'read' : 'unread'}`;
      alert(message);
    } finally {
      setToggling((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const markAllAsRead = async () => {
    setMarkingAllRead(true);
    try {
      await api.patch(`${NOTIFICATION_API}/mark-all-read`);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err: unknown) {
      const message =
        err instanceof Error &&
        (err as any).response &&
        (err as any).response.data &&
        (err as any).response.data.message
          ? (err as any).response.data.message
          : err instanceof Error
            ? err.message
            : 'Failed to mark all as read';
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
      case 'low_stock': return 'bg-orange-100 text-orange-800';
      case 'order': return 'bg-blue-100 text-blue-800';
      case 'payment': return 'bg-green-100 text-green-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const readStatusBadge = (isRead: boolean) => (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-bold ${isRead ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
    >
      {isRead ? 'Read' : 'Unread'}
    </span>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500">Stay updated on your store activity.</p>
        </div>

        {notifications.some((n) => !n.isRead) && (
          <button
            onClick={markAllAsRead}
            disabled={markingAllRead}
            className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-60"
          >
            {markingAllRead ? 'Marking...' : 'Mark All as Read'}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-0 overflow-hidden">
        <div className="divide-y divide-slate-200">
          {loading ? (
            <div className="p-8 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mb-2"></div>
              <p className="text-slate-500 text-sm">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-400">No notifications yet.</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start gap-3 p-6 border-b border-slate-100 hover:bg-slate-50 transition-colors last:border-0 ${!notification.isRead ? 'bg-blue-50' : 'bg-white'}`}
              >
                <div className="flex-shrink-0 text-lg mt-0.5">
                  {getTypeIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-bold text-slate-900">{notification.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getTypeBadgeClass(notification.type)}`}>
                      {notification.type.replace('_', ' ')}
                    </span>
                    {readStatusBadge(notification.isRead)}
                  </div>
                  <p className="text-sm text-slate-600 mb-1">{notification.message}</p>
                  <span className="text-xs text-slate-400">{new Date(notification.createdAt).toLocaleString()}</span>
                </div>
                <button
                  onClick={() => markAsRead(notification.id, !notification.isRead)}
                  disabled={toggling.has(notification.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    notification.isRead
                      ? 'text-indigo-600 hover:bg-indigo-50'
                      : 'text-red-600 hover:bg-red-50'
                  }`}
                >
                  {notification.isRead ? 'Mark Unread' : 'Mark Read'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
