import http from '@/utils/axios';

const MessageAPI = {
  // Lấy danh sách conversations (hỗ trợ phân trang)
  getConversations(page = 1, limit = 20) {
    return http.get('/messages/conversations', { params: { page, limit } });
  },

  // Lấy messages trong một conversation
  getMessages(conversationId, page = 1, limit = 50) {
    return http.get(`/messages/conversations/${conversationId}/messages`, {
      params: { page, limit }
    });
  },

  // Gửi message mới
  async sendMessage(conversationId, messageData) {
    let fileUrl = null;
    let originalFileName = null;
    let messageType = messageData.messageType || 'text';
    
    // Upload file lên Cloudinary trước nếu có
    if (messageData.file) {
      const formData = new FormData();
      formData.append('file', messageData.file);
      
      const uploadResponse = await http.post('/messages/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (uploadResponse.data && uploadResponse.data.url) {
        fileUrl = uploadResponse.data.url;
        originalFileName = messageData.file.name;
        messageType = uploadResponse.data.messageType || messageType;
      }
    }
    
    // Gửi message với Cloudinary URL
    return http.post(`/messages/conversations/${conversationId}/messages`, {
      content: messageData.content || '',
      messageType: messageType,
      fileUrl: fileUrl,
      originalFileName: originalFileName
    });
  },

  // Tạo conversation mới hoặc tìm conversation đã tồn tại
  createOrGetConversation(participantId) {
    return http.post('/messages/conversations', { participantId });
  },

  // Lấy danh sách bạn bè để chat
  getFriends(limit = 20, offset = 0) {
    return http.get('/messages/friends', { params: { limit, offset } });
  },

  // Đánh dấu messages đã đọc
  markAsRead(conversationId) {
    return http.put(`/messages/conversations/${conversationId}/read`);
  },

  // Lấy số lượng tin nhắn chưa đọc
  getUnreadCount() {
    return http.get('/messages/unread-count');
  },

  // Thêm/sửa/xóa reaction
  addReaction(messageId, emoji) {
    return http.post(`/messages/messages/${messageId}/reaction`, { emoji });
  },

  // Sửa tin nhắn
  editMessage(messageId, content) {
    return http.put(`/messages/messages/${messageId}`, { content });
  },

  // Xóa tin nhắn
  deleteMessage(messageId) {
    return http.delete(`/messages/messages/${messageId}`);
  }
};

// Auth API để cập nhật activity
export const updateUserActivity = () => {
  return http.put('/auth/update-activity');
};

export default MessageAPI;