<template>
  <div class="profile">
    <TheHeader />
    <div class="profile__content">
      <div class="profile__left-sidebar">
        <SidebarLeft :currentUser="currentUser" />
      </div>
      <div class="profile__container">
        <ProfileDetail ref="profileDetail" :id="id" @show-post-detail="openModal" />
      </div>
      <div class="profile__right-sidebar">
        <SidebarRight :currentUser="currentUser" />
      </div>
    </div>
    <TheFooter />

    <!-- Modal PostDetail -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <PostDetail
          v-if="selectedPostId"
          :id="selectedPostId"
          @close="closeModal"
          @comment-added="handleCommentAdded"
        />
      </div>
    </div>
  </div>
</template>

<script>
import SidebarLeft from "@/components/SidebarLeft";
import SidebarRight from "@/components/SidebarRight";
import TheHeader from "@/components/TheHeader";
import ProfileDetail from "@/views/profile/components/ProfileDetail.vue";
import PostDetail from "@/views/post/components/PostDetail.vue";
import TheFooter from "@/components/TheFooter";

export default {
  name: "Profile",
  props: ["id"],
  components: {
    SidebarLeft,
    SidebarRight,
    TheHeader,
    ProfileDetail,
    PostDetail,
    TheFooter,
  },
  data() {
    return {
      showModal: false,
      selectedPostId: null,
    };
  },
  computed: {
    currentUser() {
      return this.$store.state.user?._id;
    },
  },
  watch: {
    // Khi route params thay đổi (chuyển từ profile này sang profile khác)
    "$route.params.id": {
      handler(newId, oldId) {
        if (newId !== oldId) {
          // Force re-render component khi ID thay đổi
          this.$nextTick(() => {
            this.$forceUpdate();
          });
        }
      },
      immediate: true,
    },
  },
  methods: {
    openModal(postId) {
      this.selectedPostId = postId;
      this.showModal = true;
      // Ngăn chặn cuộn trang khi modal mở
      document.body.style.overflow = "hidden";

      // Thêm event listener cho phím ESC
      window.addEventListener("keydown", this.handleEscKey);
    },
    closeModal() {
      this.showModal = false;
      this.selectedPostId = null;
      // Cho phép cuộn trang lại khi modal đóng
      document.body.style.overflow = "";

      // Xóa event listener khi đóng modal
      window.removeEventListener("keydown", this.handleEscKey);
    },
    handleEscKey(event) {
      // Đóng modal khi nhấn phím ESC
      if (event.key === "Escape" && this.showModal) {
        this.closeModal();
      }
    },
    handleCommentAdded(data) {
      // Emit event to ProfileDetail component to update post commentsCount
      this.$refs.profileDetail?.updatePostCommentsCount(data.postId, data.newCommentsCount);
    },
  },
};
</script>

<style scoped>
.profile {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%);
}

.profile__content {
  display: grid;
  grid-template-columns: 280px 1fr 320px;
  gap: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem 2rem;
  align-items: start;
}

.profile__left-sidebar {
  position: sticky;
  top: 80px;
  align-self: start;
}

.profile__container {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.profile__right-sidebar {
  position: sticky;
  top: 80px;
  align-self: start;
}

/* Modal styling */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(17, 24, 39, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-content {
  background: var(--white);
  border-radius: 18px;
  padding: 0;
  width: 90%;
  max-width: 700px;
  max-height: 85vh;
  overflow: hidden;
  box-shadow: 
    0 25px 50px -12px rgba(102, 126, 234, 0.25),
    0 0 0 1px rgba(102, 126, 234, 0.1);
  animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
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
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ========== RESPONSIVE DESIGN ========== */

/* Large Desktop - 1440px and above */
@media (min-width: 1440px) {
  .profile__content {
    max-width: 1600px;
    gap: 2.5rem;
    padding: 2rem 3rem;
  }

  .profile__container {
    max-width: 900px;
  }
}

/* Desktop - 1200px to 1439px */
@media (min-width: 1200px) and (max-width: 1439px) {
  .profile__content {
    grid-template-columns: 260px 1fr 300px;
    gap: 2rem;
  }
}

/* Tablet Large - 1024px and below */
@media (max-width: 1199px) {
  .profile__content {
    grid-template-columns: 240px 1fr 280px;
    gap: 1.5rem;
    padding: 1.5rem 1.5rem;
  }
}

/* Tablet - 768px and below */
@media (max-width: 1023px) {
  .profile__content {
    grid-template-columns: 1fr;
    gap: 1.5rem;
    padding: 1rem;
  }

  .profile__left-sidebar,
  .profile__right-sidebar {
    display: none;
  }

  .profile__container {
    width: 100%;
    max-width: 100%;
  }
}

/* Mobile - 480px and below */
@media (max-width: 767px) {
  .profile__content {
    padding: 1rem 0.75rem;
    gap: 1rem;
  }
}

/* Extra Small Mobile - 360px and below */
@media (max-width: 480px) {
  .profile__content {
    padding: 0.75rem 0.5rem;
  }
}
</style>
