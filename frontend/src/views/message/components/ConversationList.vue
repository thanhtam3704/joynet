<template>
  <div class="conversation-list">
    <div 
      v-for="conversation in conversations" 
      :key="conversation && conversation._id ? conversation._id : Math.random()"
      class="conversation-item"
      :class="{ 'active': conversation && activeConversationId === conversation._id }"
      @click="conversation && conversation._id ? $emit('select-conversation', conversation._id) : null"
    >
      <div class="conversation-avatar">
        <!-- Group Chat Avatar - Icon nhóm -->
        <div v-if="conversation && conversation.isGroup" class="group-avatar-icon">
          <i class="material-icons">groups</i>
        </div>
        
        <!-- 1-1 Chat Avatar -->
        <template v-else>
          <img 
            v-if="conversation && conversation.recipientAvatar"
            :src="`http://localhost:3000/uploads/user/${conversation.recipientAvatar}`" 
            alt="Avatar"
          />
          <img 
            v-else
            src="@/assets/defaultProfile.png" 
            alt="Default Avatar"
          />
        </template>
        
        <span v-if="conversation && conversation.unread > 0" class="unread-badge">
          {{ conversation.unread }}
        </span>
      </div>
      <div class="conversation-details">
        <div class="conversation-info">
          <span class="conversation-name" :class="{ 'unread': conversation && conversation.unread > 0 }">{{ conversation && conversation.recipientName || 'Unknown' }}</span>
          <span class="conversation-time" :class="{ 'unread': conversation && conversation.unread > 0 }">{{ conversation && conversation.lastMessageTime ? formatTime(conversation.lastMessageTime) : '' }}</span>
        </div>
        <div class="conversation-message" :class="{ 'unread': conversation && conversation.unread > 0 }">
          {{ conversation && conversation.lastMessage ? truncateMessage(conversation.lastMessage) : 'Bạn đã gửi một ảnh' }}
        </div>
      </div>
    </div>
    <div v-if="conversations.length === 0" class="no-conversations">
      Không có cuộc trò chuyện nào
    </div>
  </div>
</template>

<script>
export default {
  name: 'ConversationList',
  props: {
    conversations: {
      type: Array,
      default: () => []
    },
    activeConversationId: {
      type: String,
      default: null
    }
  },
  methods: {
    formatTime(time) {
      if (!time) return '';
      
      const date = new Date(time);
      const now = new Date();
      const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        // Today: show time
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      } else if (diffDays < 7) {
        // Within a week: show day name
        return date.toLocaleDateString('vi-VN', { weekday: 'short' });
      } else {
        // Older: show date
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      }
    },
    truncateMessage(message) {
      if (!message) return '';
      return message.length > 30 ? message.substring(0, 30) + '...' : message;
    }
  }
};
</script>

<style lang="scss" scoped>
.conversation-list {
  flex: 1;
  overflow-y: auto;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 250, 250, 0.95) 100%);
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #5568d3 0%, #63428b 100%);
  }
}

.conversation-item {
  display: flex;
  align-items: center;
  padding: 0.875rem 1.25rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border-bottom: 1px solid rgba(226, 232, 240, 0.4);
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    transform: scaleY(0);
    transition: transform 0.2s ease;
  }
  
  &:hover {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
    transform: translateX(4px);
  }
  
  &.active {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
    
    &::before {
      transform: scaleY(1);
    }
    
    .conversation-name {
      color: #667eea;
      font-weight: 700;
    }
  }
}

.conversation-avatar {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  margin-right: 14px;
  flex-shrink: 0;
  border: 2px solid rgba(102, 126, 234, 0.15);
  transition: all 0.2s ease;
  
  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }
  
  .conversation-item:hover & {
    border-color: rgba(102, 126, 234, 0.35);
    transform: scale(1.05);
  }
  
  .unread-badge {
    position: absolute;
    bottom: -2px;
    right: -2px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 50%;
    min-width: 20px;
    height: 20px;
    font-size: 0.6875rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid white;
    box-shadow: 0 2px 6px rgba(102, 126, 234, 0.4);
    animation: pulse 2s ease-in-out infinite;
  }
}

/* Group Avatar Icon */
.group-avatar-icon {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  
  .material-icons {
    color: white;
    font-size: 28px;
  }
  
  .conversation-item:hover & {
    background: linear-gradient(135deg, #5568d3 0%, #63428b 100%);
  }
}
@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.conversation-details {
  flex: 1;
  min-width: 0;
}

.conversation-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.conversation-name {
  font-size: 0.9375rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #1e293b;
  transition: color 0.2s ease;
  
  &.unread {
    font-weight: 700;
    color: #667eea;
  }
}

.conversation-time {
  font-size: 0.75rem;
  color: #94a3b8;
  flex-shrink: 0;
  margin-left: 8px;
  font-weight: 500;
  
  &.unread {
    font-weight: 700;
    color: #667eea;
  }
}

.conversation-message {
  font-size: 0.875rem;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
  
  &.unread {
    color: #475569;
    font-weight: 600;
  }
}

.no-conversations {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 180px;
  color: #94a3b8;
  font-size: 0.9375rem;
  font-weight: 500;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 250, 250, 0.95) 100%);
}

/* Responsive */
@media (max-width: 480px) {
  .conversation-item {
    padding: 0.75rem 1rem;
  }
  
  .conversation-avatar {
    width: 48px;
    height: 48px;
    margin-right: 12px;
    
    .unread-badge {
      min-width: 18px;
      height: 18px;
      font-size: 0.625rem;
    }
  }
  
  .conversation-name {
    font-size: 0.875rem;
  }
  
  .conversation-message {
    font-size: 0.8125rem;
  }
}
</style>