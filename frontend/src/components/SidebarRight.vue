<template>
  <div class="right-sidebar">
    <div class="friends" ref="friendsContainer">
      <!-- Tab Bar -->
      <div class="tab-bar">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'contacts' }"
          @click="switchTab('contacts')"
        >
          <i class="material-icons">people</i>
          <span>Người liên hệ</span>
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'followers' }"
          @click="switchTab('followers')"
        >
          <i class="material-icons">person_add</i>
          <span>Đang theo dõi</span>
        </button>
      </div>

      <!-- Search Box -->
      <div class="search-box">
        <i class="material-icons search-icon">search</i>
        <input 
          type="text" 
          v-model="searchQuery" 
          :placeholder="activeTab === 'contacts' ? 'Tìm kiếm liên hệ' : 'Tìm kiếm người theo dõi'"
          @input="handleSearch"
        />
        <i 
          v-if="searchQuery" 
          class="material-icons clear-icon" 
          @click="clearSearch"
        >
          close
        </i>
      </div>

      <!-- Loading skeleton -->
      <div v-if="isLoading && users.length === 0" class="loading-skeleton">
        <div class="friend-skeleton" v-for="i in 8" :key="'skeleton-' + i">
          <Skeletor circle width="50" height="50" />
          <div class="skeleton-text">
            <Skeletor width="120" height="14" />
            <Skeletor width="80" height="10" style="margin-top: 4px;" />
          </div>
        </div>
      </div>
      
      <!-- Users list -->
      <div v-else class="users-list">
        <div class="friend" v-for="user in filteredUsers" :key="user._id" @click="openChat(user)">
          <div class="friend-info">
            <div class="avatar-wrapper">
              <img v-if="user.profilePicture" class="image-post__img" :src="`http://localhost:3000/uploads/user/${user.profilePicture}`" />
              <img v-else class="image-post__img" src="@/assets/defaultProfile.png" />
              <span v-if="user.isOnline" class="online-dot"></span>
            </div>
            <label>{{ user.displayName || user.email }}</label>
          </div>
        </div>
        
        <!-- Loading more indicator -->
        <div v-if="isLoadingMore" class="loading-more">
          <div class="friend-skeleton" v-for="i in 3" :key="'loading-' + i">
            <Skeletor circle width="50" height="50" />
            <div class="skeleton-text">
              <Skeletor width="120" height="14" />
            </div>
          </div>
        </div>
        
        <!-- No more users -->
        <div v-if="!hasMore && users.length > 0" class="no-more">
          <span>Đã hiển thị tất cả {{ activeTab === 'contacts' ? 'liên hệ' : 'người đang theo dõi' }}</span>
        </div>

        <!-- Empty state -->
        <div v-if="!isLoading && filteredUsers.length === 0 && !searchQuery" class="empty-state">
          <i class="material-icons">{{ activeTab === 'contacts' ? 'contacts' : 'person_search' }}</i>
          <span>{{ activeTab === 'contacts' ? 'Chưa có liên hệ' : 'Chưa theo dõi ai' }}</span>
        </div>

        <!-- No search results -->
        <div v-if="!isLoading && searchQuery && filteredUsers.length === 0" class="empty-state">
          <i class="material-icons">search_off</i>
          <span>Không tìm thấy kết quả</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Skeletor } from 'vue-skeletor';

export default {
  name: 'SidebarRight',
  components: { Skeletor },
  data() {
    return {
      activeTab: 'contacts', // 'contacts' hoặc 'followers'
      users: [],
      allUsers: [], // Lưu tất cả users để filter
      searchQuery: '',
      isLoading: false,
      isLoadingMore: false,
      page: 0,
      limit: 5,
      hasMore: true,
    };
  },
  async created() {
    const token = localStorage.getItem('token');
    if (!token) return;
    await this.loadUsers();
  },
  mounted() {
    console.log('🔵 SidebarRight mounted');
    this.setupScrollListener();
  },
  watch: {
    users() {
      // Re-check scroll khi users thay đổi
      this.$nextTick(() => {
        this.setupScrollListener();
      });
    }
  },
  computed: {
    filteredUsers() {
      if (!this.searchQuery.trim()) {
        return this.users;
      }
      
      const query = this.searchQuery.toLowerCase().trim();
      return this.allUsers.filter(user => {
        const name = (user.displayName || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        return name.includes(query) || email.includes(query);
      });
    }
  },
  beforeUnmount() {
    const container = this.$refs.friendsContainer;
    if (container) {
      container.removeEventListener('scroll', this.handleScroll);
    }
  },
  methods: {
    handleSearch() {
      // Filter được xử lý bởi computed property filteredUsers
    },
    
    clearSearch() {
      this.searchQuery = '';
    },
    
    switchTab(tab) {
      if (this.activeTab === tab) return;
      
      console.log(`🔄 Switching to tab: ${tab}`);
      this.activeTab = tab;
      
      // Reset state
      this.users = [];
      this.allUsers = [];
      this.searchQuery = '';
      this.page = 0;
      this.hasMore = true;
      
      // Load data for new tab
      this.loadUsers();
    },
    
    setupScrollListener() {
      setTimeout(() => {
        const container = this.$refs.friendsContainer;
        console.log('🔍 Looking for container ref:', container);
        
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
          console.log('✅ Scroll listener attached');
        } else {
          console.error('❌ friendsContainer ref not found!');
        }
      }, 500);
    },
    
    async loadUsers() {
      if (this.isLoading || this.isLoadingMore || !this.hasMore) {
        console.log('⏭️ Skip loading:', { isLoading: this.isLoading, isLoadingMore: this.isLoadingMore, hasMore: this.hasMore });
        return;
      }
      
      this.isLoading = this.page === 0;
      this.isLoadingMore = this.page > 0;
      
      console.log(`🔄 Loading page ${this.page} for tab ${this.activeTab}...`);
      
      try {
        await this.$store.dispatch('loadUser');
        
        let response;
        if (this.activeTab === 'contacts') {
          const { getSuggestedContacts } = await import('@/api/users');
          response = await getSuggestedContacts(this.limit, this.page * this.limit);
        } else {
          const { getRecentFollowers } = await import('@/api/users');
          response = await getRecentFollowers(this.limit, this.page * this.limit);
        }
        
        const newUsers = response.data.users || [];
        
        console.log(`✅ Got ${newUsers.length} users from API`);
        
        if (newUsers.length < this.limit) {
          this.hasMore = false;
          console.log('📭 No more users available');
        }
        
        this.users = [...this.users, ...newUsers];
        this.allUsers = [...this.allUsers, ...newUsers]; // Lưu vào allUsers để search
        this.page++;
        
        console.log('✅ Total users loaded:', this.users.length);
      } catch (error) {
        console.error('❌ Load users error:', error);
      } finally {
        this.isLoading = false;
        this.isLoadingMore = false;
      }
    },
    
    handleScroll(event) {
      const container = event.target;
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      
      console.log('📜 Scroll detected:', {
        scrollTop,
        scrollHeight,
        clientHeight,
        remaining: scrollHeight - (scrollTop + clientHeight)
      });
      
      // Khi scroll gần đến cuối (còn 100px)
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        console.log('🔄 Loading more users...');
        this.loadUsers();
      }
    },
    
    openChat(user) {
      // Gọi global method để mở ChatPopup
      if (window.openChatPopup) {
        window.openChatPopup({
          recipientId: user._id,
          recipientName: user.displayName || user.email,
          recipientAvatar: user.profilePicture
        });
      }
    }
  }
};
</script>

<style scoped>
.right-sidebar {
  height: 100%;
  overflow: hidden;
  width: 95%;
}

.friends {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  border-radius: 1rem;
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  padding: 1rem;
  max-height: 400px;
  overflow-y: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

/* Ẩn scrollbar cho Chrome, Safari và Opera */
.friends::-webkit-scrollbar {
  display: none;
}

/* Tab Bar */
.tab-bar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  background: rgba(243, 244, 246, 0.5);
  padding: 0.25rem;
  border-radius: 0.75rem;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.625rem 0.5rem;
  border: none;
  background: transparent;
  border-radius: 0.625rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.tab-btn i {
  font-size: 18px;
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
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.tab-btn.active:hover {
  background: linear-gradient(135deg, #5a67d8 0%, #6b3fa0 100%);
}

/* Search Box */
.search-box {
  position: relative;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--gray-100);
}

.search-icon {
  position: absolute;
  left: 1.5rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--gray-400);
  font-size: 18px;
  pointer-events: none;
}

.search-box input {
  width: 100%;
  padding: 0.625rem 2.25rem 0.625rem 2.5rem;
  border: 2px solid var(--gray-200);
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  transition: all 0.2s ease;
  background: white;
}

.search-box input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.search-box input::placeholder {
  color: var(--gray-400);
}

.clear-icon {
  position: absolute;
  right: 1.5rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--gray-400);
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-icon:hover {
  color: var(--gray-600);
  transform: translateY(-50%) scale(1.1);
}

/* Users List */
.users-list {
  display: flex;
  flex-direction: column;
}

.loading-skeleton {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
}

.friend {
  padding: 0.625rem;
  border-radius: 0.5rem;
  margin-bottom: 0.25rem;
  transition: all 0.3s;
  cursor: pointer;
}

.friend:hover {
  background: rgba(102, 126, 234, 0.08);
  transform: translateX(4px);
}

.friend-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.image-post__img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.online-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 8px;
  height: 8px;
  background: #10b981;
  border: 2px solid white;
  border-radius: 50%;
}

.friend label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
  cursor: pointer;
}

.loading-more {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.625rem;
}

.friend-skeleton {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem;
}

.skeleton-text {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.loading-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.no-more {
  text-align: center;
  padding: 1rem;
  color: #9ca3af;
  font-size: 0.75rem;
  font-style: italic;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  color: #9ca3af;
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 0.5rem;
  opacity: 0.5;
}

.empty-state span {
  font-size: 0.875rem;
  font-style: italic;
}

@media (max-width: 768px) {
  .right-sidebar {
    display: none;
  }
}
</style>