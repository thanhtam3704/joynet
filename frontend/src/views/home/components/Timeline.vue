<template>
  <div class="timeline">
    <!-- Các khối Skeletor để hiển thị hiệu ứng tải -->
    <Skeletor circle size="50" class="skeletor" v-if="isLoading" />
    <Skeletor v-if="isLoading" class="skeletor" width="100%" height="20" />
    <Skeletor v-if="isLoading" class="skeletor" width="100%" height="300" />

    <!-- Sau khi load xong sẽ hiển thị danh sách bài post -->
    <div
      class="timeline__post"
      v-for="post in posts"
      :key="post._id"
      :data-post-id="post._id"
    >
      <div class="post">
        <!-- ảnh đại diện user -->
        <div class="user-post-img">
          <ProfileImage :id="post.userId"  />
        </div>

        <!-- Nội dung bài post -->
        <div class="post__user-post">
          <PostDisplayName :id="post.userId" />
          <div class="user-post-desc">
            <p
              v-if="post.description"
              class="post__content"
              :data-post-id="post._id"
              :class="{
                'post__content--truncated':
                  isPostTruncated(post.description) &&
                  !isPostExpanded(post._id),
                'post__content--expanded': isPostExpanded(post._id),
              }"
            >
              {{ post.description }}
            </p>
            <button
              v-if="isPostTruncated(post.description)"
              @click.prevent.stop="toggleExpandPost(post._id)"
              class="read-more-link"
            >
              {{ isPostExpanded(post._id) ? "Thu gọn" : "Xem thêm" }}
            </button>
          </div>
          <div class="user-post-image" v-if="post.file">
            <img
              class="image-post__img"
              :src="`http://localhost:3000/uploads/${post.file}`"
            />
          </div>
        </div>
      </div>

      <!-- Stats row: likes + comments (Facebook-style) -->
      <div
        class="post-stats"
        v-if="(post.likesCount || 0) > 0 || commentsCountFor(post) > 0"
      >
        <HoverUserList :post-id="post._id" type="likes" :refresh-key="post.likesCount || 0">
          <div class="stats-likes" aria-label="Lượt thích">
            <span class="stats-like-icon">👍</span>
            <span class="stats-likes-number">{{ formatCompact(post.likesCount || 0) }}</span>
          </div>
        </HoverUserList>
        <HoverUserList :post-id="post._id" type="comments" :refresh-key="commentsCountFor(post)">
          <div
            class="stats-comments"
            @click="$emit('show-post-detail', post._id)"
            aria-label="Mở chi tiết bình luận"
          >
            {{ commentsCountFor(post) }} bình luận
          </div>
        </HoverUserList>
      </div>

      <!-- Action bar reused -->
      <LikeActionBar
        :post-id="post._id"
        :initial-liked="isLikedFor(post)"
        :initial-likes-count="post.likesCount || 0"
        :show-comment="true"
        @comment="$emit('show-post-detail', post._id)"
        @updated="({ isLiked, likesCount }) => $store.commit('UPDATE_POST_LIKE', { postId: post._id, isLiked, likesCount })"
      />
    </div>
  </div>
</template>

<script>
import ProfileImage from "@/components/ProfileImage";
import PostDisplayName from "@/components/PostDisplayName";
import LikeActionBar from "@/components/LikeActionBar.vue";
import { Skeletor } from "vue-skeletor";
import HoverUserList from '@/components/HoverUserList';
export default {
  name: "Timeline",
  components: { ProfileImage, Skeletor, PostDisplayName, LikeActionBar, HoverUserList },
  data() {
    return {
      isLoading: false,
      showPostDetail: false,
      selectedPostId: null,
      expandedPosts: {}, // Lưu trạng thái hiển thị đầy đủ của các bài post
  likeLoading: {},
      commentCounts: {}, // Cache đếm bình luận theo postId
    };
  },
  async mounted() {
    this.isLoading = true;
  await this.$store.dispatch("loadPosts");
    this.isLoading = false;

    // Khởi tạo trạng thái mở rộng cho tất cả các bài post
    if (this.posts && this.posts.length) {
      try {
        const initialExpanded = {};
        this.posts.forEach((post) => {
          initialExpanded[post._id] = false;
        });

        // Gán trực tiếp cho Vue 3
        this.expandedPosts = initialExpanded;
      } catch (error) {
        console.error("Error initializing expanded posts:", error);
      }
    }

    // Sau khi có posts, tải số lượng bình luận cho từng post
    try {
      await this.loadCommentCountsForPosts();
    } catch (err) {
      console.error('Failed to load comment counts:', err);
    }
  },
  computed: {
    posts() {
      return this.$store.state.posts;
    },
  },
  methods: {
    async loadCommentCountsForPosts() {
      try {
        const { getPostComments } = await import('@/api/posts');
        const tasks = (this.posts || []).map(async (p) => {
          try {
            const res = await getPostComments(p._id);
            const arr = Array.isArray(res?.data) ? res.data : (res?.data?.comments || []);
            this.$set ? this.$set(this.commentCounts, p._id, arr.length) : (this.commentCounts = { ...this.commentCounts, [p._id]: arr.length });
          } catch (_) {
            this.$set ? this.$set(this.commentCounts, p._id, p.commentsCount || 0) : (this.commentCounts = { ...this.commentCounts, [p._id]: p.commentsCount || 0 });
          }
        });
        await Promise.all(tasks);
      } catch (e) {
        // ignore global failure
      }
    },
    commentsCountFor(post) {
      if (!post) return 0;
      const cached = this.commentCounts[post._id];
      if (typeof cached === 'number') return cached;
      return post.commentsCount || 0;
    },
    formatCompact(num) {
      const n = Number(num) || 0;
      if (n >= 1000000000) return (n / 1000000000).toFixed(n % 1000000000 ? 1 : 0) + 'B';
      if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 ? 1 : 0) + 'M';
      if (n >= 1000) return (n / 1000).toFixed(n % 1000 ? 1 : 0) + 'K';
      return String(n);
    },
    isPostTruncated(description) {
      const maxLength = 200; // Giới hạn 200 ký tự
      return description && description.length > maxLength;
    },
    getTruncatedText(description) {
      const maxLength = 200;
      if (!description) return "";
      if (description.length <= maxLength) return description;

      // Cắt tại vị trí không phá vỡ từ
      let truncated = description.substring(0, maxLength);
      const lastSpaceIndex = truncated.lastIndexOf(" ");
      if (lastSpaceIndex > maxLength * 0.8) {
        // Chỉ cắt tại space nếu không quá ngắn
        truncated = truncated.substring(0, lastSpaceIndex);
      }

      return truncated + "...";
    },
    // like toggle logic moved into LikeActionBar
    isLikedFor(post) {
      const currentUserId = this.$store?.state?.user?._id;
      if (post && Array.isArray(post.likes)) {
        return post.isLiked || post.likes.includes(currentUserId);
      }
      return !!post?.isLiked;
    },
    toggleExpandPost(postId) {
      try {
        // Lấy trạng thái hiện tại hoặc false nếu chưa tồn tại
        const currentState = this.expandedPosts[postId] || false;

        // Tạo object mới bằng cách sao chép object hiện tại và thay đổi một thuộc tính
        // Phương pháp này hoạt động cho cả Vue 2 và Vue 3
        this.expandedPosts = {
          ...this.expandedPosts,
          [postId]: !currentState,
        };

        // Đảm bảo Vue nhận biết thay đổi (nhất là với Vue 2)
        this.$forceUpdate();

        // Debug log
        console.log(
          `Post ${postId} expanded:`,
          !currentState,
          this.expandedPosts
        );

        // Đợi DOM cập nhật sau khi mở rộng
        setTimeout(() => {
          // Tìm bài post hiện tại và scroll đến đó nếu đang mở rộng
          if (!currentState) {
            const postElement = document.querySelector(
              `[data-post-id="${postId}"]`
            );
            if (postElement) {
              postElement.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
              });
            }
          }
        }, 100);
      } catch (error) {
        console.error("Error in toggleExpandPost:", error);
      }
    },
    isPostExpanded(postId) {
      // Kiểm tra xem bài post có đang được hiển thị đầy đủ hay không
      // Đảm bảo trả về giá trị boolean rõ ràng
      try {
        // Sử dụng !! để chuyển đổi bất kỳ giá trị nào thành boolean
        return !!this.expandedPosts[postId];
      } catch (error) {
        console.error("Error in isPostExpanded:", error);
        return false;
      }
    },
  },
};
</script>

<style class="scss" scoped>
.timeline {
  width: 100%;
  height: 100%;
}

.timeline__post {
  display: flex;
  flex-direction: column;
  background-color: white;
  border-radius: 1rem;
  margin-bottom: 2rem;
  transform: translate(0, 3px);
  transition: 0.4s;
  width: 100%;
  box-sizing: border-box;
  max-width: 100%;
  overflow-x: hidden;
}

.timeline__post:hover {
  transition: 0.4s;
  box-shadow: rgb(211, 155, 155) 3px 3px 6px 0px inset,
    rgba(255, 255, 255, 0.5) -3px -3px 6px 1px inset;
  transform: translate(0, -3px);
}

.text-post__img {
  width: 54px;
  height: 54px;
  border-radius: 35%;
  margin-right: 1rem;
}

.post {
  display: flex;
  justify-content: flex-start;
  width: 100%;
  padding: 1.5rem;
}

.user-post-desc {
  max-width: 100%;
  overflow: hidden;
  flex: 1;
  box-sizing: border-box;
}

.post__user-post {
  flex: 1;
  width: calc(100% - 4rem);
  overflow: hidden;
  margin-right: 3rem;
  margin-left: 1rem;
  box-sizing: border-box;

}

.post__user-post a {
  
  font-weight: bold;
  font-size: 1rem;
}

.post__content {
  margin-top: 0.5rem;
  font-size: 0.9rem;
  white-space: pre-wrap;
  word-wrap: break-word;
  word-break: break-word;
  overflow-wrap: break-word;
  line-height: 1.4;
  max-width: 100%;
  font-family: inherit;
  letter-spacing: normal;
  word-spacing: normal;

  transition: all 0.3s ease;
}

.post__content--truncated {
  max-height: 120px;
  overflow: hidden;
  position: relative;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  line-clamp: 5;
  -webkit-box-orient: vertical;
}

.post__content--truncated::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 20px;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0),
    rgba(255, 255, 255, 1)
  );
  pointer-events: none;
}

.post__content--expanded {
  max-height: none !important;
  overflow: visible !important;
  display: block !important;
  -webkit-line-clamp: initial !important;
  line-clamp: initial !important;
}

.read-more-link {
  color: #007bff;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.85rem;
  transition: color 0.3s ease;
  display: inline-block;
  margin-top: 0.5rem;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
}

.read-more-link:hover {
  color: #0056b3;
  text-decoration: underline;
}

.timeline__image-post {
  display: flex;
  justify-content: flex-start;
  background-color: white;
  border-radius: 1rem;
  margin-bottom: 2rem;
  transform: translate(0, 3px);
  transition: 0.4s;
}

.timeline__image-post:hover {
  transition: 0.4s;
  box-shadow: rgb(233, 191, 191) 3px 3px 6px 0px inset,
    rgba(255, 255, 255, 0.5) -3px -3px 6px 1px inset;
  transform: translate(0, -3px);
  cursor: pointer;
}

.img-desc {
  margin-top: 1rem;
}

.image-post__user-post {
  display: flex;
  flex-direction: column;
  flex: 1;
  max-width: 100%;
}

.image-post__user-post a {
  font-weight: bold;
  font-size: 1rem;
  margin-bottom: 1rem;
}

.image-post__avatar {
  width: 40px;
  height: 40px;
  border-radius: 100%;
}

.image-post__user-post img {
  width: 100%;
  height: 100%;
  margin-right: 1rem;
  border-radius: 7px;
  max-height: 350px;
  max-width: 600px;
  margin-top: 1rem;
}

.image-post__img {
  width: 100%;
  height: 100%;
  border-radius: 7px;
  max-height: 350px;
  object-fit: cover;
  margin-bottom: 1rem;
  margin-top: 0.5rem;
}

.skeletor {
  margin-bottom: 1rem;
  margin-top: 1rem;
  margin-left: 1rem;
}

.skeletor-content {
  margin-left: 1rem;
}
/* action_bar */
.post-actions {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 0.5rem 0;
  margin: 0 1rem;
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

.action-btn .action-icon {
  font-size: 1.2rem;
}

.action-btn.liked {
  color: #007bff;
  font-weight: bold;
}

.likes-count {
  margin-left: 4px;
  color: #999;
}

/* Stats row styles to match PostDetail */
.post-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.25rem 1.5rem;
  margin: 0.25rem 0 0.5rem 0;
  color: #65676b;
}

.stats-likes {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stats-like-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #1877f2;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.stats-likes-number {
  font-weight: 500;
}

.stats-comments {
  cursor: pointer;
}

.stats-comments:hover {
  text-decoration: underline;
}

/* Match liked text color like PostDetail */
.liked {
  color: #007bff !important;
}

/* Tùy chỉnh thanh cuộn */
.timeline::-webkit-scrollbar {
  width: 6px;
  height: 0; /* Ẩn thanh cuộn ngang */
}

.timeline::-webkit-scrollbar-track {
  background: transparent;
}

.timeline::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
}

.timeline::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.3);
}
</style>
