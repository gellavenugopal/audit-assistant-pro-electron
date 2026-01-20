import { useState, useEffect } from 'react';
import { getSQLiteClient } from '@/integrations/sqlite/client';
import { useAuth } from '@/contexts/AuthContext';

const db = getSQLiteClient();

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await db
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
        .execute();

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await db
        .from('notifications')
        .eq('id', id)
        .update({ is_read: 1 });

      if (error) throw error;
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      const { error } = await db
        .from('notifications')
        .eq('user_id', user.id)
        .eq('is_read', 0)
        .update({ is_read: 1 });

      if (error) throw error;
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await db
        .from('notifications')
        .eq('id', id)
        .delete();

      if (error) throw error;
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const clearAll = async () => {
    if (!user) return;
    
    try {
      const { error } = await db
        .from('notifications')
        .eq('user_id', user.id)
        .delete();

      if (error) throw error;
      setNotifications([]);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    fetchNotifications();

    // Real-time subscriptions not available in SQLite
    // Use polling if real-time updates are needed
    // const interval = setInterval(fetchNotifications, 30000);
    // return () => clearInterval(interval);
  }, [user?.id]);

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    refetch: fetchNotifications,
  };
}

// Helper to create notifications
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  link?: string
) {
  try {
    const { error } = await db
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        link: link || null,
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}
