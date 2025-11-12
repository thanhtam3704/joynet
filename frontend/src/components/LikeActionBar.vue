<template>
  <div class="post-actions">
    <div 
      class="like-btn-wrapper"
      @mouseenter="handleWrapperEnter"
      @mouseleave="handleWrapperLeave"
    >
      <button 
        class="action-btn like-btn" 
        @click="toggleCurrentReaction"
        :disabled="reactionLoading"
      >
        <span class="action-icon">{{ getReactionEmoji(userReaction || 'like') }}</span>
        <span :class="{ reacted: userReaction }" :style="{ color: getReactionColor(userReaction) }">
          {{ getReactionLabel(userReaction) }}
        </span>
      </button>
      
      <ReactionPicker
        v-if="showPicker"
        @select="onReact"
      />
    </div>

    <button v-if="showComment" class="action-btn comment-btn" @click="$emit('comment')">
      <span class="action-icon">💬</span>
      <span>Bình luận</span>
    </button>
  </div>
</template>

<script>
import { createToast } from "mosha-vue-toastify";
import ReactionPicker from "./ReactionPicker.vue";

export default {
  name: "LikeActionBar",
  components: {
    ReactionPicker,
  },
  props: {
    postId: { type: String, required: true },
    initialLiked: { type: Boolean, default: false },
    initialLikesCount: { type: Number, default: 0 },
    initialUserReaction: { type: String, default: null }, // like, love, haha, wow, sad, angry
    initialReactionsCount: { type: Object, default: () => ({}) },
    showComment: { type: Boolean, default: true },
  },
  emits: ["updated", "comment"],
  data() {
    return {
      userReaction: this.initialUserReaction,
      reactionsCount: { ...this.initialReactionsCount },
      likesCount: Number(this.initialLikesCount) || 0,
      reactionLoading: false,
      showPicker: false,
      pickerTimeout: null,
    };
  },
  watch: {
    initialUserReaction(val) {
      this.userReaction = val;
    },
    initialReactionsCount(val) {
      this.reactionsCount = { ...val };
    },
    initialLikesCount(val) {
      this.likesCount = Number(val) || 0;
    },
  },
  methods: {
    handleWrapperEnter() {
      clearTimeout(this.pickerTimeout);
      this.showPicker = true;
    },
    handleWrapperLeave() {
      this.pickerTimeout = setTimeout(() => {
        this.showPicker = false;
      }, 300);
    },
    toggleCurrentReaction() {
      // Nếu đã có reaction, click để remove (bỏ react)
      // Nếu chưa có, click để thêm like
      if (this.userReaction) {
        // Remove reaction: gửi null hoặc reaction type giống với hiện tại để backend xóa
        this.onReact(this.userReaction);
      } else {
        // Thêm like mới
        this.onReact('like');
      }
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
    getReactionLabel(reactionType) {
      const labelMap = {
        like: "Thích",
        love: "Yêu thích",
        haha: "Haha",
        wow: "Wow",
        sad: "Buồn",
        angry: "Phẫn nộ",
      };
      return reactionType ? labelMap[reactionType] : "Thích";
    },
    getReactionColor(reactionType) {
      const colorMap = {
        like: "#667eea",
        love: "#e63946",
        haha: "#f77f00",
        wow: "#06ffa5",
        sad: "#4895ef",
        angry: "#d62828",
      };
      return reactionType ? colorMap[reactionType] : "#6b7280";
    },
    async onReact(reactionType) {
      if (this.reactionLoading) return;
      
      this.showPicker = false;
      clearTimeout(this.pickerTimeout);

      const currentUserId = this.$store?.state?.user?._id;
      if (!currentUserId) {
        createToast(
          { title: "Bạn cần đăng nhập để thả cảm xúc" },
          { type: "warning", showIcon: true }
        );
        return;
      }

      this.reactionLoading = true;
      try {
        const { reactToPost } = await import("@/api/posts");
        const res = await reactToPost(this.postId, currentUserId, reactionType);
        
        console.log('reactToPost API response:', res.data);
        
        if (res.status === 200) {
          // Dùng trực tiếp data từ response thay vì query lại
          const userReaction = res.data.userReaction || null;
          const reactionsCount = res.data.reactionsCount || {};
          const likesCount = res.data.likesCount || 0;

          // Update local state
          this.userReaction = userReaction;
          this.reactionsCount = reactionsCount;
          this.likesCount = likesCount;

          console.log('LikeActionBar updated:', {
            postId: this.postId,
            userReaction,
            reactionsCount,
            likesCount
          });

          // Sync to store for Timeline
          this.$store.commit("UPDATE_POST_LIKE", {
            postId: this.postId,
            isLiked: !!userReaction,
            likesCount,
            userReaction,
            reactionsCount,
          });

          // Notify parent (e.g., PostDetail) to sync local vars
          this.$emit("updated", { 
            isLiked: !!userReaction, 
            likesCount,
            userReaction,
            reactionsCount,
          });
          
          // Trigger notification refresh if user reacted to someone else's post
          if (userReaction) {
            if (window.refreshNotifications && typeof window.refreshNotifications === 'function') {
              window.refreshNotifications();
            }
          }
        }
      } catch (err) {
        console.error("React error:", err);
        createToast(
          { title: "Không thể cập nhật cảm xúc" },
          { type: "error", showIcon: true }
        );
      } finally {
        this.reactionLoading = false;
      }
    },
  },
};
</script>

<style scoped>
.post-actions {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 0.5rem 0;
  margin: 0;
}

.like-btn-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  justify-content: center;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  padding: 0.625rem 1.25rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #6b7280;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex: 1;
  justify-content: center;
}

.action-btn:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
  color: #667eea;
  transform: translateY(-1px);
}

.action-icon {
  font-size: 1.25rem;
  transition: transform 0.3s ease;
}

.action-btn:hover .action-icon {
  transform: scale(1.1);
}

.reacted {
  font-weight: 700;
}

/* ========== RESPONSIVE DESIGN ========== */

@media (max-width: 768px) {
  .post-actions {
    padding: 0.6rem 0;
    margin: 0.75rem 0;
  }

  .action-btn {
    padding: 0.4rem 0.75rem;
    font-size: 0.85rem;
    gap: 0.4rem;
  }

  .action-icon {
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .post-actions {
    padding: 0.5rem 0;
    margin: 0.6rem 0;
  }

  .action-btn {
    padding: 0.35rem 0.5rem;
    font-size: 0.8rem;
    gap: 0.3rem;
  }

  .action-icon {
    font-size: 0.95rem;
  }

  .action-btn span:not(.action-icon) {
    display: none;
  }
}

@media (max-width: 360px) {
  .action-btn {
    padding: 0.3rem 0.4rem;
  }

  .action-icon {
    font-size: 0.9rem;
  }
}
</style>
