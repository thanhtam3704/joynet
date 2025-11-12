<template>
  <div class="home">
    <TheHeader :currentUser="user._id" />
    <div class="home__content">
      <div class="home__left-sidebar">
        <SidebarLeft :currentUser="user._id" />
      </div>
      <div class="home__container">
        <div class="home__post">
          <Post />
        </div>
        <div class="home__following">
          <FollowingSuggestions />
        </div>
        <div class="home__timeline">
          <Timeline ref="timeline" @show-post-detail="openModal" />
        </div>
      </div>
      <div class="home__right-sidebar">
        <SidebarRight />
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

    <!-- Floating New Message Button -->
    <div class="floating-new-message" @click="showNewMessageModal = true" title="Tin nhắn mới">
      <i class="material-icons">edit</i>
    </div>

    <!-- New Message Modal -->
    <teleport to="body">
      <NewMessageModal 
        v-if="showNewMessageModal"
        @close="showNewMessageModal = false"
        @open-chat="handleOpenChat"
      />
    </teleport>

    <!-- Chat Popups Manager -->
    <ChatPopupsManager ref="chatPopupsManager" />
  </div>
</template>

<script>
import SidebarRight from "@/components/SidebarRight";
import SidebarLeft from "@/components/SidebarLeft";
import Timeline from "./components/Timeline.vue";
import TheHeader from "@/components/TheHeader";
import TheFooter from "@/components/TheFooter";
import PostDetail from "@/views/post/components/PostDetail.vue";
import Post from "./components/Post.vue";
import NewMessageModal from "@/components/NewMessageModal.vue";
import ChatPopupsManager from "@/components/ChatPopupsManager.vue";
import FollowingSuggestions from "@/components/FollowingSuggestions.vue";

export default {
  name: "Home",
  components: {
    SidebarLeft,
    SidebarRight,
    Timeline,
    TheHeader,
    TheFooter,
    PostDetail,
    Post,
    NewMessageModal,
    ChatPopupsManager,
    FollowingSuggestions,
  },
  data() {
    return {
      showModal: false,
      selectedPostId: null,
      showNewMessageModal: false,
    };
  },
  computed: {
    user() {
      return this.$store.state.user;
    },
    currentUser() {
      return this.$store.state.user?._id;
    }
  },
  mounted() {
    // Only load user if token exists (should already be loaded by App.vue)
    const token = localStorage.getItem('token');
    if (token && !this.$store.state.user) {
      this.$store.dispatch("loadUser");
    }
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
      // Emit event to Timeline component to update post commentsCount
      this.$refs.timeline?.updatePostCommentsCount(data.postId, data.newCommentsCount);
    },
    handleOpenChat(conversation) {
      // Open chat popup
      this.$refs.chatPopupsManager?.openChat(conversation);
      this.showNewMessageModal = false;
    },
  },
};
</script>

<style scoped>
.home__content {
  display: grid;
  grid-template-columns: 3fr 10fr 3fr;
  grid-gap: 2rem;
  padding: 0 1rem;
}

.home__container {
  border-radius: var(--radius-2xl);
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-top: 5.5rem;
}

.home__post {
  margin-bottom: 1.5rem;
  animation: fadeIn 0.4s ease-out;
}

.home__timeline {
  flex-grow: 1;
  animation: fadeIn 0.5s ease-out 0.1s both;
}

.home__right-sidebar {
  position: sticky;
  top: 5rem;
  height: fit-content;
  max-height: calc(100vh - 6rem);
  overflow-y: auto;
  margin-right: 1rem;
  animation: fadeIn 0.5s ease-out 0.2s both;
}

.home__left-sidebar {
  position: sticky;
  top: 5rem;
  height: fit-content;
  max-height: calc(100vh - 6rem);
  overflow-y: auto;
  animation: fadeIn 0.5s ease-out 0.15s both;
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
  .home__content {
    grid-template-columns: 280px 1fr 320px;
    grid-gap: 2rem;
    max-width: 1600px;
    margin: 0 auto;
  }
}

/* Desktop - 1200px to 1439px */
@media (max-width: 1439px) {
  .home__content {
    grid-template-columns: 260px 1fr 280px;
    grid-gap: 2rem;
  }
}

/* Tablet Large - 1024px and below */
@media (max-width: 1024px) {
  .home__content {
    grid-template-columns: 220px 1fr 260px;
    grid-gap: 1.5rem;
  }

  .home__container {
    margin-top: 5rem;
  }

  .home__right-sidebar,
  .home__left-sidebar {
    margin-top: 4.5rem;
  }
}

/* Tablet - 768px and below */
@media (max-width: 768px) {
  .home__content {
    grid-template-columns: 1fr 3fr 1fr;
    grid-gap: 0.5rem;
    padding: 0 0.5rem;
  }

  .home__container {
    margin-top: 4rem;
    width: 100%;
  }

  .home__post {
    margin-bottom: 1.5rem;
  }

  /* Modal responsive */
  .modal-content {
    width: 95%;
    max-width: 550px;
    padding: 0.75rem;
  }
}

/* Mobile - 480px and below */
@media (max-width: 480px) {
  .home__content {
    padding: 0 0.5rem;
  }

  .home__container {
    margin-top: 3.5rem;
    min-height: auto;
  }

  .home__post {
    margin-bottom: 1rem;
  }

  /* Modal responsive */
  .modal-content {
    width: 98%;
    max-height: 90vh;
    padding: 0.5rem;
    border-radius: 8px;
  }
}

/* Extra Small Mobile - 360px and below */
@media (max-width: 360px) {
  .home__content {
    padding: 0 0.25rem;
  }

  .home__container {
    margin-top: 3rem;
  }
}

/* Floating New Message Button */
.floating-new-message {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 
    0 10px 25px rgba(102, 126, 234, 0.4),
    0 4px 10px rgba(0, 0, 0, 0.2);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 999;
}

.floating-new-message:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 
    0 15px 35px rgba(102, 126, 234, 0.5),
    0 6px 15px rgba(0, 0, 0, 0.3);
}

.floating-new-message:active {
  transform: translateY(-2px) scale(1.02);
}

.floating-new-message i {
  font-size: 24px;
  transition: transform 0.3s ease;
}

.floating-new-message:hover i {
  transform: rotate(90deg);
}

/* Responsive cho floating button */
@media (max-width: 768px) {
  .floating-new-message {
    bottom: 16px;
    right: 16px;
    width: 48px;
    height: 48px;
  }

  .floating-new-message i {
    font-size: 20px;
  }
}

@media (max-width: 480px) {
  .floating-new-message {
    bottom: 12px;
    right: 12px;
  }
}
</style>
