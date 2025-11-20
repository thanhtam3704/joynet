<template>
  <div class="conversation-list-container">
    <!-- Tab Bar -->
    <div class="tab-bar">
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'all' }"
        @click="switchTab('all')"
      >
        <i class="material-icons">forum</i>
        <span>Tất cả</span>
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'unread' }"
        @click="switchTab('unread')"
      >
        <i class="material-icons">mark_chat_unread</i>
        <span>Chưa đọc</span>
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'groups' }"
        @click="switchTab('groups')"
      >
        <i class="material-icons">groups</i>
        <span>Nhóm</span>
      </button>
    </div>

    <!-- Conversation List -->
    <div class="conversation-list" ref="conversationList">
      <!-- Loading Skeleton -->
      <template v-if="isLoading && conversations.length === 0">
        <div class="conversation-skeleton" v-for="i in 6" :key="'skeleton-' + i">
          <Skeletor circle width="50" height="50" />
          <div class="skeleton-details">
            <div class="skeleton-row">
              <Skeletor width="120" height="16" />
              <Skeletor width="40" height="12" />
            </div>
            <Skeletor width="180" height="14" style="margin-top: 6px;" />
          </div>
        </div>
      </template>

      <!-- Conversation Items -->
      <template v-else>
        <div 
          v-for="conversation in filteredConversations" 
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
                :src="conversation.recipientAvatar" 
                alt="Avatar"
                @error="onAvatarError"
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
              {{ getLastMessagePreview(conversation) }}
            </div>
          </div>
        </div>
        
        <!-- Empty State -->
        <div v-if="filteredConversations.length === 0" class="no-conversations">
          {{ getEmptyMessage() }}
        </div>
        
        <!-- Loading More Indicator -->
        <div v-if="isLoadingMore" class="loading-more">
          <div class="loading-spinner"></div>
          <span>Đang tải thêm...</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import { Skeletor } from 'vue-skeletor';

export default {
  name: 'ConversationList',
  components: { Skeletor },
  props: {
    conversations: {
      type: Array,
      default: () => []
    },
    activeConversationId: {
      type: String,
      default: null
    },
    isLoading: {
      type: Boolean,
      default: false
    },
    isLoadingMore: {
      type: Boolean,
      default: false
    },
    hasMore: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      activeTab: 'all' // 'all', 'unread', 'groups'
    };
  },
  mounted() {
    console.log('🔵 ConversationList mounted');
    this.setupScrollListener();
  },
  watch: {
    conversations() {
      // Re-check scroll khi conversations thay đổi
      this.$nextTick(() => {
        this.setupScrollListener();
      });
    }
  },
  beforeUnmount() {
    const container = this.$refs.conversationList;
    if (container) {
      container.removeEventListener('scroll', this.handleScroll);
    }
  },
  computed: {
    filteredConversations() {
      let result = this.conversations;
      
      if (this.activeTab === 'unread') {
        result = result.filter(conv => conv && conv.unread > 0);
      } else if (this.activeTab === 'groups') {
        result = result.filter(conv => conv && conv.isGroup);
      }
      
      return result;
    }
  },
  methods: {
    setupScrollListener() {
      setTimeout(() => {
        const container = this.$refs.conversationList;
        console.log('🔍 Looking for conversationList ref:', container);
        
        if (container) {
          console.log('📦 Container info:', {
            scrollHeight: container.scrollHeight,
            clientHeight: container.clientHeight,
            canScroll: container.scrollHeight > container.clientHeight,
          });
          
          // Remove old listener nếu có
          container.removeEventListener('scroll', this.handleScroll);
          // Thêm scroll listener mới
          container.addEventListener('scroll', this.handleScroll);
          console.log('✅ Scroll listener attached to ConversationList');
        } else {
          console.error('❌ conversationList ref not found!');
        }
      }, 500);
    },
    getAvatarUrl(avatarPath) {
      if (!avatarPath) return '';
      if (typeof avatarPath === 'string' && (avatarPath.startsWith('http://') || avatarPath.startsWith('https://'))) {
        return avatarPath; // Google OAuth, Cloudinary or external
      }
      return avatarPath || require('@/assets/defaultProfile.png');
    },
    onAvatarError(event) {
      event.target.src = require('@/assets/defaultProfile.png');
    },
    switchTab(tab) {
      this.activeTab = tab;
    },
    
    getEmptyMessage() {
      if (this.activeTab === 'unread') {
        return 'Không có tin nhắn chưa đọc';
      } else if (this.activeTab === 'groups') {
        return 'Không có nhóm chat nào';
      }
      return 'Không có cuộc trò chuyện nào';
    },
    
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
      if (typeof message !== 'string') return '';
      return message.length > 30 ? message.substring(0, 30) + '...' : message;
    },

    getLastMessagePreview(conversation) {
      if (!conversation) return '';
      const message = conversation.lastMessage;
      if (!message) return '';

      // Old format: string
      if (typeof message === 'string') {
        return this.truncateMessage(message);
      }

      // New format: object
      if (message.messageType === 'image') {
        return '📷 Đã gửi một ảnh';
      }

      if (message.messageType === 'file') {
        const fileName = message.originalFileName || message.fileName || message.file || '';
        return fileName ? `📎 ${fileName}` : '📎 Đã gửi một file';
      }

      if (message.content) {
        return message.content.length > 30 ? message.content.substring(0, 30) + '...' : message.content;
      }

      return '';
    },
    
    handleScroll(event) {
      const container = event.target;
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      
      // Khi scroll gần đến cuối (còn 100px)
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        if (!this.isLoadingMore && this.hasMore) {
          console.log('🔄 Loading more conversations...', {
            isLoadingMore: this.isLoadingMore,
            hasMore: this.hasMore,
            currentCount: this.conversations.length
          });
          this.$emit('load-more');
        }
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.conversation-list-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0; /* Quan trọng cho flex child */
  overflow: hidden; /* Ngăn container tràn */
}

/* Tab Bar */
.tab-bar {
  display: flex;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  background: rgba(243, 244, 246, 0.5);
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.5rem 0.375rem;
  border: none;
  background: transparent;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.tab-btn i {
  font-size: 16px;
  flex-shrink: 0;
}

.tab-btn span {
  white-space: nowrap;
}

.tab-btn:hover {
  background: rgba(255, 255, 255, 0.6);
  color: #374151;
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.tab-btn.active:hover {
  background: linear-gradient(135deg, #5a67d8 0%, #6b3fa0 100%);
}

.conversation-list {
  flex: 1;
  min-height: 0; /* Quan trọng cho flex child có scroll */
  overflow-y: auto;
  overflow-x: hidden;
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

.conversation-skeleton {
  display: flex;
  align-items: center;
  padding: 1rem;
  gap: 12px;
}

.skeleton-details {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.skeleton-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  gap: 0.75rem;
}

.bottom-sentinel {
  height: 1px;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid #e2e8f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-more span {
  font-size: 0.875rem;
  color: #94a3b8;
  font-weight: 500;
}

/* Responsive */
@media (max-width: 768px) {
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