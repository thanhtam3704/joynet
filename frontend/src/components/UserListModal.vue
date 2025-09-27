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
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.modal-container {
  width: 95%;
  max-width: 400px;
  max-height: 70vh;
  background-color: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.3s ease;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #efefef;
}

.modal-header h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  flex: 1;
  text-align: center;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #8e8e8e;
  padding: 0;
  line-height: 1;
}

.modal-body {
  max-height: calc(70vh - 60px);
  overflow-y: auto;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #8e8e8e;
  font-size: 14px;
}

.user-list {
  padding: 0;
}

.user-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #efefef;
}

.user-info {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.user-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 12px;
  flex-shrink: 0;
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
  font-size: 14px;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  color: #8e8e8e;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.follow-button {
  background-color: #ff80ab;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  min-width: 80px;
  height: 28px;
  transition: background-color 0.2s;
}

.follow-button.following {
  background-color: #efefef;
  color: #262626;
}

.follow-button:hover {
  opacity: 0.9;
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
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
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
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.3);
}
</style>