import { useState, useEffect } from 'react';
import { Bell, X, CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const subscription = supabase
      .channel('task-notifications')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'inference_tasks' },
        (payload) => {
          const task = payload.new as any;

          if (task.status === 'completed') {
            addNotification({
              type: 'success',
              title: 'Task Completed',
              message: `"${task.task_name}" finished successfully`,
            });
          } else if (task.status === 'failed') {
            addNotification({
              type: 'error',
              title: 'Task Failed',
              message: `"${task.task_name}" encountered an error`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'inference_results' },
        (payload) => {
          const result = payload.new as any;
          const detections = Array.isArray(result.result_data) ? result.result_data.length : 0;

          if (detections > 0) {
            addNotification({
              type: 'info',
              title: 'New Detections',
              message: `Found ${detections} object${detections > 1 ? 's' : ''} in inference result`,
            });
          }
        }
      )
      .subscribe();

    const statsSubscription = supabase
      .channel('stats-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'accelerator_stats' },
        (payload) => {
          const stats = payload.new as any;

          if (stats.temperature > 80) {
            addNotification({
              type: 'warning',
              title: 'High Temperature',
              message: `Accelerator temperature at ${stats.temperature.toFixed(1)}°C`,
            });
          }

          if (stats.power_consumption > 10) {
            addNotification({
              type: 'warning',
              title: 'High Power Usage',
              message: `Power consumption at ${stats.power_consumption.toFixed(1)}W`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      statsSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const addNotification = (notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notif,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getColorClasses = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-500/10 border-emerald-500/30';
      case 'error':
        return 'bg-red-500/10 border-red-500/30';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/30';
      case 'info':
        return 'bg-blue-500/10 border-blue-500/30';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 top-12 w-96 max-h-[600px] bg-slate-800 rounded-lg border border-slate-700 shadow-xl z-50 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-white font-semibold">Notifications</h3>

              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Mark all read
                  </button>
                )}

                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No notifications</p>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border ${getColorClasses(notification.type)} ${
                        !notification.read ? 'ring-2 ring-blue-500/20' : ''
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        {getIcon(notification.type)}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="text-white font-medium text-sm">
                              {notification.title}
                            </h4>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeNotification(notification.id);
                              }}
                              className="text-slate-400 hover:text-white transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <p className="text-slate-300 text-sm mb-2">
                            {notification.message}
                          </p>

                          <div className="text-xs text-slate-500">
                            {formatTime(notification.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}
