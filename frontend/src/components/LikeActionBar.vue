<template>
  <div class="post-actions">
    <button class="action-btn like-btn" @click="onToggle" :disabled="likeLoading">
      <span class="action-icon">👍</span>
      <span :class="{ liked: isLiked }">Thích</span>
    </button>

    <button v-if="showComment" class="action-btn comment-btn" @click="$emit('comment')">
      <span class="action-icon">💬</span>
      <span>Bình luận</span>
    </button>
  </div>
</template>

<script>
import { createToast } from "mosha-vue-toastify";

export default {
  name: "LikeActionBar",
  props: {
    postId: { type: String, required: true },
    initialLiked: { type: Boolean, default: false },
    initialLikesCount: { type: Number, default: 0 },
    showComment: { type: Boolean, default: true },
  },
  emits: ["updated", "comment"],
  data() {
    return {
      isLiked: !!this.initialLiked,
      likesCount: Number(this.initialLikesCount) || 0,
      likeLoading: false,
    };
  },
  watch: {
    initialLiked(val) {
      this.isLiked = !!val;
    },
    initialLikesCount(val) {
      this.likesCount = Number(val) || 0;
    },
  },
  methods: {
    async onToggle() {
      if (this.likeLoading) return;
      const currentUserId = this.$store?.state?.user?._id;
      if (!currentUserId) {
        createToast(
          { title: "Bạn cần đăng nhập để thích bài viết" },
          { type: "warning", showIcon: true }
        );
        return;
      }
      this.likeLoading = true;
      try {
        const { toggleLike, getLikeStatus } = await import("@/api/posts");
        const res = await toggleLike(this.postId, currentUserId);
        if (res.status === 200) {
          let isLiked = this.isLiked;
          let likesCount = this.likesCount;
          try {
            const s = await getLikeStatus(this.postId, currentUserId);
            if (s.status === 200) {
              isLiked = !!s.data?.isLiked;
              likesCount = typeof s.data?.likesCount === "number" ? s.data.likesCount : likesCount;
            }
          } catch (_) {
            isLiked = !!res.data?.isLiked;
            likesCount = typeof res.data?.likesCount === "number" ? res.data.likesCount : likesCount;
          }

          // Update local state
          this.isLiked = isLiked;
          this.likesCount = likesCount;

          // Sync to store for Timeline
          this.$store.commit("UPDATE_POST_LIKE", {
            postId: this.postId,
            isLiked,
            likesCount,
          });

          // Notify parent (e.g., PostDetail) to sync local vars
          this.$emit("updated", { isLiked, likesCount });
          
          // Trigger notification refresh if user liked someone else's post
          if (isLiked) {
            // Call global refresh function if available
            if (window.refreshNotifications && typeof window.refreshNotifications === 'function') {
              window.refreshNotifications();
            }
          }
        }
      } catch (err) {
        console.error("Toggle like error:", err);
        createToast(
          { title: "Không thể cập nhật lượt thích" },
          { type: "error", showIcon: true }
        );
      } finally {
        this.likeLoading = false;
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
  padding: 0.75rem 0;
  margin: 1rem 0;
  border-top: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  color: #666;
  transition: all 0.3s ease;
  flex: 1;
  justify-content: center;
}

.action-btn:hover {
  background-color: #f0f0f0;
  color: #333;
}

.action-icon {
  font-size: 1.1rem;
}

.liked {
  color: #007bff !important;
}
</style>
