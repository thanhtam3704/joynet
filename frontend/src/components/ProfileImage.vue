<template>
  <img
    v-if="profilePicture"
    class="image-post__avatar"
    :src="`http://localhost:3000/uploads/user/${profilePicture}`"
  />
  <img v-else class="image-post__avatar" src="@/assets/defaultProfile.png" />
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
  async created() {
    try {
      const cached = this.$store?.state?.usersById?.[this.id];
      if (cached) {
        this.user = cached;
        this.profilePicture = cached.profilePicture;
        return;
      }
      const axios = (await import('@/utils/axios')).default;
      const responseUser = await axios.get(`/users/${this.id}`, { withCredentials: true });
      if (responseUser.status === 200 && responseUser.data) {
        this.user = responseUser.data;
        this.profilePicture = this.user.profilePicture;
        this.$store?.commit('CACHE_USER', this.user);
      }
    } catch (error) {
      console.error('Load user profile image error:', error);
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
