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
  padding: 16px;
  display: flex;
  flex-direction: column;
  background-color: #fff9fb;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: #f8bbd0;
    border-radius: 4px;
  }
}

.messages-date-separator {
  text-align: center;
  margin: 8px 0 16px;
  color: #ec407a;
  font-size: 12px;
  position: relative;
  
  &::before, &::after {
    content: "";
    position: absolute;
    top: 50%;
    width: 30%;
    height: 1px;
    background-color: #f8bbd0;
  }
  
  &::before {
    left: 0;
  }
  
  &::after {
    right: 0;
  }
}

.message-group {
  margin-bottom: 12px;
}

.message-timestamp {
  text-align: center;
  margin: 8px 0;
  color: #ec407a;
  font-size: 11px;
}

.message-bubble-container {
  display: flex;
  align-items: flex-end;
  margin-bottom: 4px;
  
  &.outgoing {
    justify-content: flex-end;
  }
}

.message-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  margin-right: 8px;
  flex-shrink: 0;
  
  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }
}

.message-bubble {
  padding: 12px 16px;
  border-radius: 24px;
  max-width: 65%;
  word-break: break-word;
  font-size: 14px;
  
  &.incoming {
    background-color: #fce4ec;
    color: #262626;
    border-bottom-left-radius: 4px;
  }
  
  &.outgoing {
    background-color: #f06292;
    color: white;
    border-bottom-right-radius: 4px;
  }
}

.messages-end {
  height: 1px;
}

.message-image {
  margin-bottom: 4px;
  
  img {
    max-width: 250px;
    max-height: 300px;
    width: auto;
    height: auto;
    border-radius: 12px;
    object-fit: cover;
    cursor: pointer;
    transition: transform 0.2s ease;
    
    &:hover {
      transform: scale(1.02);
    }
    
    &:loading {
      background-color: #f5f5f5;
      min-height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
}

.message-file {
  display: flex;
  align-items: center;
  
  i {
    margin-right: 8px;
  }
  
  span {
    font-size: 13px;
  }
}

.message-status {
  display: flex;
  align-items: center;
  margin-top: 4px;
  
  .sending {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
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
</style>