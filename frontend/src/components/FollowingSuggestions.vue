<template>
  <div class="following-suggestions">
    <div class="suggestions-header">
      <h3 class="suggestions-title">
        <i class="material-icons">people</i>
        Gợi ý kết nối
      </h3>
      <div class="header-controls">
        <span class="suggestions-count">{{ allUsers.length }} người</span>
        <div class="pagination-controls" v-if="allUsers.length > itemsPerPage">
          <button 
            class="nav-btn" 
            :class="{ disabled: !canGoPrevious }"
            @click="previousPage"
            :disabled="!canGoPrevious"
          >
            <i class="material-icons">chevron_left</i>
          </button>
          <span class="page-indicator">{{ currentPage + 1 }}/{{ totalPages }}</span>
          <button 
            class="nav-btn"
            :class="{ disabled: !canGoNext }"
            @click="nextPage"
            :disabled="!canGoNext"
          >
            <i class="material-icons">chevron_right</i>
          </button>
        </div>
      </div>
    </div>

    <div class="suggestions-container" v-if="!loading && displayUsers.length > 0">
      <div class="suggestions-scroll">
        <div 
          v-for="user in displayUsers" 
          :key="user._id"
          class="suggestion-card"
        >
          <div class="card-content" @click="goToProfile(user._id)">
            <div class="user-avatar-wrapper">
              <img 
                v-if="user.profilePicture" 
                :src="`http://localhost:3000/uploads/user/${user.profilePicture}`"
                :alt="user.displayName"
                class="user-avatar"
              />
              <img 
                v-else 
                src="@/assets/defaultProfile.png"
                :alt="user.displayName"
                class="user-avatar"
              />
              <span v-if="user.isFollowing" class="following-badge">
                <i class="material-icons">check</i>
              </span>
            </div>
            
            <div class="user-info">
              <h4 class="user-name">{{ user.displayName || user.email }}</h4>
              <span class="user-badge" :class="{ 'following': user.isFollowing }">
                {{ user.isFollowing ? 'Đang theo dõi' : 'Gợi ý' }}
              </span>
            </div>
          </div>
          
          <button 
            v-if="!user.isFollowing" 
            class="follow-btn"
            @click.stop="followUser(user._id)"
            :disabled="user.isFollowLoading"
          >
            <i class="material-icons">{{ user.isFollowLoading ? 'hourglass_empty' : 'person_add' }}</i>
          </button>
          <div v-else class="following-badge-btn">
            <i class="material-icons">check</i>
            <span>Đang theo dõi</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="loading" class="suggestions-loading">
      <div class="loading-card" v-for="i in 4" :key="i">
        <Skeletor circle size="50" />
        <Skeletor width="70" height="12" style="margin-top: 8px;" />
      </div>
    </div>

    <div v-else class="suggestions-empty">
      <i class="material-icons">people_outline</i>
      <p>Không có gợi ý</p>
    </div>
  </div>
</template>

<script>
import { Skeletor } from 'vue-skeletor';
import { getFollowingUsers, getSuggestedUsers, followUser as followUserApi } from '@/api/users';

export default {
  name: 'FollowingSuggestions',
  components: { Skeletor },
  data() {
    return {
      allUsers: [], // Tất cả users (following + suggested)
      currentPage: 0,
      itemsPerPage: 5,
      loading: false,
    };
  },
  computed: {
    displayUsers() {
      const start = this.currentPage * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.allUsers.slice(start, end);
    },
    totalPages() {
      return Math.ceil(this.allUsers.length / this.itemsPerPage);
    },
    canGoPrevious() {
      return this.currentPage > 0;
    },
    canGoNext() {
      return this.currentPage < this.totalPages - 1;
    }
  },
  async mounted() {
    console.log('FollowingSuggestions component mounted');
    console.log('Current user from store:', this.$store.state.user);
    console.log('Token from localStorage:', localStorage.getItem('token'));
    await this.loadUsers();
  },
  methods: {
    async loadUsers() {
      this.loading = true;
      try {
        const [followingUsers, suggestedUsers] = await Promise.all([
          this.loadFollowingUsers(),
          this.loadSuggestedUsers()
        ]);
        
        // Chỉ kết hợp suggested users (không cần following)
        // Hoặc nếu muốn ưu tiên following thì uncomment dòng dưới
        // this.allUsers = [...followingUsers, ...suggestedUsers].slice(0, 10);
        
        // Chỉ hiển thị suggested users, giới hạn 10 người
        this.allUsers = suggestedUsers.slice(0, 10);
        this.currentPage = 0; // Reset về trang đầu
        
        console.log('Total users loaded:', this.allUsers.length);
      } catch (error) {
        console.error('Load users error:', error);
      } finally {
        this.loading = false;
      }
    },
    
    async loadFollowingUsers() {
      try {
        const token = localStorage.getItem('token');
        console.log('Loading following users with token:', token ? 'exists' : 'missing');
        
        const response = await getFollowingUsers();
        
        console.log('Following users response:', response.data);
        const followingUsers = (response.data || []).map(user => ({
          ...user,
          isFollowing: true,
          isFollowLoading: false
        }));
        console.log('Following users loaded:', followingUsers.length);
        return followingUsers;
      } catch (error) {
        console.error('Load following users error:', error.response || error);
        return [];
      }
    },
    
    async loadSuggestedUsers() {
      try {
        // Lấy 30 users để random chọn ra 10
        const response = await getSuggestedUsers(30);
        
        console.log('Suggested users response:', response.data);
        const users = (response.data || []).map(user => ({
          ...user,
          isFollowing: false,
          isFollowLoading: false
        }));
        
        // Shuffle và chỉ lấy 10 người
        const shuffled = this.shuffleArray(users);
        const limited = shuffled.slice(0, 10);
        console.log('Suggested users loaded:', limited.length);
        return limited;
      } catch (error) {
        console.error('Load suggested users error:', error.response || error);
        return [];
      }
    },
    
    shuffleArray(array) {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    },
    
    async followUser(userId) {
      try {
        const currentUserId = this.$store.state.user._id;
        
        // Tìm user trong allUsers
        const userIndex = this.allUsers.findIndex(u => u._id === userId);
        if (userIndex === -1) return;
        
        // Hiển thị loading ngay lập tức (Vue 3 way)
        this.allUsers[userIndex].isFollowLoading = true;
        
        // Gọi API follow
        const response = await followUserApi(userId, currentUserId);
        
        if (response.status === 200) {
          // Cập nhật UI ngay lập tức - chuyển sang trạng thái đã follow
          this.allUsers[userIndex].isFollowing = true;
          this.allUsers[userIndex].isFollowLoading = false;
          
          // Hiển thị thông báo thành công
          console.log('Đã follow thành công!');
          
          // Cập nhật store bằng action có sẵn
          await this.$store.dispatch('updateUserFollowing', {
            action: 'follow',
            targetUserId: userId
          });
        }
      } catch (error) {
        console.error('Follow user error:', error);
        // Nếu lỗi, reset lại loading state
        const userIndex = this.allUsers.findIndex(u => u._id === userId);
        if (userIndex !== -1) {
          this.allUsers[userIndex].isFollowLoading = false;
        }
      }
    },
    
    goToProfile(userId) {
      this.$router.push(`/profile/${userId}`);
    },
    
    nextPage() {
      if (this.canGoNext) {
        this.currentPage++;
      }
    },
    
    previousPage() {
      if (this.canGoPrevious) {
        this.currentPage--;
      }
    }
  }
};
</script>

<style scoped>
.following-suggestions {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  border-radius: 1rem;
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.suggestions-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.875rem;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.suggestions-title {
  font-size: 0.9375rem;
  font-weight: 700;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}

.suggestions-title i {
  color: #667eea;
  font-size: 1.125rem;
}

.suggestions-count {
  font-size: 0.8125rem;
  color: #6b7280;
  font-weight: 600;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);
}

.nav-btn:hover:not(:disabled) {
  transform: scale(1.1);
  box-shadow: 0 4px 10px rgba(102, 126, 234, 0.4);
}

.nav-btn:disabled,
.nav-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: #d1d5db;
}

.nav-btn i {
  font-size: 18px;
}

.page-indicator {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 600;
  min-width: 35px;
  text-align: center;
}

.suggestions-scroll {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.75rem;
  max-width: 100%;
}

.suggestion-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.875rem;
  border-radius: 0.875rem;
  background: white;
  border: 1px solid rgba(226, 232, 240, 0.6);
  transition: all 0.3s ease;
  min-width: 0;
}

.suggestion-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.15);
  border-color: rgba(102, 126, 234, 0.4);
}

.card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  flex: 1;
  width: 100%;
}

.user-avatar-wrapper {
  position: relative;
  margin-bottom: 0.75rem;
}

.user-avatar {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.suggestion-card:hover .user-avatar {
  border-color: #667eea;
  transform: scale(1.08);
}

.online-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  background: #10b981;
  border: 2px solid white;
  border-radius: 50%;
  z-index: 2;
}

.following-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: 2px solid white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
  box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);
}

.following-badge i {
  font-size: 11px;
  color: white;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}

.user-name {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  margin: 0;
  text-align: center;
}

.user-badge {
  font-size: 0.625rem;
  font-weight: 600;
  padding: 0.3rem 0.6rem;
  border-radius: 10px;
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}

.user-badge.following {
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
}

.follow-btn {
  width: 100%;
  height: 32px;
  margin-top: 0.625rem;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);
}

.follow-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(102, 126, 234, 0.4);
}

.follow-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.follow-btn i {
  font-size: 16px;
}

.follow-btn:disabled i {
  animation: spin 1s linear infinite;
}

.following-badge-btn {
  width: 100%;
  height: 32px;
  margin-top: 0.625rem;
  border-radius: 8px;
  border: 1px solid #667eea;
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.following-badge-btn i {
  font-size: 14px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.suggestions-loading {
  display: flex;
  gap: 0.75rem;
  padding: 0.5rem 0;
}

.loading-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 100px;
}

.suggestions-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  color: #9ca3af;
  gap: 0.5rem;
}

.suggestions-empty i {
  font-size: 2.5rem;
  opacity: 0.5;
}

.suggestions-empty p {
  margin: 0;
  font-size: 0.8125rem;
}

@media (max-width: 768px) {
  .suggestions-scroll {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .suggestion-card {
    padding: 0.75rem;
  }

  .user-avatar {
    width: 48px;
    height: 48px;
  }
}
</style>
