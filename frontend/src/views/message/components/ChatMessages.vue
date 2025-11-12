<template>
  <div class="chat-messages" ref="messageContainer">
    <div class="messages-date-separator" v-if="messages.length > 0">
      {{ formatDate(messages[0].timestamp) }}
    </div>
    
    <div v-for="(message, index) in groupedMessages" :key="message && message._id ? message._id : index" class="message-group">
      <div class="message-timestamp" v-if="shouldShowTimestamp(index)">
        {{ message && message.timestamp ? formatTime(message.timestamp) : '' }}
      </div>
      
      <div 
        class="message-bubble-container"
        :class="{ 'outgoing': isMyMessage(message) }"
      >
        <div class="message-avatar" v-if="message && !isMyMessage(message)">
          {{ logMessageForDebug(message) }}
          <img 
            v-if="message && message.senderAvatar"
            :src="getAvatarUrl(message.senderAvatar)" 
            alt="Avatar"
            referrerpolicy="no-referrer"
            crossorigin="anonymous"
            @error="handleAvatarError"
          />
          <img 
            v-else
            src="@/assets/defaultProfile.png" 
            alt="Default Avatar" 
          />
        </div>
        <div 
          class="message-bubble"
          :class="{ 
            'outgoing': isMyMessage(message),
            'incoming': !isMyMessage(message)
          }"
        >
          <div v-if="message && message.messageType === 'image'" class="message-image">
            <img 
              :src="message && (message.fileUrl || (message.file ? `http://localhost:3000/uploads/${message.file}` : ''))" 
              alt="Image" 
              @load="handleImageLoad"
              @error="handleImageError"
            />
            <div v-if="!message.fileUrl && !message.file" class="debug-info" style="color: red; font-size: 10px;">
              No image URL found
            </div>
          </div>
          <div v-else-if="message && message.messageType === 'file'" class="message-file">
            <i class="material-icons">attach_file</i>
            <span>{{ message && (message.fileName || message.file) || '' }}</span>
          </div>
          <span v-if="message && message.content">{{ message.content }}</span>
          <div v-if="message && message.isSending" class="message-status">
            <i class="material-icons sending">schedule</i>
          </div>
        </div>
      </div>
    </div>
    
    <div class="messages-end" ref="messagesEnd"></div>
  </div>
</template>

<script>
export default {
  name: 'ChatMessages',
  props: {
    messages: {
      type: Array,
      default: () => []
    },
    currentUserId: {
      type: String,
      required: true
    }
  },
  computed: {
    // Group messages by time (messages within 2 minutes of each other)
    groupedMessages() {
      return this.messages;
    }
  },
  methods: {
    isMyMessage(message) {
      if (!message) return false;
      
      // Ưu tiên sử dụng flag trực tiếp nếu có
      if (typeof message.isMyMessage === 'boolean') {
        console.log(`🎯 Using flag - Message "${message.content}" is ${message.isMyMessage ? 'MINE' : 'THEIRS'}`);
        return message.isMyMessage;
      }
      
      // Fallback về comparison logic
      if (!message.senderId || !this.currentUserId) {
        console.log('Debug: Missing data', { 
          message: !!message, 
          senderId: message?.senderId, 
          currentUserId: this.currentUserId 
        });
        return false;
      }
      
      // Convert both to string để đảm bảo so sánh đúng
      const isMe = String(message.senderId) === String(this.currentUserId);
      console.log('Debug: Message comparison', { 
        senderId: message.senderId, 
        currentUserId: this.currentUserId, 
        isMe,
        senderType: typeof message.senderId,
        currentType: typeof this.currentUserId
      });
      
      return isMe;
    },
    formatDate(timestamp) {
      if (!timestamp) return '';
      
      const date = new Date(timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      ) {
        return 'Hôm nay';
      } else if (
        date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear()
      ) {
        return 'Hôm qua';
      } else {
        return date.toLocaleDateString('vi-VN', { 
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        });
      }
    },
    formatTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    },
    shouldShowTimestamp(index) {
      // Show timestamp for first message or if more than 15 minutes passed since previous message
      if (index === 0) return true;
      
      const currentMsg = this.messages[index];
      const prevMsg = this.messages[index - 1];
      
      if (!currentMsg.timestamp || !prevMsg.timestamp) return false;
      
      const currentTime = new Date(currentMsg.timestamp).getTime();
      const prevTime = new Date(prevMsg.timestamp).getTime();
      
      return (currentTime - prevTime) > 15 * 60 * 1000; // 15 minutes
    },
    handleImageLoad() {
      console.log('✅ Image loaded successfully');
      this.scrollToBottom();
    },
    handleImageError(event) {
      console.error('❌ Image load error:', event.target.src);
    },
    scrollToBottom() {
      if (this.$refs.messagesEnd) {
        this.$refs.messagesEnd.scrollIntoView({ behavior: 'smooth' });
      }
    },
    handleImageLoad() {
      // Scroll to bottom after image loads to show the complete message
      this.$nextTick(() => {
        this.scrollToBottom();
      });
    },
    handleImageError(event) {
      console.error('Error loading image:', event);
      // Có thể hiển thị placeholder image hoặc error message
    },
    
    getAvatarUrl(avatarPath) {
      console.log('🖼️ Getting avatar URL for:', avatarPath, typeof avatarPath);
      
      if (!avatarPath) {
        console.log('❌ No avatar path provided');
        return '';
      }
      
      // Nếu đã là absolute URL (bắt đầu bằng http/https)
      if (avatarPath.startsWith('http')) {
        console.log('✅ Using Google/absolute URL directly:', avatarPath);
        return avatarPath; // Trả về nguyên URL cho Google OAuth avatar
      }
      
      // Nếu là relative path (uploaded avatar), thêm base URL  
      const fullUrl = `http://localhost:3000/uploads/user/${avatarPath}`;
      console.log('✅ Constructed local URL:', fullUrl);
      return fullUrl;
    },
    
    handleAvatarError(event) {
      console.error('❌ Avatar load error:', event.target.src);
      console.log('🔄 Falling back to default avatar...');
      
      // Prevent infinite error loop
      if (event.target.src.includes('defaultProfile.png')) {
        return;
      }
      
      // Fallback to default avatar
      event.target.src = require('@/assets/defaultProfile.png');
    },
    
    logMessageForDebug(message) {
      return ''; // Method for debugging, now cleaned up
    }
  },
  updated() {
    this.scrollToBottom();
  },
  mounted() {
    this.scrollToBottom();
  }
};
</script>

<style lang="scss" scoped>
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, rgba(250, 250, 250, 0.5) 0%, rgba(255, 255, 255, 0.5) 100%);
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #5568d3 0%, #63428b 100%);
  }
}

.messages-date-separator {
  text-align: center;
  margin: 1rem 0 1.25rem;
  color: #667eea;
  font-size: 0.75rem;
  font-weight: 600;
  position: relative;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  &::before, &::after {
    content: "";
    position: absolute;
    top: 50%;
    width: calc(35% - 10px);
    height: 1px;
    background: linear-gradient(to right, transparent, rgba(102, 126, 234, 0.3));
  }
  
  &::before {
    left: 0;
  }
  
  &::after {
    right: 0;
    background: linear-gradient(to left, transparent, rgba(102, 126, 234, 0.3));
  }
}

.message-group {
  margin-bottom: 1rem;
}

.message-timestamp {
  text-align: center;
  margin: 0.75rem 0;
  color: #94a3b8;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.message-bubble-container {
  display: flex;
  align-items: flex-end;
  margin-bottom: 0.5rem;
  animation: messageSlideIn 0.3s ease;
  
  &.outgoing {
    justify-content: flex-end;
  }
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-right: 10px;
  flex-shrink: 0;
  border: 2px solid rgba(102, 126, 234, 0.15);
  
  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }
}

.message-bubble {
  padding: 0.75rem 1rem;
  border-radius: 18px;
  max-width: 70%;
  word-break: break-word;
  font-size: 0.9375rem;
  line-height: 1.5;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
  
  &.incoming {
    background: white;
    color: #1e293b;
    border-bottom-left-radius: 4px;
    border: 1px solid rgba(226, 232, 240, 0.6);
  }
  
  &.outgoing {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-bottom-right-radius: 4px;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    
    &:hover {
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
  }
}

.messages-end {
  height: 1px;
}

.message-image {
  margin-bottom: 0.5rem;
  
  img {
    max-width: 280px;
    max-height: 350px;
    width: auto;
    height: auto;
    border-radius: 14px;
    object-fit: cover;
    cursor: pointer;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    
    &:hover {
      transform: scale(1.03);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
    }
    
    &:loading {
      background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
      min-height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
}

.message-file {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  
  i {
    margin-right: 10px;
    font-size: 20px;
  }
  
  span {
    font-size: 0.8125rem;
    font-weight: 500;
  }
}

.message-status {
  display: flex;
  align-items: center;
  margin-top: 0.25rem;
  
  .sending {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
    animation: rotate 1s linear infinite;
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .chat-messages {
    padding: 1rem;
  }
  
  .message-bubble {
    max-width: 80%;
    font-size: 0.875rem;
    padding: 0.625rem 0.875rem;
  }
  
  .message-image img {
    max-width: 240px;
    max-height: 300px;
  }
}

@media (max-width: 480px) {
  .chat-messages {
    padding: 0.75rem;
  }
  
  .message-bubble {
    max-width: 85%;
    font-size: 0.8125rem;
  }
  
  .message-avatar {
    width: 28px;
    height: 28px;
    margin-right: 8px;
  }
  
  .message-image img {
    max-width: 200px;
    max-height: 250px;
  }
}
</style>