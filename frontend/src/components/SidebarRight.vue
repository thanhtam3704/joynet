<template>
  <div class="right-sidebar">
    <div class="friends">
      <h4 class="friends-title">Liên hệ</h4>
      <Skeletor circle size="50" v-if="isLoading" />
      <Skeletor v-if="isLoading" width="150" height="20" />
      
      <div class="friend" v-for="user in users" :key="user._id">
        <router-link :to="`/profile/${user._id}`">
          <div class="friend-info">
            <div class="avatar-wrapper">
              <img v-if="user.profilePicture" class="image-post__img" :src="`http://localhost:3000/uploads/user/${user.profilePicture}`" />
              <img v-else class="image-post__img" src="@/assets/defaultProfile.png" />
              <span v-if="user.isOnline" class="online-dot"></span>
            </div>
            <label>{{ user.displayName }}</label>
          </div>
        </router-link>
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
    };
  },
  async created() {
    const token = localStorage.getItem('token');
    if (!token) return;
    await this.loadAllContacts();
  },
  methods: {
    async loadAllContacts() {
      this.isLoading = true;
      try {
        await this.$store.dispatch('loadUser');
        const { getSuggestedContacts } = await import('@/api/users');
        const response = await getSuggestedContacts(5, 0);
        this.users = response.data.users || [];
        console.log('✅ Loaded contacts:', this.users.length);
      } catch (error) {
        console.error('Load contacts error:', error);
      }
      this.isLoading = false;
    },
  }
};
</script>

<style scoped>
.right-sidebar {
  width: 17%;
  height: calc(100vh - 5rem);
  margin-left: 1rem;
  position: fixed;
  z-index: 1;
  top: 5rem;
  overflow: hidden;
}

.friends {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  border-radius: 1rem;
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  padding: 1.25rem 1rem;
  max-height: calc(100vh - 7rem);
  overflow-y: auto;
  scrollbar-width: thin;
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

@media (max-width: 768px) {
  .right-sidebar {
    display: none;
  }
}
</style>
