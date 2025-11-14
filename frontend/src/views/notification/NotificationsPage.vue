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
          <div class="notification-skeleton" v-for="i in 8" :key="'skeleton-' + i">
            <Skeletor circle width="48" height="48" />
            <div class="skeleton-content">
              <Skeletor width="200" height="16" />
              <Skeletor width="150" height="12" style="margin-top: 6px;" />
              <Skeletor width="100" height="10" style="margin-top: 6px;" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <TheFooter />
  </div>
</template>

<script>
import { Skeletor } from 'vue-skeletor';
import TheHeader from '@/components/TheHeader.vue';
import TheFooter from '@/components/TheFooter.vue';
import NotificationItem from './components/NotificationItem.vue';

export default {
  name: 'NotificationsPage',
  components: {
    TheHeader,
    TheFooter,
    NotificationItem,
    Skeletor
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%);
    pointer-events: none;
  }
}

.notifications-content {
  padding-top: 100px;
  padding-bottom: 60px;
  min-height: calc(100vh - 120px);
  position: relative;
  z-index: 1;
}

.notifications-container {
  max-width: 680px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 
              0 0 0 1px rgba(255, 255, 255, 0.5);
  overflow: hidden;
  animation: slideUp 0.4s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.notifications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28px 36px;
  border-bottom: 1px solid rgba(102, 126, 234, 0.1);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  
  h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.02em;
  }
  
  .mark-all-read-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    color: white;
    padding: 10px 20px;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    
    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    }
    
    &:active:not(:disabled) {
      transform: translateY(0);
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
  }
}

.notifications-filters {
  display: flex;
  padding: 20px 36px;
  border-bottom: 1px solid rgba(102, 126, 234, 0.1);
  gap: 10px;
  overflow-x: auto;
  scrollbar-width: none;
  
  &::-webkit-scrollbar {
    display: none;
  }
  
  .filter-btn {
    background: rgba(102, 126, 234, 0.08);
    border: 2px solid transparent;
    color: #667eea;
    padding: 10px 20px;
    border-radius: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 14px;
    white-space: nowrap;
    letter-spacing: -0.01em;
    
    &:hover {
      background: rgba(102, 126, 234, 0.15);
      transform: translateY(-2px);
    }
    
    &.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-color: transparent;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
  }
}

.notifications-list {
  min-height: 450px;
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
  padding: 80px 40px;
  text-align: center;
  
  .empty-icon {
    width: 100px;
    height: 100px;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 24px;
    
    i {
      font-size: 48px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  }
  
  h3 {
    margin: 0 0 12px 0;
    font-size: 22px;
    font-weight: 700;
    color: #1f2937;
    letter-spacing: -0.02em;
  }
  
  p {
    margin: 0;
    font-size: 16px;
    line-height: 1.6;
    color: #6b7280;
    max-width: 400px;
  }
}

.loading-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 80px 40px;
  
  .loader {
    border: 4px solid rgba(102, 126, 234, 0.1);
    border-top: 4px solid #667eea;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    animation: spin 0.8s linear infinite;
    margin-bottom: 20px;
  }
  
  p {
    margin: 0;
    color: #6b7280;
    font-size: 16px;
    font-weight: 500;
  }
}

.load-more-container {
  padding: 24px 36px;
  text-align: center;
  border-top: 1px solid rgba(102, 126, 234, 0.1);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.02) 0%, rgba(118, 75, 162, 0.02) 100%);
  
  .load-more-btn {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
    border: 2px solid rgba(102, 126, 234, 0.2);
    color: #667eea;
    padding: 12px 32px;
    border-radius: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 14px;
    letter-spacing: -0.01em;
    
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-color: transparent;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.notification-skeleton {
  display: flex;
  align-items: flex-start;
  padding: 1rem 1.5rem;
  gap: 12px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

// Mobile responsive
@media (max-width: 768px) {
  .notifications-container {
    margin: 16px;
    max-width: none;
    border-radius: 20px;
  }
  
  .notifications-header {
    padding: 20px 24px;
    
    h1 {
      font-size: 24px;
    }
    
    .mark-all-read-btn {
      padding: 8px 16px;
      font-size: 13px;
    }
  }
  
  .notifications-filters {
    padding: 16px 24px;
    gap: 8px;
    
    .filter-btn {
      padding: 8px 16px;
      font-size: 13px;
    }
  }
  
  .empty-state,
  .loading-container {
    padding: 60px 24px;
    
    .empty-icon {
      width: 80px;
      height: 80px;
      
      i {
        font-size: 40px;
      }
    }
    
    h3 {
      font-size: 20px;
    }
    
    p {
      font-size: 15px;
    }
  }
  
  .load-more-container {
    padding: 20px 24px;
  }
}
</style>