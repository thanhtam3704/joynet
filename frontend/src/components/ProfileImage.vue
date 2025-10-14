<template>
  <img
    v-if="profilePicture"
    class="image-post__avatar"
    :src="`http://localhost:3000/uploads/user/${profilePicture}`"
    :key="`avatar-${id}-${profilePicture}`"
  />
  <img v-else class="image-post__avatar" src="@/assets/defaultProfile.png" :key="`default-${id}`" />
</template>

<script>
export default {
  name: "ProfileImage",
  props: ["id"],
  data() {
    return {
      user: [],
      profilePicture: "",
    };
  },
  computed: {
    // Theo dõi thay đổi từ usersById cache
    cachedUser() {
      return this.$store?.state?.usersById?.[this.id];
    },
  },
  watch: {
    id: {
      handler(newId) {
        if (newId) {
          this.loadUserProfile();
        }
      },
      immediate: false
    },
    // Theo dõi thay đổi trong cached user (bao gồm cả avatar)
    cachedUser: {
      handler(newCachedUser) {
        if (newCachedUser && newCachedUser.profilePicture !== this.profilePicture) {
          this.profilePicture = newCachedUser.profilePicture;
        }
      },
      deep: true,
      immediate: false
    }
  },
  async created() {
    await this.loadUserProfile();
  },
  methods: {
    async loadUserProfile() {
      try {
        // Check if id is valid
        if (!this.id) {
          console.warn('ProfileImage: No user ID provided');
          return;
        }

        // Check if id is a valid MongoDB ObjectId format
        if (!this.id.match(/^[0-9a-fA-F]{24}$/)) {
          console.warn('ProfileImage: Invalid user ID format:', this.id);
          return;
        }

        // Check Vuex cache first
        const cached = this.$store?.state?.usersById?.[this.id];
        if (cached && cached.profilePicture) {
          this.user = cached;
          this.profilePicture = cached.profilePicture;
          return;
        }

        // Check localStorage as fallback (only for preservation)
        const localStorageKey = `originalProfilePicture_${this.id}`;
        const savedAvatar = localStorage.getItem(localStorageKey);
        
        try {
          const axios = (await import('@/utils/axios')).default;
          const responseUser = await axios.get(`/users/${this.id}`, { withCredentials: true });
          
          if (responseUser.status === 200 && responseUser.data) {
            this.user = responseUser.data;
            
            // Use server profilePicture if available, otherwise use localStorage fallback
            if (responseUser.data.profilePicture) {
              this.profilePicture = responseUser.data.profilePicture;
              // Clean up localStorage if server has the correct data
              if (savedAvatar && savedAvatar !== responseUser.data.profilePicture) {
                localStorage.removeItem(localStorageKey);
              }
            } else if (savedAvatar) {
              this.profilePicture = savedAvatar;
              // Update user object to include the saved avatar
              this.user.profilePicture = savedAvatar;
              console.log(`ProfileImage: Using localStorage fallback for user ${this.id}:`, savedAvatar);
            }
            
            this.$store?.commit('CACHE_USER', this.user);
          }
        } catch (error) {
          // If API fails, try localStorage fallback
          if (savedAvatar) {
            this.profilePicture = savedAvatar;
            console.log(`ProfileImage: API failed, using localStorage fallback for user ${this.id}:`, savedAvatar);
          } else {
            console.error('Load user profile image error:', error);
          }
        }
      } catch (error) {
        console.error('Load user profile image error:', error);
        // Don't throw the error, just use default profile image
      }
    }
  },
};
</script>

<style scoped>
.image-post__avatar {
  width: 40px;
  height: 40px;
  border-radius: 100%;
  object-fit: cover;
}
</style>
