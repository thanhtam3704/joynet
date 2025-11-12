<template>
  <div class="right-sidebar">
    <div class="friends" ref="friendsContainer">
      <h4 class="friends-title">Liên hệ</h4>
      <Skeletor circle size="50" v-if="isLoading && users.length === 0" />
      <Skeletor v-if="isLoading && users.length === 0" width="150" height="20" />
      
      <div class="friend" v-for="user in users" :key="user._id" @click="openChat(user)">
        <div class="friend-info">
          <div class="avatar-wrapper">
            <img v-if="user.profilePicture" class="image-post__img" :src="`http://localhost:3000/uploads/user/${user.profilePicture}`" />
            <img v-else class="image-post__img" src="@/assets/defaultProfile.png" />
            <span v-if="user.isOnline" class="online-dot"></span>
          </div>
          <label>{{ user.displayName }}</label>
        </div>
      </div>
      
      <!-- Loading more indicator -->
      <div v-if="isLoadingMore" class="loading-more">
        <Skeletor circle size="40" />
        <Skeletor width="120" height="16" />
      </div>
      
      <!-- No more users -->
      <div v-if="!hasMore && users.length > 0" class="no-more">
        <span>Đã hiển thị tất cả liên hệ</span>
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
      users: [],
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
    await this.loadContacts();
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
  beforeUnmount() {
    const container = this.$refs.friendsContainer;
    if (container) {
      container.removeEventListener('scroll', this.handleScroll);
    }
  },
  methods: {
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
    async loadContacts() {
      if (this.isLoading || this.isLoadingMore || !this.hasMore) {
        console.log('⏭️ Skip loading:', { isLoading: this.isLoading, isLoadingMore: this.isLoadingMore, hasMore: this.hasMore });
        return;
      }
      
      this.isLoading = this.page === 0;
      this.isLoadingMore = this.page > 0;
      
      console.log(`🔄 Loading page ${this.page}...`);
      
      try {
        await this.$store.dispatch('loadUser');
        const { getSuggestedContacts } = await import('@/api/users');
        const response = await getSuggestedContacts(this.limit, this.page * this.limit);
        const newUsers = response.data.users || [];
        
        console.log(`✅ Got ${newUsers.length} users from API`);
        
        if (newUsers.length < this.limit) {
          this.hasMore = false;
          console.log('📭 No more users available');
        }
        
        this.users = [...this.users, ...newUsers];
        this.page++;
        
        console.log('✅ Total contacts loaded:', this.users.length);
      } catch (error) {
        console.error('❌ Load contacts error:', error);
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
        console.log('🔄 Loading more contacts...');
        this.loadContacts();
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
  padding: 1.25rem 1rem;
  max-height: 300px;
  overflow-y: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

/* Ẩn scrollbar cho Chrome, Safari và Opera */
.friends::-webkit-scrollbar {
  display: none;
}

.friends-title {
  font-weight: 700;
  font-size: 0.875rem;
  color: #6b7280;
  text-transform: uppercase;
  margin-bottom: 0.75rem;
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

.friend a {
  text-decoration: none;
  color: inherit;
}

.loading-more {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem;
  justify-content: center;
}

.no-more {
  text-align: center;
  padding: 1rem;
  color: #9ca3af;
  font-size: 0.75rem;
  font-style: italic;
}

@media (max-width: 768px) {
  .right-sidebar {
    display: none;
  }
}
</style>