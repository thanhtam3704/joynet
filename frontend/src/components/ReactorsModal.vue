<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2 class="modal-title">Cảm xúc về bài viết</h2>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <!-- Tabs for reaction types -->
      <div class="reaction-tabs">
        <button
          class="reaction-tab"
          :class="{ active: selectedTab === 'all' }"
          @click="selectTab('all')"
        >
          <span class="tab-label">Tất cả</span>
          <span class="tab-count">{{ allCount }}</span>
        </button>
        <button
          v-for="reaction in availableReactions"
          :key="reaction.type"
          class="reaction-tab"
          :class="{ active: selectedTab === reaction.type }"
          @click="selectTab(reaction.type)"
        >
          <span class="tab-emoji">{{ reaction.emoji }}</span>
          <span class="tab-count">{{ reaction.count }}</span>
        </button>
      </div>

      <!-- Reactors list -->
      <div class="reactors-list" v-if="!loading">
        <div
          v-for="reactor in currentReactors"
          :key="reactor._id"
          class="reactor-item"
          @click="navigateToProfile(reactor._id)"
        >
          <img
            :src="getProfilePicture(reactor)"
            :alt="reactor.username"
            class="reactor-avatar"
          />
          <div class="reactor-info">
            <span class="reactor-name">{{ reactor.username }}</span>
          </div>
          <span class="reactor-reaction">{{ getReactionEmoji(reactor.reactionType) }}</span>
        </div>
        <div v-if="currentReactors.length === 0" class="empty-state">
          Chưa có ai thả cảm xúc
        </div>
      </div>

      <div v-else class="loading-state">
        <div class="spinner"></div>
        Đang tải...
      </div>
    </div>
  </div>
</template>

<script>
import { getReactors } from "@/api/posts";

export default {
  name: "ReactorsModal",
  props: {
    postId: {
      type: String,
      required: true,
    },
    reactionsCount: {
      type: Object,
      default: () => ({}),
    },
    initialTab: {
      type: String,
      default: "all",
    },
  },
  emits: ["close"],
  data() {
    return {
      selectedTab: this.initialTab,
      reactorsByType: {}, // { all: [...], like: [...], love: [...] }
      loading: false,
    };
  },
  computed: {
    allCount() {
      return Object.values(this.reactionsCount).reduce((sum, count) => sum + count, 0);
    },
    availableReactions() {
      const reactions = [
        { type: "like", emoji: "👍", label: "Thích" },
        { type: "love", emoji: "❤️", label: "Yêu thích" },
        { type: "haha", emoji: "😂", label: "Haha" },
        { type: "wow", emoji: "😮", label: "Wow" },
        { type: "sad", emoji: "😢", label: "Buồn" },
        { type: "angry", emoji: "😠", label: "Phẫn nộ" },
      ];
      return reactions
        .map(r => ({
          ...r,
          count: this.reactionsCount[r.type] || 0,
        }))
        .filter(r => r.count > 0);
    },
    currentReactors() {
      return this.reactorsByType[this.selectedTab] || [];
    },
  },
  async mounted() {
    // Disable body scroll khi modal mở
    document.body.style.overflow = 'hidden';
    await this.loadReactors(this.selectedTab);
  },
  beforeUnmount() {
    // Enable lại body scroll khi modal đóng
    document.body.style.overflow = '';
  },
  methods: {
    async selectTab(tab) {
      this.selectedTab = tab;
      if (!this.reactorsByType[tab]) {
        await this.loadReactors(tab);
      }
    },
    async loadReactors(type) {
      this.loading = true;
      try {
        const reactionType = type === "all" ? null : type;
        const response = await getReactors(this.postId, reactionType);
        if (response.status === 200) {
          this.reactorsByType[type] = response.data.reactors || [];
        }
      } catch (error) {
        console.error("Load reactors error:", error);
      } finally {
        this.loading = false;
      }
    },
    getProfilePicture(user) {
      return user.profilePicture
        ? `http://localhost:3000/uploads/user/${user.profilePicture}`
        : "https://via.placeholder.com/40";
    },
    getReactionEmoji(reactionType) {
      const emojiMap = {
        like: "👍",
        love: "❤️",
        haha: "😂",
        wow: "😮",
        sad: "😢",
        angry: "😠",
      };
      return emojiMap[reactionType] || "👍";
    },
    navigateToProfile(userId) {
      this.$emit('close');
      this.$router.push({ name: 'Profile', params: { id: userId } });
    },
  },
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999999;
  animation: fadeIn 0.2s ease;
  overflow-y: auto;
  padding: 1rem;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 48px rgba(102, 126, 234, 0.2);
  animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  margin: auto;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(102, 126, 234, 0.1);
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
  color: #667eea;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
  transform: rotate(90deg);
}

.reaction-tabs {
  display: flex;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(102, 126, 234, 0.1);
  overflow-x: auto;
}

.reaction-tab {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  border: 1px solid rgba(102, 126, 234, 0.15);
  border-radius: 20px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.reaction-tab:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  border-color: rgba(102, 126, 234, 0.3);
}

.reaction-tab.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: transparent;
  color: white;
}

.tab-emoji {
  font-size: 1.125rem;
}

.tab-label,
.tab-count {
  font-size: 0.875rem;
  font-weight: 600;
}

.tab-count {
  opacity: 0.8;
}

.reactors-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.5rem;
}

.reactor-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 12px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.reactor-item:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.04) 0%, rgba(118, 75, 162, 0.04) 100%);
  transform: translateX(4px);
}

.reactor-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid transparent;
  background: linear-gradient(white, white) padding-box,
    linear-gradient(135deg, #667eea, #764ba2) border-box;
}

.reactor-info {
  flex: 1;
}

.reactor-name {
  font-weight: 600;
  color: #1f2937;
}

.reactor-reaction {
  font-size: 1.25rem;
}

.empty-state,
.loading-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
}

.spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 1rem;
  border: 4px solid rgba(102, 126, 234, 0.1);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Scrollbar */
.reactors-list::-webkit-scrollbar {
  width: 6px;
}

.reactors-list::-webkit-scrollbar-track {
  background: rgba(102, 126, 234, 0.05);
  border-radius: 10px;
}

.reactors-list::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
}

/* ========== RESPONSIVE ========== */

@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    max-height: 80vh;
  }

  .modal-header {
    padding: 1rem 1.25rem;
  }

  .modal-title {
    font-size: 1.125rem;
  }

  .reaction-tabs {
    padding: 0.75rem 1.25rem;
  }

  .reactors-list {
    padding: 0.75rem 1.25rem;
  }
}
</style>
