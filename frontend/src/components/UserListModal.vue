<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-container">
      <div class="modal-header">
        <h3>{{ title }}</h3>
        <button class="close-button" @click="$emit('close')">×</button>
      </div>
      <div class="modal-body">
        <div v-if="loading" class="loading-container">
          <SyncLoader :color="color" />
        </div>
        <div v-else-if="users.length === 0" class="empty-state">
          Không có người dùng nào
        </div>
        <div v-else class="user-list">
          <div 
            v-for="user in users" 
            :key="user._id" 
            class="user-item"
          >
            <div class="user-info" @click="navigateToProfile(user._id)">
              <div class="user-avatar">
                <img 
                  v-if="user.profilePicture" 
                  :src="`http://localhost:3000/uploads/user/${user.profilePicture}`" 
                  alt="Avatar"
                />
                <img 
                  v-else 
                  src="@/assets/defaultProfile.png" 
                  alt="Default Avatar"
                />
              </div>
              <div class="user-details">
                <div class="user-name">{{ user.displayName }}</div>
                <div class="user-email">{{ user.email }}</div>
              </div>
            </div>
            <button 
              v-if="currentUserId !== user._id && showFollowButtons"
              :class="['follow-button', isFollowing(user._id) ? 'following' : '']"
              @click="toggleFollow(user._id)"
              :disabled="followingStatus[user._id]?.loading"
            >
              <span v-if="!followingStatus[user._id]?.loading">
                {{ isFollowing(user._id) ? 'Bỏ theo dõi' : 'Theo dõi' }}
              </span>
              <span v-else class="mini-loader">
                <SyncLoader :color="color" :size="'5px'" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import SyncLoader from 'vue-spinner/src/SyncLoader.vue';

export default {
  name: 'UserListModal',
  components: {
    SyncLoader
  },
  props: {
    title: {
      type: String,
      required: true
    },
    userIds: {
      type: Array,
      required: true
    },
    showFollowButtons: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      users: [],
      loading: true,
      color: "pink",
      followingStatus: {},
      currentUserId: null
    };
  },
  async created() {
    // Đảm bảo thông tin người dùng hiện tại được cập nhật mới nhất
    await this.$store.dispatch("loadUser");
    this.currentUserId = this.$store.state.user?._id;
    await this.loadUsers();
  },
  methods: {
    async loadUsers() {
      this.loading = true;
      try {
        if (this.userIds.length === 0) {
          this.users = [];
          return;
        }

        // Đảm bảo thông tin người dùng hiện tại được cập nhật mới nhất
        await this.$store.dispatch("loadUser");
        this.currentUserId = this.$store.state.user?._id;

        // Sử dụng getUser API cho từng userId
        const { getUser } = await import('@/api/users');
        
        // Thực hiện các request song song
        const promises = this.userIds.map(id => getUser(id));
        const responses = await Promise.all(promises);
        
        // Xử lý kết quả và lọc các response thành công
        this.users = responses
          .filter(res => res.status === 200)
          .map(res => res.data);
        
        // Khởi tạo trạng thái follow cho mỗi user
        this.users.forEach(user => {
          const isFollowing = this.checkIfFollowing(user);
          console.log(`User ${user.displayName} (${user._id}): following = ${isFollowing}`);
          
          // Trong Vue 3 không cần $set, gán trực tiếp
          this.followingStatus[user._id] = {
            following: isFollowing,
            loading: false
          };
        });
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        this.loading = false;
      }
    },
    
    checkIfFollowing(user) {
      // Lấy thông tin người dùng hiện tại từ store
      const currentUser = this.$store.state.user;
      
      // Nếu là người dùng hiện tại, không hiển thị nút theo dõi
      if (user._id === this.currentUserId) return false;
      
      // Kiểm tra đối với danh sách người theo dõi
      if (this.title === "Người theo dõi") {
        // Kiểm tra xem mình có theo dõi lại người này không
        const iAmFollowing = currentUser?.followings?.includes(user._id) || false;
        console.log(`Checking if I'm following ${user.displayName}: ${iAmFollowing}`);
        return iAmFollowing;
      }
      // Kiểm tra đối với danh sách đang theo dõi
      else if (this.title === "Đang theo dõi") {
        // Những người trong danh sách "Đang theo dõi" đã được mình theo dõi rồi
        return true;
      }
      
      // Mặc định kiểm tra người dùng hiện tại có theo dõi người này không
      return currentUser?.followings?.includes(user._id) || false;
    },
    
    isFollowing(userId) {
      return this.followingStatus[userId]?.following || false;
    },
    
    async toggleFollow(userId) {
      if (this.followingStatus[userId].loading) return;
      
      // Set loading state - gán trực tiếp thay vì dùng $set
      this.followingStatus[userId] = {
        ...this.followingStatus[userId],
        loading: true
      };
      
      try {
        const isFollowing = this.followingStatus[userId].following;
        const { followUser, unfollowUser } = await import('@/api/users');
        
        if (isFollowing) {
          // Bỏ theo dõi
          await unfollowUser(userId, this.currentUserId);
          
          // Cập nhật state trong store thông qua action
          await this.$store.dispatch("updateUserFollowing", { 
            action: "unfollow", 
            targetUserId: userId 
          });
        } else {
          // Theo dõi
          await followUser(userId, this.currentUserId);
          
          // Cập nhật state trong store thông qua action
          await this.$store.dispatch("updateUserFollowing", { 
            action: "follow", 
            targetUserId: userId 
          });
        }
        
        // Toggle following state - gán trực tiếp thay vì dùng $set
        this.followingStatus[userId] = {
          following: !isFollowing,
          loading: false
        };
        
        // Emit event so parent component can update counts
        this.$emit('follow-updated', {
          userId,
          following: !isFollowing
        });
        
      } catch (error) {
        console.error('Error toggling follow:', error);
        // Reset loading state on error - gán trực tiếp thay vì dùng $set
        this.followingStatus[userId] = {
          ...this.followingStatus[userId],
          loading: false
        };
      }
    },
    
    navigateToProfile(userId) {
      this.$emit('close');
      this.$router.push({ name: 'Profile', params: { id: userId } });
    }
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(17, 24, 39, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease;
  padding: 1rem;
}

.modal-container {
  width: 95%;
  max-width: 440px;
  max-height: 75vh;
  background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 
              0 0 0 1px rgba(226, 232, 240, 0.6);
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%);
}

.modal-header h3 {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  flex: 1;
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.close-button {
  background: #f1f5f9;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #64748b;
  padding: 0;
  line-height: 1;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-weight: 300;
}

.close-button:hover {
  background: #e2e8f0;
  color: #475569;
  transform: rotate(90deg);
}

.modal-body {
  max-height: calc(75vh - 80px);
  overflow-y: auto;
  background: white;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 220px;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 220px;
  color: #94a3b8;
  font-size: 0.9375rem;
  font-weight: 500;
}

.user-list {
  padding: 0.5rem 0;
}

.user-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid rgba(226, 232, 240, 0.5);
  transition: background-color 0.2s ease;
}

.user-item:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.02) 0%, rgba(118, 75, 162, 0.02) 100%);
}

.user-item:last-child {
  border-bottom: none;
}

.user-info {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 14px;
  flex-shrink: 0;
  border: 2px solid rgba(102, 126, 234, 0.1);
  transition: border-color 0.2s ease;
}

.user-item:hover .user-avatar {
  border-color: rgba(102, 126, 234, 0.3);
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-weight: 600;
  font-size: 0.9375rem;
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #1e293b;
}

.user-email {
  color: #94a3b8;
  font-size: 0.8125rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.follow-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  min-width: 90px;
  height: 34px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);
}

.follow-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(102, 126, 234, 0.4);
}

.follow-button.following {
  background: #f1f5f9;
  color: #64748b;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.follow-button.following:hover {
  background: #e2e8f0;
  color: #475569;
}

.mini-loader {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(30px) scale(0.95);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

/* Tùy chỉnh thanh cuộn */
.modal-body::-webkit-scrollbar {
  width: 6px;
}

.modal-body::-webkit-scrollbar-track {
  background: transparent;
}

.modal-body::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #5568d3 0%, #63428b 100%);
}

/* Responsive */
@media (max-width: 480px) {
  .modal-container {
    max-width: 100%;
    border-radius: 12px;
  }
  
  .modal-header {
    padding: 1rem 1.25rem;
  }
  
  .modal-header h3 {
    font-size: 1.125rem;
  }
  
  .user-item {
    padding: 0.75rem 1rem;
  }
  
  .follow-button {
    min-width: 80px;
    font-size: 0.75rem;
    padding: 0.4rem 0.8rem;
  }
}
</style>