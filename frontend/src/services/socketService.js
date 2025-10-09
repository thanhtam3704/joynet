import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect() {
    const token = localStorage.getItem('token');
    
    if (!token) {
      return;
    }
    
    if (this.isConnected) {
      return;
    }

    this.socket = io('http://localhost:3000', {
      auth: {
        token: token
      },
      transports: ['websocket'],
      autoConnect: true
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      this.isConnected = false;
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Check connection status
  getConnectionStatus() {
    return this.isConnected && this.socket && this.socket.connected;
  }

  // Message events
  joinConversation(conversationId) {
    if (this.socket && this.getConnectionStatus()) {
      this.socket.emit('join_conversation', conversationId);
    }
  }

  leaveConversation(conversationId) {
    console.log('🚪 Leaving conversation:', conversationId);
    if (this.socket && this.getConnectionStatus()) {
      this.socket.emit('leave_conversation', conversationId);
    }
  }

  onNewMessage(callback) {
    if (this.socket) {
      console.log('🎧 [SocketService] Setting up newMessage listener');
      this.socket.on('newMessage', (data) => {
        console.log('📨 [SocketService] Raw newMessage received:', data);
        callback(data);
      });
    } else {
      console.error('❌ [SocketService] Cannot set up newMessage listener - no socket');
    }
  }

  onConversationUpdated(callback) {
    if (this.socket) {
      this.socket.on('conversationUpdate', callback);
    }
  }

  // Typing indicators
  startTyping(conversationId) {
    if (this.socket && this.getConnectionStatus()) {
      this.socket.emit('typing_start', { conversationId });
    }
  }

  stopTyping(conversationId) {
    if (this.socket && this.getConnectionStatus()) {
      this.socket.emit('typing_stop', { conversationId });
    }
  }

  onUserTyping(callback) {
    if (this.socket) {
      this.socket.on('user_typing', callback);
    }
  }

  onUserStopTyping(callback) {
    if (this.socket) {
      this.socket.on('user_stop_typing', callback);
    }
  }

  // Notification events
  onNewNotification(callback) {
    if (this.socket) {
      this.socket.on('new_notification', callback);
    }
  }

  // Activity tracking
  updateActivity() {
    if (this.socket && this.getConnectionStatus()) {
      this.socket.emit('user_activity');
    }
  }

  // Remove listeners
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Clean up all listeners
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }
}

// Export singleton instance
export default new SocketService();