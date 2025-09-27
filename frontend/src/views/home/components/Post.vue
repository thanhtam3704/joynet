<template>
  <div class="post">
    <div class="post-header">
      <div class="header__user">
        <img
          v-if="user.profilePicture"
          class="image-post__img"
          :src="`http://localhost:3000/uploads/user/${user.profilePicture}`"
        />
        <img
          v-else
          class="image-post__img"
          src="@/assets/defaultProfile.png"
        />
      </div>
      <div class="post-input" @click="toggleAddImagePost">
        <span>Bạn đang nghĩ gì?</span>
      </div>
    </div>
  <AddPost v-if="showAddImagePost" @close="toggleAddImagePost" />
  </div>
</template>

<script>
import AddPost from "@/components/AddPost.vue";

export default {
  name: "Post",
  components: {
  AddPost,
  },
  data() {
    return {
      showAddImagePost: false,
      user: {
        profilePicture: "", // Replace with dynamic user data
      },
    };
  },
  computed: {
    user() {
      return this.$store.state.user;
    },
  },
  methods: {
    toggleAddImagePost() {
      this.showAddImagePost = !this.showAddImagePost;
    },
  },
};
</script>

<style scoped>
.post {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 20px 20px 20px 20px;
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.post-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.post-input {
  flex-grow: 1;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 20px;
  cursor: pointer;
  font-size: 1rem;
  background-color: #f9f9f9;
}

.post-input span {
  color: gray;
}

.post-input:hover {
  background-color: #f0f0f0;
}
</style>
