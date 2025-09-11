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
        <div class="home__timeline">
          <Timeline @show-post-detail="openModal" />
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
        />
      </div>
    </div>
  </div>
</template>

<script>
import SidebarRight from "@/components/SidebarRight";
import SidebarLeft from "@/components/SidebarLeft";
import Timeline from "@/components/Timeline";
import TheHeader from "@/components/TheHeader";
import TheFooter from "@/components/TheFooter";
import PostDetail from "@/components/PostDetail";
import Post from "@/components/Post";

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
  },
  data() {
    return {
      currentUser: this.$store.state.user._id,
      showModal: false,
      selectedPostId: null,
    };
  },
  computed: {
    user() {
      return this.$store.state.user;
    },
  },
  mounted() {
    this.$store.dispatch("fetchUser");
  },
  provide() {
    return {
      id: this.$store.state.user._id,
    };
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
  },
};
</script>

<style scoped>
.home__content {
  display: grid;
  grid-template-columns: 3fr 10fr 4fr;
  grid-gap: 3.3rem;
}

.home__container {
  border-radius: 2rem;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 800px;
  margin-top: 6rem;
}

.home__post {
  margin-bottom: 2rem;
}

.home__timeline {
  flex-grow: 1;
}

.home__right-sidebar {
  margin-right: 1rem;
  margin-top: 5rem;
}

.home__left-sidebar {
  margin-top: 5rem;
}

/* Modal styling */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 1rem;
  width: 90%;
  max-width: 650px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease;
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

@keyframes slideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
