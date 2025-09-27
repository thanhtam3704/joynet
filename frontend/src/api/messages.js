import axios from '@/utils/axios';

/**
 * Get all conversations for the current user
 */
export const getConversations = () =>
  axios.get('/conversations', { withCredentials: true });

/**
 * Get a specific conversation by ID
 * @param {string} conversationId - The ID of the conversation to fetch
 */
export const getConversation = (conversationId) =>
  axios.get(`/conversations/${conversationId}`, { withCredentials: true });

/**
 * Create a new conversation with another user
 * @param {string} recipientId - The ID of the user to start conversation with
 */
export const createConversation = (recipientId) =>
  axios.post('/conversations', { recipientId }, { withCredentials: true });

/**
 * Get all messages for a specific conversation
 * @param {string} conversationId - The ID of the conversation
 * @param {number} page - Page number for pagination (optional)
 * @param {number} limit - Number of messages per page (optional)
 */
export const getMessages = (conversationId, page = 1, limit = 20) =>
  axios.get(`/conversations/${conversationId}/messages`, {
    params: { page, limit },
    withCredentials: true
  });

/**
 * Send a new message in a conversation
 * @param {string} conversationId - The ID of the conversation
 * @param {string} content - The message text content
 * @param {File} [file] - Optional file attachment
 */
export const sendMessage = (conversationId, content, file = null) => {
  if (!file) {
    // Simple text message
    return axios.post(
      `/conversations/${conversationId}/messages`,
      { content },
      { withCredentials: true }
    );
  } else {
    // Message with file attachment
    const formData = new FormData();
    formData.append('content', content);
    formData.append('file', file);
    
    return axios.post(
      `/conversations/${conversationId}/messages`,
      formData,
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
  }
};

/**
 * Mark all messages in a conversation as read
 * @param {string} conversationId - The ID of the conversation
 */
export const markAsRead = (conversationId) =>
  axios.put(
    `/conversations/${conversationId}/read`,
    {},
    { withCredentials: true }
  );

/**
 * Delete a message
 * @param {string} messageId - The ID of the message to delete
 */
export const deleteMessage = (messageId) =>
  axios.delete(`/messages/${messageId}`, { withCredentials: true });

/**
 * Search for users to start a conversation with
 * @param {string} query - The search query
 */
export const searchUsers = (query) =>
  axios.get('/users', {
    params: { search: query },
    withCredentials: true
  });