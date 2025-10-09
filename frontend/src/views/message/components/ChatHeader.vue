<template>
  <div class="chat-header">
    <div class="chat-header-user">
      <div class="chat-header-avatar">
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
      </div>
      <div class="chat-header-info">
        <div class="chat-header-name">{{ conversation && conversation.recipientName || 'Unknown User' }}</div>
        <div class="chat-header-status">{{ getActivityStatus() }}</div>
      </div>
    </div>
    <div class="chat-header-actions">
      <button class="chat-header-button">
        <i class="material-icons">phone</i>
      </button>
      <button class="chat-header-button">
        <i class="material-icons">videocam</i>
      </button>
      <button class="chat-header-button">
        <i class="material-icons">info</i>
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
    getActivityStatus() {
      if (!this.conversation) return '';
      
      // Debug log
      console.log('ChatHeader conversation data:', {
        recipientLastSeen: this.conversation.recipientLastSeen,
        recipientIsOnline: this.conversation.recipientIsOnline,
        recipientName: this.conversation.recipientName
      });
      
      // Nếu không có lastSeen hoặc lastSeen không hợp lệ thì không hiển thị gì
      if (!this.conversation.recipientLastSeen) {
        console.log('No lastSeen data, returning empty');
        return '';
      }
      
      const lastSeen = new Date(this.conversation.recipientLastSeen);
      const now = new Date();
      
      // Kiểm tra lastSeen có hợp lệ không
      if (isNaN(lastSeen.getTime())) {
        console.log('Invalid lastSeen date, returning empty');
        return '';
      }
      
      const diffMs = now - lastSeen;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      console.log('Time calculation:', {
        lastSeen: lastSeen.toISOString(),
        now: now.toISOString(),
        diffMs: diffMs,
        diffMinutes: diffMinutes,
        isOnline: this.conversation.recipientIsOnline
      });
      
      // Nếu lastSeen trong tương lai (không hợp lý) thì không hiển thị
      if (diffMs < 0) {
        console.log('LastSeen in future, returning empty');
        return '';
      }
      
      // Chỉ hiển thị "Đang hoạt động" nếu isOnline = true VÀ lastSeen trong vòng 5 phút
      if (this.conversation.recipientIsOnline && diffMinutes <= 5) {
        return 'Đang hoạt động';
      }
      
      // Không hiển thị gì nếu lâu quá không online (hơn 24 giờ)
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours > 24) {
        console.log('More than 24 hours, returning empty');
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
  height: 60px;
  border-bottom: 1px solid #f8e0e6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background-color: #fef1f6;
}

.chat-header-user {
  display: flex;
  align-items: center;
}

.chat-header-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-right: 12px;
  
  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }
}

.chat-header-info {
  display: flex;
  flex-direction: column;
}

.chat-header-name {
  font-size: 16px;
  font-weight: 600;
}

.chat-header-status {
  font-size: 12px;
  color: #ec407a;
}

.chat-header-actions {
  display: flex;
  gap: 16px;
}

.chat-header-button {
  background: none;
  border: none;
  cursor: pointer;
  color: #e91e63;
  font-size: 24px;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: #f06292;
  }
}


</style>