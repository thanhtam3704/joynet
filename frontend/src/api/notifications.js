import axiosInstance from '@/utils/axios';

// Lấy danh sách thông báo
export const getNotifications = async (page = 1, limit = 20) => {
  try {
    console.log('🔔 Calling getNotifications API with page:', page, 'limit:', limit);
    const response = await axiosInstance.get(`/notifications?page=${page}&limit=${limit}`);
    console.log('🔔 Notifications API response:', response);
    console.log('🔔 Notifications data:', response.data);
    return response;
  } catch (error) {
    console.error('❌ Get notifications error:', error);
    console.error('❌ Error response:', error.response);
    throw error;
  }
};

// Lấy số lượng thông báo chưa đọc
export const getUnreadCount = async () => {
  try {
    console.log('🔢 Calling getUnreadCount API');
    const response = await axiosInstance.get('/notifications/unread-count');
    console.log('🔢 Unread count response:', response);
    return response;
  } catch (error) {
    console.error('❌ Get unread count error:', error);
    console.error('❌ Error response:', error.response);
    throw error;
  }
};

// Đánh dấu thông báo đã đọc
export const markAsRead = async (notificationId) => {
  try {
    const response = await axiosInstance.put(`/notifications/${notificationId}/read`);
    return response;
  } catch (error) {
    console.error('Mark as read error:', error);
    throw error;
  }
};

// Đánh dấu tất cả thông báo đã đọc
export const markAllAsRead = async () => {
  try {
    const response = await axiosInstance.put('/notifications/mark-all-read');
    return response;
  } catch (error) {
    console.error('Mark all as read error:', error);
    throw error;
  }
};

// Xóa thông báo
export const deleteNotification = async (notificationId) => {
  try {
    const response = await axiosInstance.delete(`/notifications/${notificationId}`);
    return response;
  } catch (error) {
    console.error('Delete notification error:', error);
    throw error;
  }
};

// Tạo thông báo mới (admin/system)
export const createNotification = async (notificationData) => {
  try {
    const response = await axiosInstance.post('/notifications', notificationData);
    return response;
  } catch (error) {
    console.error('Create notification error:', error);
    throw error;
  }
};

// Lấy thông báo realtime (WebSocket hoặc Server-Sent Events)
export const subscribeToNotifications = (userId, callback) => {
  // Implement WebSocket connection for real-time notifications
  const ws = new WebSocket(`ws://localhost:3000/notifications/${userId}`);
  
  ws.onmessage = (event) => {
    const notification = JSON.parse(event.data);
    callback(notification);
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  return ws;
};