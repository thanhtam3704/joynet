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
        <img 
          v-if="conversation && conversation.recipientAvatar"
          :src="conversation && conversation.recipientAvatar ? `http://localhost:3000/uploads/user/${conversation.recipientAvatar}` : ''" 
          alt="Avatar"
        />
        <img 
          v-else
          src="@/assets/defaultProfile.png" 
          alt="Default Avatar"
        />
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
  background-color: #fff9fb;
}

.conversation-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid #f8e0e6;
  
  &:hover {
    background-color: #fef1f6;
  }
  
  &.active {
    background-color: #fce4ec;
  }
}

.conversation-avatar {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  margin-right: 12px;
  
  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }
  
  .unread-badge {
    position: absolute;
    bottom: 0;
    right: 0;
    background-color: #f06292;
    color: white;
    border-radius: 50%;
    min-width: 18px;
    height: 18px;
    font-size: 11px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #fff9fb;
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
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  
  &.unread {
    font-weight: 700;
    color: #e91e63;
  }
}

.conversation-time {
  font-size: 12px;
  color: #e91e63;
  flex-shrink: 0;
  margin-left: 8px;
  
  &.unread {
    font-weight: 600;
    color: #d81b60;
  }
}

.conversation-message {
  font-size: 14px;
  color: #8e8e8e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  
  &.unread {
    color: #e91e63;
    font-weight: 500;
  }
}

.no-conversations {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  color: #e91e63;
  font-size: 14px;
  background-color: #fff9fb;
}
</style>