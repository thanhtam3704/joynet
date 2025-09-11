<template>
  <img
    v-if="profilePicture"
    class="image-post__avatar"
    :src="`http://localhost:3000/uploads/user/${profilePicture}`"
  />
  <img v-else class="image-post__avatar" src="../assets/defaultProfile.png" />
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
      const responseUser = await fetch(
        `http://localhost:3000/api/users/${this.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      if (responseUser.ok) {
        this.user = await responseUser.json();
        this.profilePicture = this.user.profilePicture;
      }
    } catch (error) {
      console.error("Fetch user profile image error:", error);
    }
  },
};
</script>

<style scoped>
.image-post__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}
</style>
