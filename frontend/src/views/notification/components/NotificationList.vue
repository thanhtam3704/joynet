<template>
  <div class="notification-dropdown" v-if="isVisible" @click.stop>
    <div class="notification-header">
      <h3>Thông báo</h3>
      <button 
        class="mark-all-read" 
        @click="markAllAsRead" 
        v-if="hasUnread"
        :disabled="markingAllAsRead"
      >
        {{ markingAllAsRead ? 'Đang xử lý...' : 'Đánh dấu tất cả đã đọc' }}
      </button>
    </div>
    
    <div class="notification-content">
      <div v-if="loading" class="loading">
        <div class="loader"></div>
        <p>Đang tải thông báo...</p>
      </div>
      
      <div v-else-if="notifications.length === 0" class="empty-state">
        <div class="empty-icon">
          <i class="material-icons">notifications_none</i>
        </div>
        <p>Không có thông báo nào</p>
      </div>
      
      <div v-else class="notification-list">
        <NotificationItem 
          v-for="notification in notifications" 
          :key="notification._id"
          :notification="notification"
          @mark-read="markAsRead"
          @click="onNotificationClick"
          @open-post-modal="handleOpenPostModal"
        />
      </div>
      
      <!-- Load More Footer -->
      <div class="notification-footer" v-if="notifications.length > 0 && canShowMore && !showingMore">
        <button 
          class="load-more-btn" 
          @click="handleShowMore"
          :disabled="loadingMore"
        >
          <span v-if="!loadingMore">Xem thông báo trước đó</span>
          <div v-else class="loading-spinner">
            <div class="spinner"></div>
            <span>Đang tải...</span>
          </div>
        </button>
      </div>
      
      <!-- Thông báo đã hiển thị hết -->
      <div class="notification-footer" v-if="showingMore && !hasMore && allNotifications.length > 5">
        <div class="all-loaded-message">
          Đã hiển thị tất cả thông báo
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import NotificationItem from './NotificationItem.vue';

export default {
  name: 'NotificationList',
  components: {
    NotificationItem
  },
  props: {
    isVisible: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      loading: false,
      markingAllAsRead: false,
      loadingMore: false,
      currentPage: 1,
      limit: 5, // Giới hạn 5 notifications như Facebook
      showingMore: false // Để track xem đang hiển thị nhiều hơn không
    };
  },
  computed: {
    allNotifications() {
      return this.$store.getters.recentNotifications || [];
    },
    notifications() {
      // Nếu chưa bấm "xem thêm", chỉ hiển thị 5 cái đầu
      if (!this.showingMore) {
        return this.allNotifications.slice(0, 5);
      }
      // Nếu đã bấm "xem thêm", hiển thị tất cả
      return this.allNotifications;
    },
    hasUnread() {
      return this.allNotifications.some(n => !n.isRead);
    },
    hasMore() {
      return this.$store.state.notifications.hasMore;
    },
    canShowMore() {
      // Có thể hiển thị thêm nếu có nhiều hơn 5 notifications hoặc còn dữ liệu từ server
      return this.allNotifications.length > 5 || this.hasMore;
    }
  },
  watch: {
    isVisible(visible) {
      if (visible) {
        // Luôn reset về trang 1 khi mở dropdown
        this.currentPage = 1;
        this.showingMore = false; // Reset về chế độ hiển thị 6 cái đầu
        // Load notifications từ đầu
        this.loadNotifications();
      }
    }
  },
  methods: {
    async loadNotifications() {
      if (this.loading) return;
      
      this.loading = true;
      try {
        await this.$store.dispatch('loadNotifications', { 
          page: this.currentPage, 
          limit: this.limit 
        });
      } catch (error) {
        console.error('Error loading notifications:', error);
      } finally {
        this.loading = false;
      }
    },
    
    async loadMoreNotifications() {
      if (this.loadingMore || !this.hasMore) return;
      
      this.loadingMore = true;
      try {
        this.currentPage += 1;
        await this.$store.dispatch('loadNotifications', { 
          page: this.currentPage, 
          limit: this.limit 
        });
      } catch (error) {
        console.error('Error loading more notifications:', error);
        this.currentPage -= 1; // Rollback page if error
      } finally {
        this.loadingMore = false;
      }
    },
    
    async markAsRead(notificationId) {
      try {
        await this.$store.dispatch('markNotificationAsRead', notificationId);
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    },
    
    async markAllAsRead() {
      if (this.markingAllAsRead) return;
      
      this.markingAllAsRead = true;
      try {
        await this.$store.dispatch('markAllNotificationsAsRead');
      } catch (error) {
        console.error('Error marking all notifications as read:', error);
      } finally {
        this.markingAllAsRead = false;
      }
    },
    
    onNotificationClick(notification) {
      // Đóng dropdown
      this.$emit('close');
    },
    
    handleOpenPostModal(data) {
      console.log('Handling open post modal:', data);
      // Emit event lên parent (TheHeader) để mở modal
      this.$emit('open-post-modal', data);
      // Đóng dropdown notification
      this.$emit('close');
    },

    async handleShowMore() {
      if (!this.showingMore) {
        // Lần đầu bấm: hiển thị tất cả notifications hiện có và load thêm nếu còn
        this.showingMore = true;
        
        // Nếu còn dữ liệu từ server thì load luôn
        if (this.hasMore) {
          await this.loadMoreNotifications();
        }
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.notification-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  width: 400px;
  max-width: 90vw;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  border: 1px solid #dbdbdb;
  z-index: 1000;
  max-height: 80vh;
  overflow: hidden;
  margin-top: 8px;
  
  // Arrow pointer
  &::before {
    content: '';
    position: absolute;
    top: -6px;
    right: 20px;
    width: 12px;
    height: 12px;
    background: white;
    border: 1px solid #dbdbdb;
    border-bottom: none;
    border-right: none;
    transform: rotate(45deg);
  }
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #efefef;
  background: #fafafa;
  
  h3 {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
    color: #262626;
  }
  
  .mark-all-read {
    background: none;
    border: none;
    color: #0095f6;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.2s;
    
    &:hover:not(:disabled) {
      background: #f0f8ff;
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}

.notification-content {
  max-height: 60vh;
  overflow-y: auto;
  
  .loading {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 40px 20px;
    
    .loader {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #0095f6;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      animation: spin 1s linear infinite;
      margin-bottom: 12px;
    }
    
    p {
      margin: 0;
      color: #8e8e8e;
      font-size: 14px;
    }
  }
  
  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: #8e8e8e;
    
    .empty-icon {
      font-size: 48px;
      margin-bottom: 12px;
      
      i {
        font-size: inherit;
        color: #c7c7c7;
      }
    }
    
    p {
      margin: 0;
      font-size: 16px;
    }
  }
}

.notification-list {
  .notification-item:last-child {
    border-bottom: none;
  }
}

.notification-footer {
  padding: 12px 20px;
  border-top: 1px solid #efefef;
  background: #fafafa;
  
  .load-more-btn {
    width: 100%;
    padding: 12px 16px;
    background: none;
    border: none;
    border-radius: 8px;
    color: #1877f2;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:hover:not(:disabled) {
      background: #f2f3f4;
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .loading-spinner {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #f3f3f3;
      border-top: 2px solid #1877f2;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
  }
  
  .all-loaded-message {
    text-align: center;
    padding: 12px 16px;
    color: #8e8e8e;
    font-size: 14px;
    font-style: italic;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// Custom scrollbar
.notification-content::-webkit-scrollbar {
  width: 6px;
}

.notification-content::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.notification-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.notification-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

// Mobile responsive
@media (max-width: 768px) {
  .notification-dropdown {
    width: calc(100vw - 32px);
    max-width: none;
    right: 16px;
  }
}
</style>