<template>
  <div class="profile-posts">
    <!-- Loading skeletons -->
    <template v-if="isSkeletorLoading">
      <div class="post-skeleton" v-for="i in 2" :key="'skeleton-' + i">
        <div class="skeleton-header">
          <Skeletor circle width="50" height="50" />
          <div class="skeleton-header-text">
            <Skeletor width="150" height="16" />
            <Skeletor width="100" height="12" style="margin-top: 6px;" />
          </div>
        </div>
        <Skeletor width="100%" height="80" style="margin-top: 12px; border-radius: 8px;" />
        <Skeletor width="100%" height="300" style="margin-top: 12px; border-radius: 12px;" />
        <div class="skeleton-actions">
          <Skeletor width="80" height="36" style="border-radius: 8px;" />
          <Skeletor width="80" height="36" style="border-radius: 8px;" />
          <Skeletor width="80" height="36" style="border-radius: 8px;" />
        </div>
      </div>
    </template>

    <!-- Private account message -->
    <div v-else-if="shouldHidePosts" class="private-message">
      <div class="private-message-icon">🔒</div>
      <h4>Tài khoản này ở chế độ riêng tư</h4>
      <p>Theo dõi tài khoản này để xem bài viết của họ.</p>
    </div>

    <!-- Posts -->
    <div v-for="post in posts" :key="post._id" class="profile-post" :data-post-id="post._id" v-else>
      <div class="post">
        <div class="post__avatar">
          <ProfileImage :id="post.userId" />
        </div>
        <div class="post__content-wrapper">
          <div class="post-header">
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
          <div class="privacy-indicator" v-if="post.privacy === 'private'">
            <span class="material-icons">lock</span>
            <span class="privacy-text">Chỉ mình tôi</span>
          </div>
          <div class="privacy-indicator privacy-public" v-else-if="post.privacy === 'public'">
            <span class="material-icons">public</span>
            <span class="privacy-text">Công khai</span>
          </div>
          <div class="post-desc" @click="goToPostDetail(post._id)" style="cursor: pointer;">
            <p
              v-if="post.description"
              class="post__content"
              :class="{
                'post__content--truncated': isPostTruncated(post.description) && !isPostExpanded(post._id),
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
              {{ isPostExpanded(post._id) ? 'Thu gọn' : 'Xem thêm' }}
            </button>
          </div>
          <div v-if="post.file" class="post__image-wrapper" @click="goToPostDetail(post._id)" style="cursor: pointer;">
            <img :src="post.file" class="post__image" />
          </div>
        </div>
      </div>

      <!-- Reactions Summary -->
      <ReactionsSummary
        v-if="(post.likesCount || 0) > 0 || (post.commentsCount || 0) > 0"
        :post-id="post._id"
        :reactions-count="post.reactionsCount || {}"
        :total-likes="post.likesCount || 0"
        :total-comments="post.commentsCount || 0"
        @show-reactors="(reactionType) => showReactorsModal(post._id, reactionType)"
        @show-all-reactors="showAllReactorsModal(post._id)"
        @show-comments="goToPostDetail(post._id)"
      />

      <!-- Action bar -->
      <LikeActionBar
        :post-id="post._id"
        :initial-liked="isLikedFor(post)"
        :initial-likes-count="post.likesCount || 0"
        :initial-user-reaction="post.userReaction || null"
        :initial-reactions-count="post.reactionsCount || {}"
        :show-comment="true"
        @comment="goToPostDetail(post._id)"
        @updated="({ isLiked, likesCount, userReaction, reactionsCount }) => updatePostReaction(post._id, { isLiked, likesCount, userReaction, reactionsCount })"
      />
    </div>

    <!-- Loading More Indicator -->
    <div class="loading-more" v-if="loadingMore">
      <sync-loader :color="'#667eea'"></sync-loader>
      <span>Đang tải thêm bài viết...</span>
    </div>

    <!-- Scroll trigger element -->
    <div ref="scrollTrigger" class="scroll-trigger" v-if="hasMore && !isSkeletorLoading"></div>

    <!-- End message -->
    <div class="end-message" v-if="!hasMore && posts.length > 0 && !isSkeletorLoading">
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
import { Skeletor } from "vue-skeletor";
import ProfileImage from "@/components/ProfileImage";
import PostDisplayName from "@/components/PostDisplayName";
import PostActions from "@/components/PostActions.vue";
import PostEditModal from "@/components/PostEditModal.vue";
import LikeActionBar from '@/components/LikeActionBar.vue';
import ReactionsSummary from '@/components/ReactionsSummary.vue';
import ReactorsModal from '@/components/ReactorsModal.vue';
import { formatDateTime } from '@/utils/timeUtils';
import SyncLoader from "vue-spinner/src/SyncLoader.vue";

export default {
  name: "ProfileUserPosts",
  components: {
    Skeletor,
    PostDisplayName,
    ProfileImage,
    PostActions,
    PostEditModal,
    LikeActionBar,
    ReactionsSummary,
    ReactorsModal,
    SyncLoader,
  },
  props: {
    id: {
      type: String,
      required: true
    },
    isPrivate: {
      type: Boolean,
      default: false
    },
    isFollowing: {
      type: Boolean,
      default: false
    },
    isCurrentUser: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      posts: [],
      profilePicture: "",
      userId: "",
      isSkeletorLoading: false,
      currentUser: false,
      expandedPosts: {},
      showEditModal: false,
      selectedPost: null,
      currentPage: 1,
      hasMore: true,
      loadingMore: false,
      observer: null,
      // Reactors modal
      showReactorsModalVisible: false,
      selectedPostIdForReactors: null,
      selectedPostReactionsCount: {},
      selectedReactionTab: 'all',
    };
  },
  computed: {
    user() {
      return this.$store.state.user;
    },
    shouldHidePosts() {
      // Hiển thị bài viết nếu:
      // 1. Là tài khoản của chính mình
      // 2. Tài khoản công khai (không riêng tư)
      // 3. Tài khoản riêng tư nhưng đã theo dõi
      // Ngược lại -> ẩn bài viết
      return this.isPrivate && !this.isCurrentUser && !this.isFollowing;
    }
  },
  watch: {
    // Watch khi ID thay đổi (chuyển sang profile khác)
    id: {
      handler() {
        this.loadUserPosts();
      },
      immediate: false, // Đã gọi trong created()
    },
    // REMOVED: storePosts watch để tránh reload không cần thiết khi reaction thay đổi
    // Chỉ cập nhật qua updatePostReaction method được gọi từ LikeActionBar
  },
  async created() {
    await this.loadUserPosts();
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
      if (this.loadingMore || !this.hasMore || this.isSkeletorLoading) {
        return;
      }

      // Tính toán khoảng cách đến cuối trang
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Debug log
      console.log('Profile Scroll Debug:', {
        scrollTop,
        windowHeight,
        documentHeight,
        remaining: documentHeight - (scrollTop + windowHeight),
        hasMore: this.hasMore,
        loadingMore: this.loadingMore
      });

      // Nếu cuộn đến gần cuối trang (còn 500px nữa là hết)
      if (scrollTop + windowHeight >= documentHeight - 500) {
        console.log('Triggering loadMore in Profile...');
        this.loadMore();
      }
    },
    setupIntersectionObserver() {
      // Wait for next tick to ensure the ref is available
      this.$nextTick(() => {
        if (!this.$refs.scrollTrigger) {
          console.log('Profile scroll trigger ref not available yet');
          return;
        }

        const options = {
          root: null, // viewport
          rootMargin: '500px', // Trigger 500px before reaching the element
          threshold: 0.1 // Trigger when 10% of the element is visible
        };

        this.observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            console.log('Profile Intersection Observer:', {
              isIntersecting: entry.isIntersecting,
              hasMore: this.hasMore,
              loadingMore: this.loadingMore
            });
            
            if (entry.isIntersecting && this.hasMore && !this.loadingMore) {
              console.log('Profile Observer triggering loadMore...');
              this.loadMore();
            }
          });
        }, options);

        this.observer.observe(this.$refs.scrollTrigger);
        console.log('Profile Intersection Observer initialized');
      });
    },
    formatFullDateTime(timestamp) {
      return formatDateTime(timestamp, true);
    },
    async loadUserPosts() {
      this.isSkeletorLoading = true;

      try {
        // Đảm bảo loadUser hoàn thành trước
        await this.$store.dispatch("loadUser");
        const { getUserPosts, getReactionStatus } = await import('@/api/posts');
        const currentUserId = this.$store.state.user?._id;
        const responsePosts = await getUserPosts(this.id, 1, 6, currentUserId);
        if (responsePosts.status === 200) {
          const data = responsePosts.data;
          let posts = data.posts || [];
          
          console.log('ProfileUserPosts loaded:', posts.length, 'posts');
          console.log('Posts data:', posts);
          
          // Enrich posts with reaction data
          if (currentUserId && posts.length > 0) {
            posts = await Promise.all(
              posts.map(async (p) => {
                try {
                  const res = await getReactionStatus(p._id, currentUserId);
                  if (res.status === 200) {
                    return {
                      ...p,
                      userReaction: res.data?.userReaction || null,
                      reactionsCount: res.data?.reactionsCount || {},
                      isLiked: !!res.data?.userReaction,
                      likesCount: typeof res.data?.likesCount === "number" ? res.data.likesCount : p.likesCount || 0,
                    };
                  }
                } catch (_) {
                  // ignore and fallback
                }
                return {
                  ...p,
                  userReaction: null,
                  reactionsCount: {},
                  isLiked: false,
                  likesCount: typeof p.likesCount === "number" ? p.likesCount : 0,
                };
              })
            );
          }
          
          this.posts = posts;
          this.hasMore = data.hasMore || false;
          this.currentPage = 1;
          
          // Initialize expand state for each post
          const init = {};
          this.posts.forEach(p => { init[p._id] = false; });
          this.expandedPosts = init;
        }

        //is current user - kiểm tra an toàn
        if (currentUserId && this.id === currentUserId) {
          this.currentUser = true;
        } else {
          this.currentUser = false;
        }
      } catch (error) {
        console.error("Load user posts error:", error);
      }

      this.isSkeletorLoading = false;
    },
    async loadMore() {
      if (!this.hasMore || this.loadingMore) return;
      
      this.loadingMore = true;
      try {
        const { getUserPosts } = await import('@/api/posts');
        const currentUserId = this.$store.state.user?._id;
        const responsePosts = await getUserPosts(this.id, this.currentPage + 1, 6, currentUserId);
        if (responsePosts.status === 200) {
          const data = responsePosts.data;
          const newPosts = data.posts || [];
          this.posts = [...this.posts, ...newPosts];
          this.hasMore = data.hasMore || false;
          this.currentPage += 1;
          
          // Add expand state for new posts
          newPosts.forEach(p => { this.expandedPosts[p._id] = false; });
        }
      } catch (error) {
        console.error("Load more posts error:", error);
      }
      this.loadingMore = false;
    },
    isPostTruncated(description) {
      const maxLength = 200;
      return description && description.length > maxLength;
    },
    toggleExpandPost(postId) {
      const current = this.expandedPosts[postId] || false;
      this.expandedPosts = { ...this.expandedPosts, [postId]: !current };
      // Scroll into view when expanding
      if (!current) {
        this.$nextTick(() => {
          try {
            const el = this.$el.querySelector(`[data-post-id="${postId}"]`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } catch (_) {}
        });
      }
    },
    isPostExpanded(postId) {
      return !!this.expandedPosts[postId];
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
    async handleSavePost(updatedPost) {
      try {
        const { editPost } = await import('@/api/posts');
        const currentUserId = this.$store.state.user?._id;
        
        const postData = {
          description: updatedPost.description,
          file: updatedPost.file,
          privacy: updatedPost.privacy,
          userId: currentUserId
        };
        
        const response = await editPost(updatedPost._id, postData);
        
        if (response.status === 200) {
          // Update the post in local posts array
          const postIndex = this.posts.findIndex(p => p._id === updatedPost._id);
          if (postIndex !== -1) {
            this.posts.splice(postIndex, 1, response.data.post);
          }
          
          this.closeEditModal();
          
          // Show success message
          console.log('Bài viết đã được cập nhật thành công');
        }
      } catch (error) {
        console.error('Error updating post:', error);
        // Handle error (show error message to user)
      }
    },
    async handleDeletePost(post) {
      try {
        const { deletePost } = await import('@/api/posts');
        const currentUserId = this.$store.state.user?._id;
        
        const response = await deletePost(post._id, currentUserId);
        
        if (response.status === 200) {
          // Remove the post from local posts array
          this.posts = this.posts.filter(p => p._id !== post._id);
          
          // Show success message
          console.log('Bài viết đã được xóa thành công');
        }
      } catch (error) {
        console.error('Error deleting post:', error);
        // Handle error (show error message to user)
      }
    },
    // Reaction methods
    isLikedFor(post) {
      const currentUserId = this.$store?.state?.user?._id;
      if (post && Array.isArray(post.likes)) {
        return post.isLiked || post.likes.includes(currentUserId);
      }
      return !!post?.isLiked;
    },
    updatePostReaction(postId, { isLiked, likesCount, userReaction, reactionsCount }) {
      const idx = this.posts.findIndex((p) => p._id === postId);
      if (idx !== -1) {
        // Cập nhật trực tiếp properties thay vì replace toàn bộ object để tránh nháy
        const post = this.posts[idx];
        post.isLiked = isLiked;
        post.userReaction = userReaction;
        post.reactionsCount = reactionsCount;
        post.likesCount = likesCount;
      }
    },
    goToPostDetail(postId) {
      this.$emit('show-post-detail', postId);
    },
    // Reactors modal methods
    showReactorsModal(postId, reactionType) {
      const post = this.posts.find(p => p._id === postId);
      if (post) {
        this.selectedPostIdForReactors = postId;
        this.selectedPostReactionsCount = post.reactionsCount || {};
        this.selectedReactionTab = reactionType || 'all';
        this.showReactorsModalVisible = true;
      }
    },
    showAllReactorsModal(postId) {
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
    updatePostCommentsCount(postId, newCount) {
      // Find and update the post's commentsCount
      const post = this.posts.find(p => p._id === postId);
      if (post) {
        post.commentsCount = newCount;
        // Force reactivity update
        this.$forceUpdate();
      }
    },
  },
};
</script>

<style scoped>
.profile-posts { width: 800px; min-height: 450px; }
.profile-post { background:#fff; border-radius:1rem; margin-bottom:2rem; transition:.4s; transform:translateY(3px); }
.profile-post:hover { box-shadow: rgb(211,155,155) 3px 3px 6px 0px inset, rgba(255,255,255,.5) -3px -3px 6px 1px inset; transform:translateY(-3px); cursor:pointer; }
.profile-post__link { text-decoration:none; color:inherit; }
.post { display:flex; padding:1.5rem; }
.post__avatar :deep(img) { width:40px; height:40px; border-radius:100%; }
.post__content-wrapper { flex:1; margin-left:1rem; display:flex; flex-direction:column; }
.post-header { display:flex; align-items:flex-start; justify-content:space-between; width:100%; margin-bottom: -0.5rem; }
.post-header-left { display:flex; flex-direction:column; gap:0.25rem; }
.post-time { font-size:0.8125rem; color:#94a3b8; font-weight:500; display:flex; align-items:center; gap:0.375rem; transition:color 0.2s ease; }
.post-time::before { content:'•'; font-size:0.625rem; color:#cbd5e1; }
.post-desc { max-width:100%; overflow:hidden; }
.post__content { margin-top:.5rem; font-size:.9rem; white-space:pre-wrap; word-break:break-word; line-height:1.4; transition:all .3s ease;max-width: 95%; }
.post__content--truncated { max-height:120px; overflow:hidden; position:relative; display:-webkit-box; -webkit-line-clamp:5; line-clamp:5; -webkit-box-orient:vertical; }
.post__content--truncated::after { content:""; position:absolute; bottom:0; left:0; width:100%; height:20px; background:linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,1)); pointer-events:none; }
.post__content--expanded { max-height:none !important; overflow:visible !important; display:block !important; }
.read-more-link { color:#007bff; background:transparent; border:none; font-weight:600; font-size:.85rem; margin-top:.5rem; cursor:pointer; padding:0; }
.read-more-link:hover { color:#0056b3; text-decoration:underline; }
.post__image-wrapper { margin-top:.5rem; }
.post__image { width:95%; max-height:350px; object-fit:cover; border-radius:7px; display:block; }
.skeletor { margin-top:1rem; }

.post-skeleton {
  background: white;
  border-radius: 1rem;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(226, 232, 240, 0.6);
}

.skeleton-header {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.skeleton-header-text {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.skeleton-actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(226, 232, 240, 0.6);
}

.privacy-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: rgba(107, 114, 128, 0.08);
  border-radius: 14px;
  font-size: 0.8125rem;
  color: var(--gray-600);
  margin: 1rem 0 0.25rem 0;
  border: 1px solid rgba(107, 114, 128, 0.12);
  width: fit-content;
  max-width: max-content;
}

.privacy-indicator.privacy-public {
  background: rgba(102, 126, 234, 0.08);
  border-color: rgba(102, 126, 234, 0.12);
  color: var(--primary);
}

.privacy-indicator .material-icons {
  font-size: 0.9375rem;
}

.privacy-text {
  font-weight: 500;
}

.private-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  background: var(--white);
  border-radius: var(--radius-2xl);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--gray-100);
  min-height: 300px;
}

.private-message-icon {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  opacity: 0.7;
}

.private-message h4 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--gray-900);
  margin-bottom: 0.75rem;
  font-family: var(--font-display);
}

.private-message p {
  font-size: 1rem;
  color: var(--gray-600);
  line-height: 1.6;
  max-width: 400px;
}

.loading-more { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:2rem 0; gap:1rem; }
.loading-more span { font-size:0.9375rem; color:#94a3b8; font-weight:500; }

.end-message { text-align:center; padding:2rem 0; font-size:1rem; color:#94a3b8; font-weight:500; margin-bottom:2rem; }
.end-message span { display:inline-block; padding:1rem 2rem; background:linear-gradient(135deg, rgba(102,126,234,0.05) 0%, rgba(118,75,162,0.05) 100%); border-radius:12px; border:1px solid rgba(102,126,234,0.2); }

@media (max-width: 768px) {
  .post-time { font-size:0.75rem; }
  .private-message {
    padding: 3rem 1.5rem;
    min-height: 250px;
  }
  .private-message-icon {
    font-size: 3rem;
  }
  .private-message h4 {
    font-size: 1.25rem;
  }
  .private-message p {
    font-size: 0.9375rem;
  }
}

@media (max-width: 480px) {
  .post-time { font-size:0.7rem; }
  .private-message {
    padding: 2rem 1rem;
    min-height: 200px;
  }
  .private-message-icon {
    font-size: 2.5rem;
    margin-bottom: 1rem;
  }
  .private-message h4 {
    font-size: 1.125rem;
  }
  .private-message p {
    font-size: 0.875rem;
  }
}
</style>
