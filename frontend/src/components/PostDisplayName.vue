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
    try {
      const cached = this.$store?.state?.usersById?.[this.id];
      if (cached) {
        this.user = cached;
        this.displayName = cached.displayName;
        return;
      }
      const axios = (await import('@/utils/axios')).default;
      const response = await axios.get(`/users/${this.id}`, { withCredentials: true });
      if (response.status === 200 && response.data) {
        this.user = response.data;
        this.displayName = this.user.displayName;
        this.$store?.commit('CACHE_USER', this.user);
      }
    } catch (error) {
      console.error('Load user error:', error);
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
