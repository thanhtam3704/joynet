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
          <div class="post-header" :class="{ 'has-actions': canShowActionsFor(post) }">
            <div class="post-header-left">
              <PostDisplayName :id="post.userId" />
              <span class="post-time" v-if="post.createdAt">
                {{ formatFullDateTime(post.createdAt) }}
              </span>
            </div>
            <PostActions 
              :post="post" 
              @edit-post="openEditModal"
              @delete-post="handleDeletePost"
            />
          </div>
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

      <!-- Reactions Summary (replaces old stats row) -->
      <ReactionsSummary
        v-if="(post.likesCount || 0) > 0 || commentsCountFor(post) > 0"
        :post-id="post._id"
        :reactions-count="post.reactionsCount || {}"
        :total-likes="post.likesCount || 0"
        :total-comments="commentsCountFor(post)"
        @show-reactors="(reactionType) => showReactorsModal(post._id, reactionType)"
        @show-all-reactors="showAllReactorsModal(post._id)"
        @show-comments="$emit('show-post-detail', post._id)"
      />

      <!-- Action bar reused -->
      <LikeActionBar
        :post-id="post._id"
        :initial-liked="isLikedFor(post)"
        :initial-likes-count="post.likesCount || 0"
        :initial-user-reaction="post.userReaction || null"
        :initial-reactions-count="post.reactionsCount || {}"
        :show-comment="true"
        @comment="$emit('show-post-detail', post._id)"
        @updated="({ isLiked, likesCount, userReaction, reactionsCount }) => $store.commit('UPDATE_POST_LIKE', { postId: post._id, isLiked, likesCount, userReaction, reactionsCount })"
      />

      <!-- Preview Comments Section (Show max 3 recent comments) -->
      <div class="preview-comments" v-if="getPostComments(post._id).length > 0">
        <div
          class="preview-comment"
          v-for="comment in getPostComments(post._id).slice(0, 3)"
          :key="comment._id"
        >
          <ProfileImage :id="comment.userId" class="comment-avatar" />
          <div class="comment-content">
            <PostDisplayName :id="comment.userId" class="comment-author" />
            <p class="comment-text" v-if="comment.comment">{{ comment.comment }}</p>
            <img
              v-if="comment.file"
              class="comment-image"
              :src="`http://localhost:3000/uploads/${comment.file}`"
            />
          </div>
        </div>
        
        <!-- Show "View more" button if there are more than 3 comments -->
        <button
          v-if="commentsCountFor(post) > 3"
          class="view-more-comments-btn"
          @click="$emit('show-post-detail', post._id)"
        >
          Xem thêm {{ commentsCountFor(post) - 3 }} bình luận
        </button>
      </div>
    </div>

    <!-- Loading More Indicator -->
    <div class="loading-more" v-if="loadingMore">
      <sync-loader :color="'#667eea'"></sync-loader>
      <span>Đang tải thêm bài viết...</span>
    </div>

    <!-- Scroll trigger element -->
    <div ref="scrollTrigger" class="scroll-trigger" v-if="hasMore && !isLoading"></div>

    <!-- End message -->
    <div class="end-message" v-if="!hasMore && posts.length > 0 && !isLoading">
      <span>🎉 Bạn đã xem hết tất cả bài viết</span>
    </div>

    <!-- Edit Post Modal -->
    <PostEditModal
      :show="showEditModal"
      :post="selectedPost"
      @close="closeEditModal"
      @save="handleSavePost"
    />

    <!-- Reactors Modal -->
    <Teleport to="body">
      <ReactorsModal
        v-if="showReactorsModalVisible"
        :post-id="selectedPostIdForReactors"
        :reactions-count="selectedPostReactionsCount"
        :initial-tab="selectedReactionTab"
        @close="closeReactorsModal"
      />
    </Teleport>
  </div>
</template>

<script>
import ProfileImage from "@/components/ProfileImage";
import PostDisplayName from "@/components/PostDisplayName";
import LikeActionBar from "@/components/LikeActionBar.vue";
import ReactionsSummary from "@/components/ReactionsSummary.vue";
import PostActions from "@/components/PostActions.vue";
import PostEditModal from "@/components/PostEditModal.vue";
import ReactorsModal from "@/components/ReactorsModal.vue";
import { Skeletor } from "vue-skeletor";
import HoverUserList from '@/components/HoverUserList';
import { getTimeAgo, formatDateTime } from '@/utils/timeUtils';
import SyncLoader from "vue-spinner/src/SyncLoader.vue";

export default {
  name: "Timeline",
  components: { 
    ProfileImage, 
    Skeletor, 
    PostDisplayName, 
    LikeActionBar, 
    ReactionsSummary,
    HoverUserList, 
    PostActions, 
    PostEditModal,
    ReactorsModal,
    SyncLoader 
  },
  data() {
    return {
      isLoading: false,
      loadingMore: false,
      showPostDetail: false,
      selectedPostId: null,
      expandedPosts: {}, // Lưu trạng thái hiển thị đầy đủ của các bài post
      likeLoading: {},
      commentCounts: {}, // Cache đếm bình luận theo postId
      postComments: {}, // Cache comments cho mỗi post
      showEditModal: false,
      selectedPost: null,
      observer: null,
      // Reactors modal
      showReactorsModalVisible: false,
      selectedPostIdForReactors: null,
      selectedPostReactionsCount: {},
      selectedReactionTab: 'all',
    };
  },
  async mounted() {
    this.isLoading = true;
    await this.$store.dispatch("loadPosts", { page: 1, append: false });
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

    // Setup infinite scroll
    this.setupInfiniteScroll();
    
    // Setup intersection observer
    this.setupIntersectionObserver();
  },
  beforeUnmount() {
    // Cleanup scroll listener
    this.removeInfiniteScroll();
    // Cleanup intersection observer
    if (this.observer) {
      this.observer.disconnect();
    }
  },
  computed: {
    posts() {
      return this.$store.state.posts;
    },
    hasMore() {
      return this.$store.state.postsHasMore;
    },
    currentPage() {
      return this.$store.state.postsPage;
    },
  },
  methods: {
    setupInfiniteScroll() {
      this.scrollHandler = this.throttle(this.handleScroll.bind(this), 200);
      window.addEventListener('scroll', this.scrollHandler, { passive: true });
    },
    removeInfiniteScroll() {
      if (this.scrollHandler) {
        window.removeEventListener('scroll', this.scrollHandler);
      }
    },
    throttle(func, delay) {
      let timeoutId;
      let lastRan;
      return function(...args) {
        if (!lastRan) {
          func.apply(this, args);
          lastRan = Date.now();
        } else {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            if ((Date.now() - lastRan) >= delay) {
              func.apply(this, args);
              lastRan = Date.now();
            }
          }, delay - (Date.now() - lastRan));
        }
      };
    },
    handleScroll() {
      // Kiểm tra nếu đang loading hoặc không còn bài post
      if (this.loadingMore || !this.hasMore || this.isLoading) {
        return;
      }

      // Tính toán khoảng cách đến cuối trang
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Debug log
      console.log('Scroll Debug:', {
        scrollTop,
        windowHeight,
        documentHeight,
        remaining: documentHeight - (scrollTop + windowHeight),
        hasMore: this.hasMore,
        loadingMore: this.loadingMore
      });

      // Nếu cuộn đến gần cuối trang (còn 500px nữa là hết)
      if (scrollTop + windowHeight >= documentHeight - 500) {
        console.log('Triggering loadMore...');
        this.loadMore();
      }
    },
    setupIntersectionObserver() {
      // Wait for next tick to ensure the ref is available
      this.$nextTick(() => {
        if (!this.$refs.scrollTrigger) {
          console.log('Scroll trigger ref not available yet');
          return;
        }

        const options = {
          root: null, // viewport
          rootMargin: '500px', // Trigger 500px before reaching the element
          threshold: 0.1 // Trigger when 10% of the element is visible
        };

        this.observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            console.log('Intersection Observer:', {
              isIntersecting: entry.isIntersecting,
              hasMore: this.hasMore,
              loadingMore: this.loadingMore
            });
            
            if (entry.isIntersecting && this.hasMore && !this.loadingMore) {
              console.log('Observer triggering loadMore...');
              this.loadMore();
            }
          });
        }, options);

        this.observer.observe(this.$refs.scrollTrigger);
        console.log('Intersection Observer initialized');
      });
    },
    async loadMore() {
      this.loadingMore = true;
      await this.$store.dispatch("loadPosts", { page: this.currentPage + 1, append: true });
      this.loadingMore = false;
      
      // Load comment counts for new posts
      try {
        await this.loadCommentCountsForPosts();
      } catch (err) {
        console.error('Failed to load comment counts:', err);
      }
    },
    getTimeAgo(timestamp) {
      return getTimeAgo(timestamp);
    },
    formatFullDateTime(timestamp) {
      return formatDateTime(timestamp, true);
    },
    async loadCommentCountsForPosts() {
      try {
        const { getPostComments } = await import('@/api/posts');
        const tasks = (this.posts || []).map(async (p) => {
          try {
            const res = await getPostComments(p._id);
            const arr = Array.isArray(res?.data) ? res.data : (res?.data?.comments || []);
            
            // Store both count and actual comments
            this.$set ? this.$set(this.commentCounts, p._id, arr.length) : (this.commentCounts = { ...this.commentCounts, [p._id]: arr.length });
            this.$set ? this.$set(this.postComments, p._id, arr) : (this.postComments = { ...this.postComments, [p._id]: arr });
          } catch (_) {
            this.$set ? this.$set(this.commentCounts, p._id, p.commentsCount || 0) : (this.commentCounts = { ...this.commentCounts, [p._id]: p.commentsCount || 0 });
            this.$set ? this.$set(this.postComments, p._id, []) : (this.postComments = { ...this.postComments, [p._id]: [] });
          }
        });
        await Promise.all(tasks);
      } catch (e) {
        // ignore global failure
      }
    },
    getPostComments(postId) {
      return this.postComments[postId] || [];
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
    canShowActionsFor(post) {
      // Kiểm tra xem có hiển thị PostActions hay không
      const currentUser = this.$store.state.user;
      return currentUser && post && currentUser._id === post.userId;
    },
    // Post actions methods
    openEditModal(post) {
      this.selectedPost = post;
      this.showEditModal = true;
    },
    closeEditModal() {
      this.showEditModal = false;
      this.selectedPost = null;
    },
    showReactorsModal(postId, reactionType) {
      // Tìm post để lấy reactionsCount
      const post = this.posts.find(p => p._id === postId);
      if (post) {
        this.selectedPostIdForReactors = postId;
        this.selectedPostReactionsCount = post.reactionsCount || {};
        this.selectedReactionTab = reactionType || 'all';
        this.showReactorsModalVisible = true;
      }
    },
    showAllReactorsModal(postId) {
      // Hiển thị modal với tab "Tất cả"
      const post = this.posts.find(p => p._id === postId);
      if (post) {
        this.selectedPostIdForReactors = postId;
        this.selectedPostReactionsCount = post.reactionsCount || {};
        this.selectedReactionTab = 'all';
        this.showReactorsModalVisible = true;
      }
    },
    closeReactorsModal() {
      this.showReactorsModalVisible = false;
      this.selectedPostIdForReactors = null;
      this.selectedPostReactionsCount = {};
      this.selectedReactionTab = 'all';
    },
    async handleSavePost(updatedPost) {
      try {
        const currentUserId = this.$store.state.user?._id;
        
        const postData = {
          description: updatedPost.description,
          file: updatedPost.file,
          userId: currentUserId
        };
        
        await this.$store.dispatch('editPost', {
          postId: updatedPost._id,
          updatedPost: postData
        });
        
        this.closeEditModal();
        
        // Show success message (you might want to add a notification system)
        console.log('Bài viết đã được cập nhật thành công');
      } catch (error) {
        console.error('Error updating post:', error);
        // Handle error (show error message to user)
      }
    },
    async handleDeletePost(post) {
      try {
        const currentUserId = this.$store.state.user?._id;
        
        await this.$store.dispatch('deletePost', {
          postId: post._id,
          userId: currentUserId
        });
        
        // Show success message
        console.log('Bài viết đã được xóa thành công');
      } catch (error) {
        console.error('Error deleting post:', error);
        // Handle error (show error message to user)
      }
    },
    updatePostCommentsCount(postId, newCount) {
      // Find and update the post's commentsCount
      const post = this.posts.find(p => p._id === postId);
      if (post) {
        post.commentsCount = newCount;
        // Force reactivity update
        this.$forceUpdate();
      }
    }
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
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-2xl);
  border: 1px solid rgba(226, 232, 240, 0.6);
  margin-bottom: 1.5rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  width: 100%;
  box-sizing: border-box;
  max-width: 100%;
  overflow-x: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
}

.timeline__post:hover {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  transform: translateY(-4px);
  border-color: rgba(102, 126, 234, 0.2);
}

.user-post-img {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
}

.user-post-img img {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  object-fit: cover;
  border: 2px solid var(--white);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.user-post-img img:hover {
  transform: scale(1.08);
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.text-post__img {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  margin-right: 1rem;
  border: 2px solid var(--white);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.post {
  display: flex;
  justify-content: flex-start;
  width: 100%;
  padding: 1.5rem 1.5rem 0.75rem 1.5rem;
}

.user-post-desc {
  max-width: 100%;
  overflow: hidden;
  flex: 1;
  box-sizing: border-box;
}

.post__user-post {
  flex: 1;
  width: calc(100% - 70px);
  overflow: hidden;
  margin-left: 1rem;
  box-sizing: border-box;
}

.post-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 0.625rem;
}

.post-header.has-actions {
  margin-bottom: 0.625rem;
}

.post-header-left {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.post-time {
  font-size: 0.8125rem;
  color: var(--gray-500);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  cursor: help;
  transition: color 0.2s ease;
}

.post-time::before {
  content: '•';
  font-size: 0.625rem;
  color: var(--gray-400);
}

.post-time:hover {
  color: var(--primary);
}

.post__user-post a {
  font-weight: 700;
  font-size: 1rem;
  color: var(--gray-900);
  transition: color 0.2s ease;
}

.post__user-post a:hover {
  color: var(--primary);
}

.post__content {
  margin-top: 0;
  font-size: 0.9375rem;
  white-space: pre-wrap;
  word-wrap: break-word;
  word-break: break-word;
  overflow-wrap: break-word;
  line-height: 1.6;
  max-width: 95%;
  font-family: inherit;
  letter-spacing: normal;
  word-spacing: normal;
  transition: all 0.3s ease;
  color: var(--gray-800);
}

.post__content--truncated {
  max-height: 128px;
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
  height: 24px;
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
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  display: inline-block;
  margin-top: 0.625rem;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
  position: relative;
}

.read-more-link::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 2px;
  background: var(--primary);
  transition: width 0.3s ease;
}

.read-more-link:hover {
  color: var(--primary-dark);
}

.read-more-link:hover::after {
  width: 100%;
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
  border-radius: var(--radius-xl);
  max-height: 400px;
  max-width: 600px;
  margin-top: 0.75rem;
  object-fit: cover;
  border: 1px solid rgba(226, 232, 240, 0.5);
  transition: all 0.3s ease;
}

.image-post__user-post img:hover {
  transform: scale(1.01);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.image-post__img {
  width: 95%;
  height: 100%;
  border-radius: var(--radius-xl);
  max-height: 400px;
  object-fit: cover;
  margin-bottom: 1rem;
  margin-top: 0.625rem;
  border: 1px solid rgba(226, 232, 240, 0.5);
  cursor: pointer;
  transition: all 0.3s ease;
}

.image-post__img:hover {
  transform: scale(1.01);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
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
  /* padding: 0;
  margin: 0; */
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

/* Stats row styles */
.post-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1.5rem;
  margin: 0 0 0.5rem 0;
  color: var(--gray-600);
  font-size: 0.9375rem;
}

.stats-likes {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-lg);
}

.stats-likes:hover {
  background: var(--gray-50);
  color: var(--primary);
}

.stats-like-icon {
  width: 22px;
  height: 22px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: var(--white);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
  transition: all 0.2s ease;
}

.stats-likes:hover .stats-like-icon {
  transform: scale(1.1);
}

.stats-likes-number {
  font-weight: 600;
  color: var(--gray-700);
}

.stats-comments {
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-lg);
  transition: all 0.2s ease;
  font-weight: 500;
}

.stats-comments:hover {
  background: var(--gray-50);
  color: var(--primary);
}

.liked {
  color: var(--primary) !important;
  font-weight: 600;
}

/* Preview Comments Section */
.preview-comments {
  padding: 0 1.5rem 1rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.preview-comment {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.comment-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 2px solid transparent;
  background: linear-gradient(white, white) padding-box,
              linear-gradient(135deg, #667eea, #764ba2) border-box;
  box-shadow: 0 2px 6px rgba(102, 126, 234, 0.15);
}

.comment-content {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.04) 0%, rgba(118, 75, 162, 0.04) 100%);
  border: 1px solid rgba(102, 126, 234, 0.1);
  border-radius: 16px;
  padding: 0.75rem 1rem;
  width: fit-content;
  max-width: calc(100% - 52px);
  word-wrap: break-word;
  display: inline-block;
}

.comment-author {
  font-weight: 600;
  font-size: 0.875rem;
  color: #1f2937;
  margin-bottom: 0.25rem;
  display: block;
}

.comment-text {
  font-size: 0.9375rem;
  color: #374151;
  line-height: 1.5;
  margin: 0;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.comment-image {
  max-width: 100%;
  border-radius: 12px;
  margin-top: 0.5rem;
  display: block;
}

.view-more-comments-btn {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.06) 0%, rgba(118, 75, 162, 0.06) 100%);
  border: 2px solid rgba(102, 126, 234, 0.15);
  color: #667eea;
  font-weight: 600;
  cursor: pointer;
  padding: 0.625rem 1.25rem;
  font-size: 0.9375rem;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: -0.01em;
  margin: 0.5rem 0 0 0;
  font-family: inherit;
}

.view-more-comments-btn:hover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

/* Scrollbar */
.timeline::-webkit-scrollbar {
  width: 6px;
  height: 0;
}

.timeline::-webkit-scrollbar-track {
  background: transparent;
}

.timeline::-webkit-scrollbar-thumb {
  background-color: rgba(102, 126, 234, 0.2);
  border-radius: var(--radius-full);
  transition: background-color 0.3s ease;
}

.timeline::-webkit-scrollbar-thumb:hover {
  background-color: rgba(102, 126, 234, 0.4);
}

/* ========== RESPONSIVE DESIGN ========== */

/* Tablet - 768px and below */
@media (max-width: 768px) {
  .timeline__post {
    padding: 0.75rem;
    margin-bottom: 1rem;
  }

  .post {
    gap: 0.75rem;
  }

  .user-post-img img {
    width: 35px;
    height: 35px;
  }

  .user-post-name a {
    font-size: 0.9rem;
  }

  .post-time {
    font-size: 0.75rem;
  }

  .user-post-time {
    font-size: 0.75rem;
  }

  .post__content {
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .read-more-link {
    font-size: 0.85rem;
  }

  .user-post-image {
    border-radius: 10px;
  }

  .post-stats {
    padding: 0.25rem 1rem;
    font-size: 0.85rem;
  }

  .stats-like-icon {
    width: 18px;
    height: 18px;
    font-size: 11px;
  }

  .preview-comments {
    padding: 0 1rem 0.75rem 1rem;
    gap: 0.75rem;
  }

  .comment-avatar {
    width: 32px;
    height: 32px;
  }

  .comment-content {
    padding: 0.625rem 0.875rem;
  }

  .comment-author {
    font-size: 0.8125rem;
  }

  .comment-text {
    font-size: 0.875rem;
  }

  .view-more-comments-btn {
    font-size: 0.875rem;
    padding: 0.5rem 1rem;
  }
}

/* Mobile - 480px and below */
@media (max-width: 480px) {
  .timeline__post {
    padding: 0.6rem;
    margin-bottom: 0.75rem;
    border-radius: 12px;
  }

  .post {
    gap: 0.6rem;
  }

  .user-post-img img {
    width: 32px;
    height: 32px;
  }

  .user-post-name a {
    font-size: 0.85rem;
  }

  .post-time {
    font-size: 0.7rem;
  }

  .user-post-time {
    font-size: 0.7rem;
  }

  .user-post-desc {
    margin-top: 0.4rem;
  }

  .post__content {
    font-size: 0.85rem;
    line-height: 1.35;
  }

  .read-more-link {
    font-size: 0.8rem;
    margin-top: 0.3rem;
  }

  .user-post-image {
    border-radius: 8px;
    margin-top: 0.6rem;
  }

  .post-stats {
    padding: 0.2rem 0.75rem;
    font-size: 0.8rem;
    margin: 0.2rem 0 0.4rem 0;
  }

  .stats-likes {
    gap: 4px;
  }

  .stats-like-icon {
    width: 16px;
    height: 16px;
    font-size: 10px;
  }

  .stats-likes-number {
    font-size: 0.8rem;
  }

  .stats-comments {
    font-size: 0.8rem;
  }

  .preview-comments {
    padding: 0 0.75rem 0.6rem 0.75rem;
    gap: 0.625rem;
  }

  .comment-avatar {
    width: 28px;
    height: 28px;
  }

  .comment-content {
    padding: 0.5rem 0.75rem;
    border-radius: 12px;
  }

  .comment-author {
    font-size: 0.75rem;
  }

  .comment-text {
    font-size: 0.8125rem;
  }

  .view-more-comments-btn {
    font-size: 0.8125rem;
    padding: 0.5rem 0.875rem;
  }
}

/* Extra Small Mobile - 360px and below */
@media (max-width: 360px) {
  .timeline__post {
    padding: 0.5rem;
    margin-bottom: 0.6rem;
  }

  .post {
    gap: 0.5rem;
  }

  .user-post-img img {
    width: 30px;
    height: 30px;
  }

  .user-post-name a {
    font-size: 0.8rem;
  }

  .post-time {
    font-size: 0.7rem;
  }

  .post__content {
    font-size: 0.8rem;
  }

  .post-stats {
    padding: 0.15rem 0.5rem;
    font-size: 0.75rem;
  }

  .preview-comments {
    padding: 0 0.5rem 0.5rem 0.5rem;
    gap: 0.5rem;
  }

  .comment-avatar {
    width: 26px;
    height: 26px;
  }

  .comment-content {
    padding: 0.5rem 0.625rem;
  }

  .comment-text {
    font-size: 0.75rem;
  }

  .view-more-comments-btn {
    font-size: 0.75rem;
    padding: 0.375rem 0.75rem;
  }
}

/* Loading More Indicator */
.loading-more {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 0;
  gap: 1rem;
}

.loading-more span {
  font-size: 0.9375rem;
  color: var(--gray-600);
  font-weight: 500;
}

.end-message {
  text-align: center;
  padding: 2rem 0;
  font-size: 1rem;
  color: var(--gray-500);
  font-weight: 500;
  margin-bottom: 2rem;
}

.end-message span {
  display: inline-block;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  border-radius: var(--radius-xl);
  border: 1px solid rgba(102, 126, 234, 0.2);
}
</style>
