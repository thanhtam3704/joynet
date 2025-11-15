<template>
  <div class="chat-header">
    <div class="chat-header-user">
      <div class="chat-header-avatar">
        <!-- Group chat: prefer custom group avatar, else show group icon -->
        <template v-if="conversation && conversation.isGroup">
          <img
            v-if="conversation.groupAvatar"
            :src="`http://localhost:3000/uploads/user/${conversation.groupAvatar}`"
            alt="Group Avatar"
          />
          <div v-else class="group-avatar-icon">
            <i class="material-icons">groups</i>
          </div>
        </template>
        <!-- 1-1 chat avatar -->
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
      </div>
      <div class="chat-header-info">
        <div class="chat-header-name">{{ getConversationTitle() }}</div>
        <div class="chat-header-status">{{ getActivityStatus() }}</div>
      </div>
    </div>
    <div class="chat-header-actions">
      <button class="chat-header-button" @click="startVideoCall" title="Gọi video">
        <i class="material-icons">videocam</i>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ChatHeader',
  props: {
    conversation: {
      type: Object,
      required: true
    }
  },
  methods: {
    startVideoCall() {
      this.$emit('start-video-call');
    },
    getConversationTitle() {
      if (!this.conversation) return 'Unknown User';
      if (this.conversation.isGroup) {
        return this.conversation.groupName || this.conversation.recipientName || 'Nhóm chat';
      }
      return this.conversation.recipientName || 'Unknown User';
    },
    getActivityStatus() {
      if (!this.conversation) return '';
      
      // Nếu không có lastSeen hoặc lastSeen không hợp lệ thì không hiển thị gì
      if (this.conversation.isGroup || !this.conversation.recipientLastSeen) {
        return '';
      }
      
      const lastSeen = new Date(this.conversation.recipientLastSeen);
      const now = new Date();
      
      // Kiểm tra lastSeen có hợp lệ không
      if (isNaN(lastSeen.getTime())) {
        return '';
      }
      
      const diffMs = now - lastSeen;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      // Nếu lastSeen trong tương lai (không hợp lý) thì không hiển thị
      if (diffMs < 0) {
        return '';
      }
      
      // Chỉ hiển thị "Đang hoạt động" nếu isOnline = true VÀ lastSeen trong vòng 5 phút
      if (this.conversation.recipientIsOnline && diffMinutes <= 5) {
        return 'Đang hoạt động';
      }
      
      // Không hiển thị gì nếu lâu quá không online (hơn 24 giờ)
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours > 24) {
        return '';
      }
      
      // Hiển thị trạng thái cho những người có activity trong 24 giờ qua
      // Không hiển thị nếu dưới 1 phút (tránh "0 phút trước")
      if (diffMinutes < 1) {
        return '';
      } else if (diffMinutes < 60) {
        return `Hoạt động ${diffMinutes} phút trước`;
      } else {
        return `Hoạt động ${diffHours} giờ trước`;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.chat-header {
  height: 68px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}

.chat-header-user {
  display: flex;
  align-items: center;
}

.chat-header-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  margin-right: 14px;
  border: 2px solid rgba(102, 126, 234, 0.2);
  transition: all 0.2s ease;
  flex-shrink: 0;
  
  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }
  
  &:hover {
    border-color: rgba(102, 126, 234, 0.4);
    transform: scale(1.05);
  }
}

/* Group Avatar Icon (match ConversationList style) */
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
    font-size: 24px;
  }
}

.chat-header-info {
  display: flex;
  flex-direction: column;
}

.chat-header-name {
  font-size: 1rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 2px;
}

.chat-header-status {
  font-size: 0.8125rem;
  color: #667eea;
  font-weight: 500;
}

.chat-header-actions {
  display: flex;
  gap: 0.5rem;
}

.chat-header-button {
  background: #f1f5f9;
  border: none;
  cursor: pointer;
  color: #667eea;
  font-size: 24px;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
  }
  
  i {
    font-size: 20px;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .chat-header {
    height: 60px;
    padding: 0 1rem;
  }
  
  .chat-header-avatar {
    width: 38px;
    height: 38px;
    margin-right: 12px;
  }
  
  .chat-header-name {
    font-size: 0.9375rem;
  }
  
  .chat-header-status {
    font-size: 0.75rem;
  }
}

@media (max-width: 480px) {
  .chat-header {
    padding: 0 0.75rem;
  }
  
  .chat-header-avatar {
    width: 34px;
    height: 34px;
    margin-right: 10px;
  }
  
  .chat-header-name {
    font-size: 0.875rem;
  }
  
  .chat-header-button {
    width: 36px;
    height: 36px;
    
    i {
      font-size: 18px;
    }
  }
}
</style>