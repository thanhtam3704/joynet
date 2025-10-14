<template>
  <div class="user-post-name">
    <a>
      {{ displayName }}
    </a>
  </div>
</template>

<script>
export default {
  name: "PostDisplayName",
  props: ["id"],
  data() {
    return {
      user: [],
      displayName: "",
    };
  },
  async created() {
    await this.loadUserDisplayName();
  },
  watch: {
    id: {
      handler(newId) {
        if (newId) {
          this.loadUserDisplayName();
        }
      },
      immediate: false
    }
  },
  methods: {
    async loadUserDisplayName() {
      try {
        // Check if id is valid
        if (!this.id) {
          console.warn('PostDisplayName: No user ID provided');
          this.displayName = 'Unknown User';
          return;
        }

        // Check if id is a valid MongoDB ObjectId format
        if (!this.id.match(/^[0-9a-fA-F]{24}$/)) {
          console.warn('PostDisplayName: Invalid user ID format:', this.id);
          this.displayName = 'Unknown User';
          return;
        }

        const cached = this.$store?.state?.usersById?.[this.id];
        if (cached) {
          this.user = cached;
          this.displayName = cached.displayName || cached.email || 'Unknown User';
          return;
        }
        
        const axios = (await import('@/utils/axios')).default;
        const response = await axios.get(`/users/${this.id}`, { withCredentials: true });
        if (response.status === 200 && response.data) {
          this.user = response.data;
          this.displayName = this.user.displayName || this.user.email || 'Unknown User';
          this.$store?.commit('CACHE_USER', this.user);
        }
      } catch (error) {
        console.error('Load user error:', error);
        this.displayName = 'Unknown User';
      }
    }
  },
};
</script>

<style scoped>
.user-post-name {
  font-weight: bold;
  font-size: 1rem;
}
</style>
