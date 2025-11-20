<template>
  <div>
    <div class="post">
      <div class="post-header">
        <div class="header__user">
          <img
            v-if="user.profilePicture"
            class="image-post__img"
            :src="user.profilePicture"
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
    </div>
    
    <!-- Teleport modal ra ngoài body -->
    <Teleport to="body">
      <AddPost v-if="showAddImagePost" @close="toggleAddImagePost" />
    </Teleport>
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
    };
  },
  computed: {
    user() {
      return this.$store.state.user || { profilePicture: "" };
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
  padding: 1.25rem;
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: var(--radius-2xl);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.post:hover {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  transform: translateY(-2px);
  border-color: rgba(102, 126, 234, 0.2);
}

.post-header {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.header__user {
  flex-shrink: 0;
}

.image-post__img {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  object-fit: cover;
  border: 2px solid var(--white);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.image-post__img:hover {
  transform: scale(1.05);
}

.post-input {
  flex-grow: 1;
  padding: 0.875rem 1.125rem;
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-full);
  cursor: pointer;
  font-size: 0.9375rem;
  background: var(--gray-50);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.post-input::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.post-input span {
  color: var(--gray-500);
  font-weight: 500;
  position: relative;
  z-index: 1;
}

.post-input:hover {
  background: var(--white);
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
  transform: scale(1.01);
}

.post-input:hover::before {
  opacity: 1;
}

/* ========== RESPONSIVE DESIGN ========== */

@media (max-width: 768px) {
  .post {
    padding: 1rem;
    border-radius: var(--radius-xl);
  }

  .post-header {
    gap: 0.75rem;
  }

  .post-input {
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
  }

  .image-post__img {
    width: 36px;
    height: 36px;
  }
}

@media (max-width: 480px) {
  .post {
    padding: 0.875rem;
    border-radius: var(--radius-lg);
  }

  .post-header {
    gap: 0.625rem;
  }

  .post-input {
    padding: 0.625rem 0.875rem;
    font-size: 0.8125rem;
  }

  .post-input span {
    font-size: 0.8125rem;
  }

  .image-post__img {
    width: 32px;
    height: 32px;
  }
}
</style>
