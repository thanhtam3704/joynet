<template>
  <div class="notifications-page">
    <TheHeader />
    
    <div class="notifications-content">
      <div class="notifications-container">
        <div class="notifications-header">
          <h1>Thông báo</h1>
          <div class="header-actions">
            <button 
              class="mark-all-read-btn" 
              @click="markAllAsRead" 
              v-if="hasUnread"
              :disabled="markingAllAsRead"
            >
              {{ markingAllAsRead ? 'Đang xử lý...' : 'Đánh dấu tất cả đã đọc' }}
            </button>
          </div>
        </div>

        <div class="notifications-filters">
          <button 
            :class="['filter-btn', { active: selectedFilter === 'all' }]"
            @click="setFilter('all')"
          >
            Tất cả
          </button>
          <button 
            :class="['filter-btn', { active: selectedFilter === 'unread' }]"
            @click="setFilter('unread')"
          >
            Chưa đọc ({{ unreadCount }})
          </button>
          <button 
            :class="['filter-btn', { active: selectedFilter === 'like' }]"
            @click="setFilter('like')"
          >
            Lượt thích
          </button>
          <button 
            :class="['filter-btn', { active: selectedFilter === 'comment' }]"
            @click="setFilter('comment')"
          >
            Bình luận
          </button>
          <button 
            :class="['filter-btn', { active: selectedFilter === 'follow' }]"
            @click="setFilter('follow')"
          >
            Theo dõi
          </button>
        </div>

        <div class="notifications-list" v-if="!loading">
          <div v-if="filteredNotifications.length === 0" class="empty-state">
            <div class="empty-icon">
              <i class="material-icons">notifications_none</i>
            </div>
            <h3>Không có thông báo nào</h3>
            <p v-if="selectedFilter === 'unread'">Tất cả thông báo đã được đọc</p>
            <p v-else-if="selectedFilter !== 'all'">Không có thông báo loại này</p>
            <p v-else>Bạn sẽ nhận được thông báo khi có hoạt động mới</p>
          </div>

          <div v-else class="notification-items">
            <NotificationItem
              v-for="notification in filteredNotifications"
              :key="notification._id"
              :notification="notification"
              @mark-read="markAsRead"
              @click="onNotificationClick"
            />

            <!-- Load More Button -->
            <div class="load-more-container" v-if="hasMore">
              <button 
                class="load-more-btn" 
                @click="loadMoreNotifications"
                :disabled="loadingMore"
              >
                {{ loadingMore ? 'Đang tải...' : 'Tải thêm thông báo' }}
              </button>
            </div>
          </div>
        </div>

        <div v-else class="loading-container">
          <div class="loader"></div>
          <p>Đang tải thông báo...</p>
        </div>
      </div>
    </div>

    <TheFooter />
  </div>
</template>

<script>
import TheHeader from '@/components/TheHeader.vue';
import TheFooter from '@/components/TheFooter.vue';
import NotificationItem from './components/NotificationItem.vue';

export default {
  name: 'NotificationsPage',
  components: {
    TheHeader,
    TheFooter,
    NotificationItem
  },
  data() {
    return {
      selectedFilter: 'all',
      markingAllAsRead: false,
      loadingMore: false
    };
  },
  computed: {
    notifications() {
      return this.$store.getters.allNotifications || [];
    },
    
    filteredNotifications() {
      let filtered = this.notifications;
      
      switch (this.selectedFilter) {
        case 'unread':
          filtered = filtered.filter(n => !n.isRead);
          break;
        case 'like':
          filtered = filtered.filter(n => n.type === 'like');
          break;
        case 'comment':
          filtered = filtered.filter(n => n.type === 'comment');
          break;
        case 'follow':
          filtered = filtered.filter(n => n.type === 'follow');
          break;
        default:
          // 'all' - return all notifications
          break;
      }
      
      return filtered;
    },
    
    hasUnread() {
      return this.notifications.some(n => !n.isRead);
    },
    
    unreadCount() {
      return this.notifications.filter(n => !n.isRead).length;
    },
    
    loading() {
      return this.$store.getters.notificationsLoading;
    },
    
    hasMore() {
      return this.$store.state.notifications.hasMore;
    }
  },
  
  async created() {
    await this.loadNotifications();
  },
  
  methods: {
    async loadNotifications() {
      try {
        await this.$store.dispatch('loadNotifications', { page: 1, limit: 50 });
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    },
    
    async loadMoreNotifications() {
      if (this.loadingMore || !this.hasMore) return;
      
      this.loadingMore = true;
      try {
        const currentPage = this.$store.state.notifications.currentPage;
        await this.$store.dispatch('loadNotifications', { 
          page: currentPage + 1, 
          limit: 20 
        });
      } catch (error) {
        console.error('Error loading more notifications:', error);
      } finally {
        this.loadingMore = false;
      }
    },
    
    setFilter(filter) {
      this.selectedFilter = filter;
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
      // Navigation is handled in NotificationItem component
    }
  }
};
</script>

<style lang="scss" scoped>
.notifications-page {
  min-height: 100vh;
  background: #fafafa;
}

.notifications-content {
  padding-top: 80px; // Account for fixed header
  padding-bottom: 40px;
  min-height: calc(100vh - 120px);
}

.notifications-container {
  max-width: 600px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.notifications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  border-bottom: 1px solid #efefef;
  background: #fafafa;
  
  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: #262626;
  }
  
  .mark-all-read-btn {
    background: none;
    border: 1px solid #0095f6;
    color: #0095f6;
    padding: 8px 16px;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
    
    &:hover:not(:disabled) {
      background: #0095f6;
      color: white;
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}

.notifications-filters {
  display: flex;
  padding: 16px 32px;
  border-bottom: 1px solid #efefef;
  gap: 8px;
  overflow-x: auto;
  
  .filter-btn {
    background: none;
    border: 1px solid #dbdbdb;
    color: #262626;
    padding: 8px 16px;
    border-radius: 20px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
    white-space: nowrap;
    
    &:hover {
      background: #f8f9fa;
    }
    
    &.active {
      background: #0095f6;
      color: white;
      border-color: #0095f6;
    }
  }
}

.notifications-list {
  min-height: 400px;
}

.notification-items {
  .notification-item:last-child {
    border-bottom: none;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 32px;
  text-align: center;
  color: #8e8e8e;
  
  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
    
    i {
      font-size: inherit;
      color: #c7c7c7;
    }
  }
  
  h3 {
    margin: 0 0 8px 0;
    font-size: 20px;
    font-weight: 600;
    color: #262626;
  }
  
  p {
    margin: 0;
    font-size: 16px;
    line-height: 1.4;
  }
}

.loading-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 60px 32px;
  
  .loader {
    border: 4px solid #f3f3f3;
    border-top: 4px solid #0095f6;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }
  
  p {
    margin: 0;
    color: #8e8e8e;
    font-size: 16px;
  }
}

.load-more-container {
  padding: 20px 32px;
  text-align: center;
  border-top: 1px solid #efefef;
  
  .load-more-btn {
    background: none;
    border: 1px solid #0095f6;
    color: #0095f6;
    padding: 10px 24px;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
    
    &:hover:not(:disabled) {
      background: #0095f6;
      color: white;
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// Mobile responsive
@media (max-width: 768px) {
  .notifications-container {
    margin: 16px;
    max-width: none;
  }
  
  .notifications-header {
    padding: 16px 20px;
    
    h1 {
      font-size: 20px;
    }
  }
  
  .notifications-filters {
    padding: 12px 20px;
  }
  
  .empty-state,
  .loading-container {
    padding: 40px 20px;
  }
  
  .load-more-container {
    padding: 16px 20px;
  }
}
</style>