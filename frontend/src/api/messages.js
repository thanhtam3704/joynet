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
  sendMessage(conversationId, messageData) {
    if (messageData.file) {
      // Gửi file qua FormData
      const formData = new FormData();
      if (messageData.content) {
        formData.append('content', messageData.content);
      }
      if (messageData.messageType) {
        formData.append('messageType', messageData.messageType);
      }
      formData.append('file', messageData.file);
      
      return http.post(`/messages/conversations/${conversationId}/messages`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    } else {
      // Gửi text message qua JSON
      return http.post(`/messages/conversations/${conversationId}/messages`, {
        content: messageData.content,
        messageType: messageData.messageType || 'text'
      });
    }
  },

  // Tạo conversation mới hoặc tìm conversation đã tồn tại
  createOrGetConversation(participantId) {
    return http.post('/messages/conversations', { participantId });
  },

  // Lấy danh sách bạn bè để chat
  getFriends() {
    return http.get('/messages/friends');
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
  }
};

// Auth API để cập nhật activity
export const updateUserActivity = () => {
  return http.put('/auth/update-activity');
};

export default MessageAPI;