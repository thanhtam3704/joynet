import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this._wrappedCallbacks = new Map(); // Store wrapped callbacks for cleanup
  }

  connect() {
    const token = localStorage.getItem('token');
    
    if (!token) {
      return;
    }
    
    if (this.isConnected) {
      return;
    }

    this.socket = io(process.env.VUE_APP_SOCKET_URL || 'http://localhost:3000', {
      auth: {
        token: token
      },
      transports: ['websocket'],
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('🔌 [SocketService] Socket connected');
      console.log('🔌 [SocketService] Socket ID:', this.socket.id);
      this.isConnected = true;
      
      // DEBUG: Listen to ALL events at socket level
      this.socket.onAny((eventName, ...args) => {
        if (eventName.includes('video-call')) {
          console.log('🚨 [SocketService] Video call event:', eventName, args);
        }
      });
      
      // CRITICAL: Setup video-call:cancelled listener at socket level
      // This ensures event is received even if component listener fails
      this.socket.on('video-call:cancelled', (data) => {
        console.log('🔴🔴🔴 [SocketService] VIDEO-CALL:CANCELLED RECEIVED AT SOCKET LEVEL');
        console.log('🔴 [SocketService] Data:', JSON.stringify(data));
        console.log('🔴 [SocketService] Time:', new Date().toISOString());
        
        // Dispatch browser event as additional fallback
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('video-call-cancelled', { detail: data }));
          console.log('🔴 [SocketService] Dispatched browser event: video-call-cancelled');
        }
      });
      
      // Re-register all listeners after reconnect
      this._reregisterListeners();
      
      // ✅ Emit a custom event to notify that socket is ready
      // This allows components to setup their listeners AFTER connection is established
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('socket-connected'));
      }
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 [SocketService] Socket disconnected');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 [SocketService] Socket connect error:', error);
      this.isConnected = false;
      
      // ✅ If authentication error, clear token and disconnect
      if (error.message && error.message.includes('Authentication')) {
        console.error('❌ [SocketService] Authentication failed, clearing token');
        localStorage.removeItem('token');
        this.disconnect();
        
        // Redirect to login if needed
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          console.log('🔄 [SocketService] Redirecting to login...');
          window.location.href = '/login';
        }
      }
    });

    return this.socket;
  }
  
  _reregisterListeners() {
    if (!this.socket || this._wrappedCallbacks.size === 0) {
      return;
    }
    
    console.log(`🔄 [SocketService] Re-registering ${this._wrappedCallbacks.size} listeners after reconnect`);
    
    // Re-register all wrapped callbacks
    for (const [key, value] of this._wrappedCallbacks) {
      const eventName = key.split('_')[0]; // Extract event name from key
      this.socket.on(eventName, value.wrapped);
      console.log(`🔄 [SocketService] Re-registered ${eventName} listener`);
    }
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
      // Remove any existing listener first to prevent duplicates
      this.socket.off('newMessage');
      this.socket.on('newMessage', (data) => {
        console.log('📨 [SocketService] newMessage event received:', data);
        console.log('📨 [SocketService] Message content:', data.message?.content);
        callback(data);
      });
    } else {
      console.error('❌ [SocketService] Cannot set up newMessage listener - no socket');
    }
  }

  // Listen for new message notifications (for unread count updates)
  onNewMessageNotification(callback) {
    if (this.socket) {
      console.log('🎧 [SocketService] Setting up newMessageNotification listener');
      // Remove any existing listener first to prevent duplicates
      this.socket.off('newMessageNotification');
      this.socket.on('newMessageNotification', (data) => {
        console.log('🔔 [SocketService] newMessageNotification event received:', data);
        callback(data);
      });
    } else {
      console.error('❌ [SocketService] Cannot set up newMessageNotification listener - no socket');
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

  // Reaction events
  onMessageReactionUpdated(callback) {
    if (this.socket) {
      console.log('👍 [SocketService] Setting up messageReactionUpdated listener');
      this.socket.off('messageReactionUpdated');
      this.socket.on('messageReactionUpdated', (data) => {
        console.log('👍 [SocketService] messageReactionUpdated event received:', data);
        callback(data);
      });
    }
  }

  // GROUP CHAT EVENTS
  
  // Listen for group created
  onGroupCreated(callback) {
    if (this.socket) {
      console.log('👥 [SocketService] Setting up groupCreated listener');
      this.socket.on('groupCreated', (data) => {
        console.log('👥 [SocketService] Group created received:', data);
        callback(data);
      });
    }
  }

  // Listen for member added
  onMemberAdded(callback) {
    if (this.socket) {
      console.log('➕ [SocketService] Setting up memberAdded listener');
      this.socket.on('memberAdded', (data) => {
        console.log('➕ [SocketService] Member added received:', data);
        callback(data);
      });
    }
  }

  // Listen for member removed
  onMemberRemoved(callback) {
    if (this.socket) {
      console.log('➖ [SocketService] Setting up memberRemoved listener');
      this.socket.on('memberRemoved', (data) => {
        console.log('➖ [SocketService] Member removed received:', data);
        callback(data);
      });
    }
  }

  // Listen for group updated
  onGroupUpdated(callback) {
    if (this.socket) {
      console.log('🔄 [SocketService] Setting up groupUpdated listener');
      this.socket.on('groupUpdated', (data) => {
        console.log('🔄 [SocketService] Group updated received:', data);
        callback(data);
      });
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
      if (callback) {
        // Find and remove the wrapped callback matching the original
        let removed = false;
        for (const [key, value] of this._wrappedCallbacks) {
          if (key.startsWith(`${event}_`) && value.original === callback) {
            this.socket.off(event, value.wrapped);
            this._wrappedCallbacks.delete(key);
            console.log(`🔇 [SocketService] Removed ${event} listener`);
            removed = true;
            break;
          }
        }
        if (!removed) {
          console.warn(`⚠️ [SocketService] Listener for ${event} not found, trying direct removal`);
          this.socket.off(event, callback);
        }
      } else {
        // Remove all listeners for this event
        this.socket.off(event);
        // Clean up wrapped callbacks for this event
        for (const [key] of this._wrappedCallbacks) {
          if (key.startsWith(`${event}_`)) {
            this._wrappedCallbacks.delete(key);
          }
        }
        console.log(`🔇 [SocketService] Removed all ${event} listeners`);
      }
    }
  }

  // Add generic on() method for any socket event
  on(event, callback) {
    if (this.socket && callback && typeof callback === 'function') {
      // Check if this exact callback is already registered by comparing function source
      const callbackSource = callback.toString();
      const callbackName = callback.name || 'anonymous';
      let alreadyRegistered = false;
      
      for (const [key, value] of this._wrappedCallbacks) {
        if (key.startsWith(`${event}_`) && value.original.toString() === callbackSource) {
          console.log(`⏭️ [SocketService] Listener for ${event} (${callbackName}) already registered, skipping`);
          alreadyRegistered = true;
          break;
        }
      }
      
      if (alreadyRegistered) {
        return;
      }
      
      console.log(`🎧 [SocketService] Setting up ${event} listener (${callbackName})`);
      
      // Wrap callback with error handler
      const wrappedCallback = (...args) => {
        try {
          console.log(`📨 [SocketService] Received ${event}:`, args);
          callback(...args);
        } catch (error) {
          console.error(`❌ [SocketService] Error in ${event} listener:`, error);
        }
      };
      
      // Store wrapped callback for cleanup
      const key = `${event}_${callbackName}_${Date.now()}`;
      this._wrappedCallbacks.set(key, { wrapped: wrappedCallback, original: callback });
      
      this.socket.on(event, wrappedCallback);
    } else {
      console.warn(`⚠️ [SocketService] Invalid callback for ${event}`);
    }
  }

  // Add generic emit() method for any socket event
  emit(event, data) {
    if (this.socket && this.getConnectionStatus()) {
      console.log(`📤 [SocketService] Emitting ${event}:`, data);
      this.socket.emit(event, data);
    } else {
      console.error(`❌ [SocketService] Cannot emit ${event} - socket not connected`);
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