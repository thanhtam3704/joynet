import axiosInstance from '@/utils/axios';

// Lấy danh sách thông báo
export const getNotifications = async (page = 1, limit = 20) => {
  try {
    const response = await axiosInstance.get(`/notifications?page=${page}&limit=${limit}`);
    return response;
  } catch (error) {
    throw error;
  }
};

// Lấy số lượng thông báo chưa đọc
export const getUnreadCount = async () => {
  try {
    const response = await axiosInstance.get('/notifications/unread-count');
    return response;
  } catch (error) {
    throw error;
  }
};

// Đánh dấu thông báo đã đọc
export const markAsRead = async (notificationId) => {
  try {
    const response = await axiosInstance.put(`/notifications/${notificationId}/read`);
    return response;
  } catch (error) {
    throw error;
  }
};

// Đánh dấu tất cả thông báo đã đọc
export const markAllAsRead = async () => {
  try {
    const response = await axiosInstance.put('/notifications/mark-all-read');
    return response;
  } catch (error) {
    throw error;
  }
};

// Xóa thông báo
export const deleteNotification = async (notificationId) => {
  try {
    const response = await axiosInstance.delete(`/notifications/${notificationId}`);
    return response;
  } catch (error) {
    throw error;
  }
};

// Tạo thông báo mới (admin/system)
export const createNotification = async (notificationData) => {
  try {
    const response = await axiosInstance.post('/notifications', notificationData);
    return response;
  } catch (error) {
    throw error;
  }
};

// Lấy thông báo realtime (WebSocket hoặc Server-Sent Events)
export const subscribeToNotifications = (userId, callback) => {
  // Implement WebSocket connection for real-time notifications
  const wsUrl = process.env.VUE_APP_SOCKET_URL?.replace('https://', 'wss://').replace('http://', 'ws://') || 'wss://social-backend-tfha.onrender.com';
  const ws = new WebSocket(`${wsUrl}/notifications/${userId}`);
  
  ws.onmessage = (event) => {
    const notification = JSON.parse(event.data);
    callback(notification);
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  return ws;
};