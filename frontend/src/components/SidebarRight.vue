<template>
  <div class="right-sidebar">
    <div class="friends">
      <h4 class="friends-title">Bạn bè</h4>
      <Skeletor circle size="50" v-if="isLoading" />
      <Skeletor v-if="isLoading" class="skeleton" width="150" height="20" />
      <Skeletor circle size="50" v-if="isLoading" />
      <Skeletor v-if="isLoading" class="skeleton" width="150" height="20" />
      <Skeletor circle size="50" v-if="isLoading" />
      <Skeletor v-if="isLoading" class="skeleton" width="150" height="20" />
      <div
        class="friend"
        v-for="profileUser in users"
        :key="profileUser._id"
        v-else
      >
        <router-link :to="`/profile/${profileUser._id}`">
          <div class="friend-info">
            <img
              v-if="profileUser.profilePicture"
              class="image-post__img"
              :src="`http://localhost:3000/uploads/user/${profileUser.profilePicture}`"
            />
            <img
              v-else
              class="image-post__img"
              src="@/assets/defaultProfile.png"
            />
            <label>{{ profileUser.displayName }}</label>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script>
import { Skeletor } from "vue-skeletor";

export default {
  name: "SidebarRight",
  components: { Skeletor },
  data() {
    return {
      users: [],
      isLoading: false,
    };
  },
  computed: {
    currentUserId() {
      return this.$store.state.user?._id;
    }
  },
  async created() {
    this.isLoading = true;
    try {
      // Đảm bảo user đã được load
      await this.$store.dispatch('loadUser');
      
      const { getAllUsers } = await import('@/api/users');
      const response = await getAllUsers();
      
      // Filter out current user - chỉ hiển thị mọi người trừ tôi
      this.users = response.data.filter(user => user._id !== this.currentUserId);
      
      console.log(`Loaded ${this.users.length} users (excluding current user)`);
    } catch (error) {
      console.error("Load users error:", error);
    }
    this.isLoading = false;
  },
};
</script>

<style scoped>
.right-sidebar {
  display: flex;
  flex-direction: column; /* Đổi thành column để stack các item theo chiều dọc */
  width: 17%;
  height: calc(100vh - 8rem); /* Sử dụng viewport height thay vì fixed 650px */
  margin-left: 1rem;
  margin-top: 5rem;
  position: fixed;
  z-index: 1;
  top: 0;
  overflow-x: hidden;
  overflow-y: auto; /* Cho phép scroll dọc */
  /* Ẩn thanh scroll */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE & Edge */
}

/* Ẩn scrollbar cho Webkit (Chrome/Safari) */
.right-sidebar::-webkit-scrollbar {
  display: none;
}


.friends-title {
  padding-top: 1rem;
  font-weight: bold;
  color: #818588;
  margin-bottom: 1rem;
}

.friend {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-left: 0.5em;
  margin-bottom: 1em;
  padding: 0.5rem;
  border-radius: 8px;
  transition: background-color 0.3s ease;
}

.friend:hover {
  background-color: #f0f2f5;
  cursor: pointer;
}

.friend img {
  width: 35px;
  border-radius: 30%;
}

.friend label {
  margin-left: 1em;
  font-size: 0.85em;
  font-weight: 500;
  transition: color 0.3s ease;
}

.friend:hover label {
  color: #1877f2;
}

.friend-info {
  display: flex;
  align-items: center;
  width: 100%;
  text-decoration: none;
}

.friend a {
  text-decoration: none;
  color: inherit;
  width: 100%;
}

.online {
  width: 8px;
  height: 8px;
  border-radius: 100%;
  background-color: var(--green);
  margin-left: 1em;
}

.image-post__img {
  width: 35px;
  height: 35px;
  border-radius: 100%;
}

.skeleton {
  margin-left: 3rem;
}
</style>
