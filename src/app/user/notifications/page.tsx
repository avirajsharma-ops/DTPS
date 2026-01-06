'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import UserNavBar from '@/components/client/UserNavBar';
import { Bell, Check, CheckCheck, Trash2, Calendar, MessageSquare, Utensils, TrendingUp, Clock, CreditCard, Settings, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'meal' | 'appointment' | 'progress' | 'message' | 'reminder' | 'system' | 'task' | 'payment' | 'custom';
  read: boolean;
  data?: Record<string, unknown>;
  actionUrl?: string;
  createdAt: string;
}

interface NotificationResponse {
  success: boolean;
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  unreadCount: number;
}

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const params = new URLSearchParams();
      if (activeFilter === 'unread') {
        params.append('unread', 'true');
      } else if (activeFilter !== 'all') {
        params.append('type', activeFilter);
      }
      
      const response = await fetch(`/api/client/notifications?${params.toString()}`);
      if (response.ok) {
        const data: NotificationResponse = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    if (session?.user) {
      fetchNotifications();
    }
  }, [session, fetchNotifications]);

  const markAsRead = async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/client/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds })
      });
      
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount);
        setNotifications(prev => 
          prev.map(n => 
            notificationIds.includes(n._id) ? { ...n, read: true } : n
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/client/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true })
      });
      
      if (response.ok) {
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/client/notifications?id=${notificationId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'meal':
        return <Utensils className="h-5 w-5 text-green-600" />;
      case 'appointment':
        return <Calendar className="h-5 w-5 text-blue-600" />;
      case 'message':
        return <MessageSquare className="h-5 w-5 text-purple-600" />;
      case 'progress':
        return <TrendingUp className="h-5 w-5 text-emerald-600" />;
      case 'reminder':
        return <Clock className="h-5 w-5 text-amber-600" />;
      case 'task':
        return <Check className="h-5 w-5 text-indigo-600" />;
      case 'payment':
        return <CreditCard className="h-5 w-5 text-pink-600" />;
      case 'system':
        return <Settings className="h-5 w-5 text-gray-600" />;
      default:
        return <Bell className="h-5 w-5 text-orange-600" />;
    }
  };

  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case 'meal':
        return 'bg-green-50';
      case 'appointment':
        return 'bg-blue-50';
      case 'message':
        return 'bg-purple-50';
      case 'progress':
        return 'bg-emerald-50';
      case 'reminder':
        return 'bg-amber-50';
      case 'task':
        return 'bg-indigo-50';
      case 'payment':
        return 'bg-pink-50';
      case 'system':
        return 'bg-gray-50';
      default:
        return 'bg-orange-50';
    }
  };

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'meal', label: 'Meals' },
    { id: 'appointment', label: 'Appointments' },
    { id: 'message', label: 'Messages' },
    { id: 'task', label: 'Tasks' },
    { id: 'payment', label: 'Payments' }
  ];

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E06A26]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <UserNavBar 
        title="Notifications" 
        showBack={true}
        showNotification={false}
        showMenu={false}
      />
      
      {/* Header Actions */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-[#E06A26]" />
            <span className="text-sm font-medium text-gray-700">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchNotifications(true)}
              disabled={refreshing}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[#E06A26] hover:bg-[#E06A26]/10 rounded-lg transition-colors"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {filters.map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                activeFilter === filter.id
                  ? 'bg-[#E06A26] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E06A26]"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Bell className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">No notifications</h3>
            <p className="text-sm text-gray-500 max-w-xs">
              {activeFilter === 'unread' 
                ? "You've read all your notifications" 
                : "You don't have any notifications yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                className={`bg-white rounded-xl shadow-sm overflow-hidden transition-all ${
                  !notification.read ? 'border-l-4 border-[#E06A26]' : ''
                }`}
              >
                <div 
                  className="p-4 flex gap-3"
                  onClick={() => {
                    if (!notification.read) {
                      markAsRead([notification._id]);
                    }
                    if (notification.actionUrl) {
                      window.location.href = notification.actionUrl;
                    }
                  }}
                >
                  {/* Icon */}
                  <div className={`shrink-0 w-10 h-10 rounded-full ${getNotificationBgColor(notification.type)} flex items-center justify-center`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`text-sm ${!notification.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <span className="shrink-0 w-2 h-2 rounded-full bg-[#E06A26]"></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1.5">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-4 py-2 bg-gray-50 flex items-center justify-between border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 capitalize px-2 py-0.5 bg-gray-100 rounded-full">
                      {notification.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {!notification.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead([notification._id]);
                        }}
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification._id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
