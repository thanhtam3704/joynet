<template>
  <div 
    class="notification-item" 
    :class="{ 'unread': !notification.isRead }"
    @click="handleClick"
  >
    <div class="notification-avatar">
      <img 
        v-if="notification.fromUser?.profilePicture" 
        :src="`http://localhost:3000/uploads/user/${notification.fromUser.profilePicture}`"
        :alt="notification.fromUser.displayName"
      >
      <img 
        v-else 
        src="@/assets/defaultProfile.png" 
        :alt="notification.fromUser?.displayName || 'Hệ thống'"
      >
      
      <!-- Icon cho loại thông báo -->
      <div class="notification-type-icon" :class="notification.type">
        <i class="material-icons">
          {{ getTypeIcon(notification.type) }}
        </i>
      </div>
    </div>
    
    <div class="notification-content">
      <div class="notification-text">
        <span class="user-name">{{ notification.fromUser?.displayName || 'Hệ thống' }}</span>
        <span class="action-text">{{ getActionText(notification.type) }}</span>
        <span v-if="notification.postId" class="post-context">bài viết của bạn</span>
      </div>
      
      <div class="notification-time">
        {{ formatTime(notification.createdAt) }}
      </div>
    </div>
    
    <!-- Preview image for post-related notifications -->
    <div 
      v-if="notification.postId && notification.postImage" 
      class="notification-preview"
    >
      <img :src="`http://localhost:3000/uploads/posts/${notification.postImage}`" alt="Post preview">
    </div>
    
    <!-- Unread indicator -->
    <div v-if="!notification.isRead" class="unread-indicator"></div>
  </div>
</template>

<script>
export default {
  name: 'NotificationItem',
  props: {
    notification: {
      type: Object,
      required: true
    }
  },
  methods: {
    getTypeIcon(type) {
      const icons = {
        like: 'favorite',
        comment: 'chat_bubble',
        follow: 'person_add',
        message: 'mail',
        post: 'photo',
        system: 'notifications'
      };
      return icons[type] || 'notifications';
    },
    
    getActionText(type) {
      const actions = {
        like: 'đã thích',
        comment: 'đã bình luận về',
        follow: 'đã bắt đầu theo dõi bạn',
        message: 'đã gửi tin nhắn cho bạn',
        post: 'đã đăng bài viết mới',
        system: 'thông báo hệ thống'
      };
      return actions[type] || '';
    },
    
    formatTime(timestamp) {
      const now = new Date();
      const time = new Date(timestamp);
      const diff = now - time;
      
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      const weeks = Math.floor(diff / 604800000);
      
      if (minutes < 1) return 'Vừa xong';
      if (minutes < 60) return `${minutes} phút`;
      if (hours < 24) return `${hours} giờ`;
      if (days < 7) return `${days} ngày`;
      if (weeks < 4) return `${weeks} tuần`;
      
      return time.toLocaleDateString('vi-VN');
    },
    
    handleClick() {
      // Đánh dấu đã đọc nếu chưa đọc
      if (!this.notification.isRead) {
        this.$emit('mark-read', this.notification._id);
      }
      
      // Điều hướng dựa trên loại thông báo
      this.navigateToNotification();
      
      this.$emit('click', this.notification);
    },
    
    navigateToNotification() {
      console.log('Handling notification click:', this.notification);
      
      switch (this.notification.type) {
        case 'like':
        case 'comment':
          if (this.notification.postId) {
            // Lấy ID từ object hoặc string
            const postId = typeof this.notification.postId === 'object' 
              ? this.notification.postId._id 
              : this.notification.postId;
            
            console.log('Opening post modal for:', postId);
            // Emit event để mở modal thay vì navigate
            this.$emit('open-post-modal', {
              postId: postId,
              notification: this.notification,
              // Nếu là comment, truyền thêm commentId để scroll đến
              commentId: this.notification.type === 'comment' ? this.notification.commentId : null,
              scrollToComment: this.notification.type === 'comment'
            });
          }
          break;
        case 'follow':
          if (this.notification.fromUser) {
            this.$router.push(`/profile/${this.notification.fromUser._id}`);
          }
          break;
        case 'message':
          this.$router.push('/messages');
          break;
        default:
          break;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.notification-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  border-bottom: 1px solid #efefef;
  
  &:hover {
    background: #f8f9fa;
  }
  
  &.unread {
    background: #e3f2fd;
    
    &:hover {
      background: #d1e7dd;
    }
  }
  
  &:last-child {
    border-bottom: none;
  }
}

.notification-avatar {
  position: relative;
  width: 44px;
  height: 44px;
  margin-right: 12px;
  flex-shrink: 0;
  
  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid #fff;
  }
  
  .notification-type-icon {
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #fff;
    
    i {
      font-size: 12px;
      color: white;
    }
    
    &.like {
      background: #ff4757;
    }
    
    &.comment {
      background: #3742fa;
    }
    
    &.follow {
      background: #2ed573;
    }
    
    &.message {
      background: #ff6b6b;
    }
    
    &.post {
      background: #5352ed;
    }
    
    &.system {
      background: #747d8c;
    }
  }
}

.notification-content {
  flex: 1;
  min-width: 0;
  
  .notification-text {
    font-size: 14px;
    line-height: 1.4;
    margin-bottom: 4px;
    
    .user-name {
      font-weight: 600;
      color: #262626;
    }
    
    .action-text {
      color: #262626;
      margin: 0 4px;
    }
    
    .post-context {
      color: #8e8e8e;
    }
  }
  
  .notification-time {
    font-size: 12px;
    color: #8e8e8e;
  }
}

.notification-preview {
  width: 44px;
  height: 44px;
  margin-left: 12px;
  flex-shrink: 0;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid #dbdbdb;
  }
}

.unread-indicator {
  position: absolute;
  top: 50%;
  left: 4px;
  width: 8px;
  height: 8px;
  background: #0095f6;
  border-radius: 50%;
  transform: translateY(-50%);
}

// Material Icons fallback
.material-icons {
  font-family: 'Material Icons';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
}
</style>