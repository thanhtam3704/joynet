<template>
  <div class="post-detail">
    <div class="fb-modal-header" v-if="!isSkeletorLoading && posts.userId">
      <div class="fb-modal-header__flex">
        <span class="fb-modal-header__title">
          Bài viết của
          <span class="fb-modal-header__user">
            <PostDisplayName :id="posts.userId" />
          </span>
        </span>
        <button
          class="fb-modal-header__close"
          @click="$emit('close')"
          aria-label="Đóng"
        >
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
    </div>

    <div class="timeline__text-post">
      <div v-if="isSkeletorLoading" class="post-detail-skeleton">
        <div class="skeleton-main">
          <Skeletor circle width="50" height="50" />
          <div class="skeleton-content">
            <Skeletor width="150" height="16" />
            <Skeletor width="100" height="12" style="margin-top: 6px;" />
          </div>
        </div>
        <Skeletor width="100%" height="80" style="margin-top: 12px; border-radius: 8px;" />
        <Skeletor width="100%" height="300" style="margin-top: 12px; border-radius: 12px;" />
        <div class="skeleton-actions">
          <Skeletor width="100" height="36" style="border-radius: 8px;" />
          <Skeletor width="100" height="36" style="border-radius: 8px;" />
        </div>
      </div>
      <div class="main-post" v-else>
        <ProfileImage :id="posts.userId"  />

        <div class="post__user-content">
          <div class="post-user-info">
            <PostDisplayName :id="posts.userId" />
            <span class="post-time" v-if="posts.createdAt">
              {{ formatFullDateTime(posts.createdAt) }}
            </span>
          </div>
          <div class="privacy-indicator" v-if="posts.privacy === 'private'">
            <span class="material-icons">lock</span>
            <span class="privacy-text">Chỉ mình tôi</span>
          </div>
          <div class="privacy-indicator privacy-public" v-else-if="posts.privacy === 'public'">
            <span class="material-icons">public</span>
            <span class="privacy-text">Công khai</span>
          </div>
          <p class="text-post__content" v-if="posts.description">
            {{ posts.description }}
          </p>
          <img
            v-if="posts.file"
            class="post-detail-main-img"
            :src="`http://localhost:3000/uploads/${posts.file}`"
          />
        </div>
      </div>

      <!-- Reactions Summary (replaces old stats) -->
      <ReactionsSummary
        v-if="likesCount > 0 || comments.length > 0"
        :post-id="String(id)"
        :reactions-count="reactionsCount || {}"
        :total-likes="likesCount"
        :total-comments="comments.length"
        @show-reactors="(reactionType) => showReactorsModal(reactionType)"
        @show-all-reactors="showAllReactorsModal"
        @show-comments="scrollToComments"
      />

      <!-- Action Bar - Like & Comment (reusable) -->
      <LikeActionBar
        :post-id="String(id)"
        :initial-liked="isLiked"
        :initial-likes-count="likesCount"
        :initial-user-reaction="userReaction"
        :initial-reactions-count="reactionsCount"
        @comment="focusCommentInput"
        @updated="({ isLiked: l, likesCount: c, userReaction: r, reactionsCount: rc }) => { 
          isLiked = l; 
          likesCount = c; 
          userReaction = r;
          reactionsCount = rc;
        }"
      />

      <!-- Comments Section -->
      <div class="comments-section" ref="commentsSection">
        <h3 class="comments-title">Bình luận</h3>
        <div class="comments" v-if="comments.length > 0">
          <div
            class="comment"
            v-for="comment in comments"
            :key="comment._id"
            :data-comment-id="comment._id"
            :class="{
              'comment--text-only': comment.comment && !comment.file,
              'comment--image-only': !comment.comment && comment.file,
              'comment--text-and-image': comment.comment && comment.file,
            }"
          >
            <ProfileImage :id="comment.userId" class="comment-avatar" />
            <div class="comment__content">
              <div class="comment__header">
                <div class="comment__user-info">
                  <PostDisplayName :id="comment.userId" />
                  <span class="comment__time">{{ formatCommentTime(comment.createdAt) }}</span>
                </div>
                <div class="comment__actions" v-if="canEditComment(comment)">
                  <i class="material-icons comment__menu-icon" @click.stop="openCommentMenu(comment, $event)">more_horiz</i>
                </div>
              </div>
              <p class="text-post__content" v-if="comment.comment">
                {{ comment.comment }}
              </p>
              <img
                v-if="comment.file"
                class="comment-img"
                :src="`http://localhost:3000/uploads/${comment.file}`"
              />
            </div>
          </div>

          <!-- Loading more comments indicator -->
          <div v-if="loadingMoreComments" class="loading-more-comments">
            <sync-loader :color="'#667eea'" :size="'8px'"></sync-loader>
            <span>Đang tải thêm bình luận...</span>
          </div>

          <!-- Load more trigger -->
          <div ref="loadMoreTrigger" class="load-more-trigger"></div>
        </div>
        <div v-else class="no-comments">
          Chưa có bình luận nào. Hãy là người đầu tiên bình luận!
        </div>
      </div>
    </div>
    
    <!-- Comment Context Menu -->
    <div 
      v-if="showCommentMenu" 
      class="comment-context-menu"
      :style="{ top: commentMenuPosition.y + 'px', left: commentMenuPosition.x + 'px' }"
      @click.stop
    >
      <div class="menu-item" @click="editComment">
        <i class="material-icons">edit</i>
        <span>Sửa</span>
      </div>
      <div class="menu-item delete" @click="confirmDeleteComment">
        <i class="material-icons">delete</i>
        <span>Xóa</span>
      </div>
    </div>

    <!-- Edit Comment Modal -->
    <div v-if="showEditCommentModal" class="edit-modal-overlay" @click="cancelEditComment">
      <div class="edit-modal" @click.stop>
        <div class="edit-modal-header">
          <h3>Sửa bình luận</h3>
          <button @click="cancelEditComment" class="close-btn">
            <i class="material-icons">close</i>
          </button>
        </div>
        <div class="edit-modal-body">
          <textarea 
            v-model="editingCommentContent"
            placeholder="Nhập nội dung bình luận..."
            ref="editCommentTextarea"
            @keydown.enter.ctrl="saveEditComment"
          ></textarea>
        </div>
        <div class="edit-modal-footer">
          <button @click="cancelEditComment" class="btn-cancel">Hủy</button>
          <button @click="saveEditComment" class="btn-save" :disabled="!editingCommentContent.trim()">Lưu</button>
        </div>
      </div>
    </div>

    <!-- Delete Comment Confirmation Modal -->
    <div v-if="showDeleteCommentModal" class="edit-modal-overlay" @click.self="showDeleteCommentModal = false">
      <div class="edit-modal delete-confirm-modal" @click.stop>
        <h3>Xóa bình luận</h3>
        <p>Bạn có chắc chắn muốn xóa bình luận này? Hành động này không thể hoàn tác.</p>
        <div class="modal-actions">
          <button @click="showDeleteCommentModal = false" class="btn-cancel">Hủy</button>
          <button @click="deleteComment" class="btn-delete">Xóa bình luận</button>
        </div>
      </div>
    </div>

    <!-- Comment input box luôn hiển thị dạng sticky footer -->
    <div class="comment-input-box sticky-footer">
      <ProfileImage :id="user._id" class="comment-avatar" />
      <div class="comment-input-container">
        <div class="comment-input-wrapper">
          <textarea
            ref="commentTextarea"
            v-model="commentModel"
            placeholder="Viết bình luận..."
            class="comment-textarea"
            @keydown.enter.exact.prevent="addComment"
            rows="1"
          ></textarea>
          <div class="input-actions">
            <input
              type="file"
              @change="onFileChange"
              ref="file"
              name="file"
              class="file-input"
              accept="image/*"
            />
            <button
              @click="$refs.file.click()"
              class="attach-btn"
              type="button"
              :class="{ 'active-upload': file }"
            >
              <i class="fas fa-image"></i>
            </button>
            <button
              @click="addComment"
              class="send-btn"
              type="button"
              :disabled="!commentModel.trim() && !file"
            >
              <i class="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ProfileImage from "@/components/ProfileImage";
import PostDisplayName from "@/components/PostDisplayName";
import LikeActionBar from "@/components/LikeActionBar.vue";
import ReactionsSummary from "@/components/ReactionsSummary.vue";
import SyncLoader from "vue-spinner/src/SyncLoader.vue";
import { Skeletor } from "vue-skeletor";
import { createToast } from "mosha-vue-toastify";
import HoverUserList from '@/components/HoverUserList';
import { getTimeAgo, formatDateTime } from '@/utils/timeUtils';

export default {
  name: "PostDetail",
  components: { 
    ProfileImage, 
    SyncLoader, 
    Skeletor, 
    PostDisplayName, 
    LikeActionBar, 
    ReactionsSummary,
    HoverUserList 
  },
  props: {
    id: {
      required: true
    },
    commentId: {
      type: String,
      default: null
    },
    scrollToComment: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      posts: [],
      comments: [],
      user: [],
      commentModel: "",
      fillError: false,
      file: "",
      isLoading: false,
      isSkeletorLoading: false,
      color: "pink",
      isLiked: false,
      likesCount: 0,
      userReaction: null,
      reactionsCount: {},
      likeLoading: false,
      showAllComments: false,
      allComments: [], // Store all comments from API
      // Pagination for comments
      commentsPage: 1,
      commentsPerPage: 10,
      hasMoreComments: true,
      loadingMoreComments: false,
      commentsObserver: null,
      // Comment edit/delete
      showCommentMenu: false,
      commentMenuPosition: { x: 0, y: 0 },
      contextComment: null,
      showEditCommentModal: false,
      showDeleteCommentModal: false,
      editingCommentContent: '',
      editingCommentId: null,
    };
  },
  async created() {
    console.log("PostDetail created with ID:", this.id);
    try {
  this.$store.dispatch("loadUser");
      this.user = this.$store.state.user;

  // Không gọi loadPostData ở đây vì đã có trong watch
    } catch (error) {
      console.error("Error in created hook:", error);
    }
  },
  watch: {
    id: {
      immediate: true,
      handler(newId) {
        console.log("ID changed to:", newId);
        if (newId) {
          this.loadPostData();
        }
      },
    },
  },
  beforeUnmount() {
    // Clean up intersection observer
    if (this.commentsObserver) {
      this.commentsObserver.disconnect();
    }
  },
  methods: {
  async loadPostData() {
      this.isSkeletorLoading = true;
      
      // Debug ID trước khi gọi API
      console.log("Raw ID:", this.id);
      console.log("ID type:", typeof this.id);
      console.log("ID stringified:", JSON.stringify(this.id));
      
      // Ensure ID is string
      const postId = String(this.id);
      console.log("Converted postId:", postId);

    try {
  const { getPost, getPostComments, getReactionStatus, getLikesCount } = await import('@/api/posts');

        console.log("Calling getPost API with postId:", postId);
        const responsePost = await getPost(postId);
        console.log("API response status:", responsePost.status);
        console.log("Full API response:", responsePost);
        
        if (responsePost.status === 200) {
          this.posts = responsePost.data;
          console.log("Post data loaded:", this.posts);
          
          if (!this.posts || !this.posts._id) {
            console.error("Post data is null or missing _id:", this.posts);
          }
          // Khởi tạo trạng thái reaction từ API chuyên biệt (ổn định hơn)
          const currentUserId = this.$store?.state?.user?._id;
          if (currentUserId) {
            try {
              const reactionStatus = await getReactionStatus(postId, currentUserId);
              if (reactionStatus.status === 200) {
                this.userReaction = reactionStatus.data?.userReaction || null;
                this.reactionsCount = reactionStatus.data?.reactionsCount || {};
                this.isLiked = !!reactionStatus.data?.userReaction;
                this.likesCount = reactionStatus.data?.likesCount ?? (this.posts?.likesCount || 0);
              }
            } catch (e) {
              // Fallback nếu API phụ lỗi
              this.likesCount = this.posts?.likesCount || 0;
              this.userReaction = null;
              this.reactionsCount = {};
              this.isLiked = Array.isArray(this.posts?.likes)
                ? this.posts.likes.includes(currentUserId)
                : false;
            }
          } else {
            try {
              const lc = await getLikesCount(postId);
              this.likesCount = lc.status === 200 && typeof lc.data?.likesCount === 'number'
                ? lc.data.likesCount
                : (this.posts?.likesCount || 0);
            } catch (_) {
              this.likesCount = this.posts?.likesCount || 0;
            }
          }
        } else {
          console.error("Failed to load post:", responsePost.status);
          console.error("Response data:", responsePost.data);
        }

        console.log("Loading comments for post ID:", postId);
        const responseComment = await getPostComments(postId);
        console.log("Comments API response:", responseComment);
        
        if (responseComment.status === 200) {
          const allComments = responseComment.data || [];
          // Load first page of comments only
          this.comments = allComments.slice(0, this.commentsPerPage);
          this.hasMoreComments = allComments.length > this.commentsPerPage;
          this.allComments = allComments; // Store all for pagination
          this.commentsPage = 1;
          console.log("Comments loaded:", this.comments.length, "of", allComments.length);
          
          // Setup intersection observer after comments loaded
          this.$nextTick(() => {
            this.setupIntersectionObserver();
          });
        } else {
          console.error("Failed to load comments:", responseComment.status);
          console.error("Comments response data:", responseComment.data);
        }
      } catch (error) {
  console.error("Load post detail error:", error);
  console.error("Error details:", error.response);
      }

      this.isSkeletorLoading = false;

      // Scroll đến comment nếu có commentId và scrollToComment = true
      console.log('PostDetail props:', {
        scrollToComment: this.scrollToComment,
        commentId: this.commentId,
        id: this.id
      });
      
      if (this.scrollToComment && this.commentId) {
        console.log('Scrolling to comment:', this.commentId);
        
        // Tự động mở tất cả comments trước khi scroll
        this.showAllComments = true;
        
        // Đợi một chút để đảm bảo comments đã render xong
        setTimeout(() => {
          this.scrollToSpecificComment(this.commentId);
        }, 500);
      }
    },
    // toggleLike logic moved into LikeActionBar component

    focusCommentInput() {
      this.$refs.commentTextarea.focus();
    },
    showReactorsModal(reactionType) {
      // TODO: Hiển thị modal danh sách người đã react với emoji này
      console.log('Show reactors for reaction:', reactionType);
      // Tạm thời emit để component cha xử lý
      this.$emit('show-reactors', { postId: this.id, reactionType });
    },
    showAllReactorsModal() {
      // TODO: Hiển thị modal tất cả người đã react
      console.log('Show all reactors for post:', this.id);
      // Tạm thời emit để component cha xử lý
      this.$emit('show-all-reactors', this.id);
    },

    toggleAllComments() {
      this.showAllComments = !this.showAllComments;
    },
    
    loadMoreComments() {
      if (this.loadingMoreComments || !this.hasMoreComments) {
        return;
      }
      
      this.loadingMoreComments = true;
      
      // Simulate delay for loading
      setTimeout(() => {
        const startIndex = this.commentsPage * this.commentsPerPage;
        const endIndex = startIndex + this.commentsPerPage;
        const nextComments = this.allComments.slice(startIndex, endIndex);
        
        if (nextComments.length > 0) {
          this.comments.push(...nextComments);
          this.commentsPage++;
          this.hasMoreComments = endIndex < this.allComments.length;
        } else {
          this.hasMoreComments = false;
        }
        
        this.loadingMoreComments = false;
      }, 300); // Small delay for better UX
    },
    
    setupIntersectionObserver() {
      // Clean up existing observer
      if (this.commentsObserver) {
        this.commentsObserver.disconnect();
      }
      
      // Setup new observer
      const options = {
        root: null,
        rootMargin: '100px', // Trigger 100px before reaching the element
        threshold: 0.1
      };
      
      this.commentsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && this.hasMoreComments && !this.loadingMoreComments) {
            this.loadMoreComments();
          }
        });
      }, options);
      
      // Observe the trigger element
      this.$nextTick(() => {
        const trigger = this.$refs.loadMoreTrigger;
        if (trigger) {
          this.commentsObserver.observe(trigger);
        }
      });
    },

    onFileChange() {
      const file = this.$refs.file.files[0];
      this.file = file;
    },
    async addComment() {
      // Kiểm tra có comment text hoặc file
      if (!this.commentModel.trim() && !this.file) {
        this.fillError = true;
        return;
      }

      this.isLoading = true;
      this.fillError = false;

      try {
        const { uploadPostFile, addComment: apiAddComment } = await import('@/api/posts');
        // Nếu có file, upload file trước
        if (this.file) {
          const formData = new FormData();
          formData.append("file", this.file);

          const uploadResponse = await uploadPostFile(formData);

          if (uploadResponse.status !== 200) {
            throw new Error("File upload failed");
          }
        }

        // Thêm comment với text và/hoặc file
        const postId = String(this.id);
        const response = await apiAddComment(postId, {
          comment: this.commentModel.trim() || undefined,
          userId: this.$store.state.user._id,
          postId: postId,
          displayName: this.user.displayName,
          file: this.file ? this.file.name : undefined,
          isTextComment: !this.file,
        });

        if (response.status === 200) {
          const data = response.data;
          // Add to both arrays
          this.allComments.unshift(data); // Add to beginning of all comments
          this.comments.unshift(data); // Add to beginning of displayed comments

          // Emit event to parent to update post commentsCount
          this.$emit('comment-added', {
            postId: postId,
            newCommentsCount: this.allComments.length
          });

          // Reset form
          this.commentModel = "";
          this.file = "";
          this.$refs.file.value = "";
        }
      } catch (error) {
        console.error("Add comment error:", error);
        createToast(
          {
            title: "Có lỗi xảy ra khi thêm bình luận",
          },
          {
            type: "error",
            showIcon: true,
          }
        );
      }

      this.isLoading = false;
    },
    formatCompact(num) {
      const n = Number(num) || 0;
      if (n >= 1000000000) return (n / 1000000000).toFixed(n % 1000000000 ? 1 : 0) + 'B';
      if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 ? 1 : 0) + 'M';
      if (n >= 1000) return (n / 1000).toFixed(n % 1000 ? 1 : 0) + 'K';
      return String(n);
    },
    scrollToComments() {
      try {
        const el = this.$el.querySelector('.comments-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (_) {}
    },

    scrollToSpecificComment(commentId) {
      try {
        // Tìm comment element bằng commentId
        const commentEl = this.$el.querySelector(`[data-comment-id="${commentId}"]`);
        if (commentEl) {
          commentEl.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
          
          // Tìm phần nội dung comment để highlight
          const commentContent = commentEl.querySelector('.comment__content');
          if (commentContent) {
            // Highlight chỉ phần nội dung comment trong 3 giây
            commentContent.classList.add('highlight-content');
            
            // Xóa highlight sau 1.5 giây
            setTimeout(() => {
              commentContent.classList.remove('highlight-content');
            }, 1000);
          }
          
          // Sau khi scroll xong, focus vào comment input để user có thể reply ngay
          setTimeout(() => {
            this.focusCommentInput();
          }, 1000);
        } else {
          // Nếu không tìm thấy comment cụ thể, scroll đến phần comments và focus input
          this.scrollToComments();
          setTimeout(() => {
            this.focusCommentInput();
          }, 500);
        }
      } catch (error) {
        console.error('Error scrolling to comment:', error);
        // Fallback: scroll đến phần comments và focus input
        this.scrollToComments();
        setTimeout(() => {
          this.focusCommentInput();
        }, 500);
      }
    },
    getTimeAgo(timestamp) {
      return getTimeAgo(timestamp);
    },
    formatFullDateTime(timestamp) {
      return formatDateTime(timestamp, true);
    },
    
    // Comment management methods
    formatCommentTime(timestamp) {
      const now = new Date();
      const commentTime = new Date(timestamp);
      const diffInSeconds = Math.floor((now - commentTime) / 1000);

      if (diffInSeconds < 60) {
        return 'Vừa xong';
      }
      
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      if (diffInMinutes < 60) {
        return `${diffInMinutes} phút`;
      }
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) {
        return `${diffInHours} giờ`;
      }
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays === 1) {
        return 'Hôm qua';
      }
      if (diffInDays < 7) {
        return `${diffInDays} ngày`;
      }
      
      const diffInWeeks = Math.floor(diffInDays / 7);
      if (diffInWeeks < 4) {
        return `${diffInWeeks} tuần`;
      }
      
      const diffInMonths = Math.floor(diffInDays / 30);
      if (diffInMonths < 12) {
        return `${diffInMonths} tháng`;
      }
      
      const diffInYears = Math.floor(diffInDays / 365);
      return `${diffInYears} năm`;
    },
    
    canEditComment(comment) {
      return comment.userId === this.user._id;
    },
    
    openCommentMenu(comment, event) {
      event.stopPropagation();
      this.contextComment = comment;
      
      // Position menu near the click
      const rect = event.target.getBoundingClientRect();
      this.commentMenuPosition = {
        x: rect.left - 150, // Menu width is ~160px, position to the left of icon
        y: rect.bottom + 5
      };
      
      this.showCommentMenu = true;
      
      // Close menu when clicking outside
      this.$nextTick(() => {
        const closeMenu = (e) => {
          if (!e.target.closest('.comment-context-menu') && !e.target.closest('.comment__menu-icon')) {
            this.showCommentMenu = false;
            document.removeEventListener('click', closeMenu);
          }
        };
        document.addEventListener('click', closeMenu);
      });
    },
    
    editComment() {
      if (!this.contextComment) return;
      
      this.editingCommentId = this.contextComment._id;
      this.editingCommentContent = this.contextComment.comment || '';
      this.showCommentMenu = false;
      this.showEditCommentModal = true;
      
      // Focus textarea after modal opens
      this.$nextTick(() => {
        const textarea = this.$refs.editCommentTextarea;
        if (textarea) {
          textarea.focus();
          // Move cursor to end
          textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }
      });
    },
    
    cancelEditComment() {
      this.showEditCommentModal = false;
      this.editingCommentContent = '';
      this.editingCommentId = null;
      this.contextComment = null;
    },
    
    async saveEditComment() {
      if (!this.editingCommentId || !this.editingCommentContent.trim()) {
        return;
      }
      
      try {
        const { editComment } = await import('@/api/posts');
        const response = await editComment(
          this.posts._id,
          this.editingCommentId,
          this.editingCommentContent,
          this.user._id
        );
        
        if (response.status === 200) {
          // Update local comment
          const commentIndex = this.comments.findIndex(c => c._id === this.editingCommentId);
          if (commentIndex !== -1) {
            this.comments[commentIndex].comment = this.editingCommentContent;
          }
          
          // Also update in allComments if exists
          const allCommentIndex = this.allComments.findIndex(c => c._id === this.editingCommentId);
          if (allCommentIndex !== -1) {
            this.allComments[allCommentIndex].comment = this.editingCommentContent;
          }
          
          this.cancelEditComment();
        }
      } catch (error) {
        console.error('Error updating comment:', error);
        alert('Không thể cập nhật bình luận. Vui lòng thử lại.');
      }
    },
    
    confirmDeleteComment() {
      this.showCommentMenu = false;
      this.showDeleteCommentModal = true;
    },
    
    async deleteComment() {
      if (!this.contextComment) return;
      
      try {
        const { deleteComment } = await import('@/api/posts');
        const response = await deleteComment(
          this.posts._id,
          this.contextComment._id,
          this.user._id
        );
        
        if (response.status === 200) {
          // Remove from local comments array
          this.comments = this.comments.filter(c => c._id !== this.contextComment._id);
          this.allComments = this.allComments.filter(c => c._id !== this.contextComment._id);
          
          this.showDeleteCommentModal = false;
          this.contextComment = null;
        }
      } catch (error) {
        console.error('Error deleting comment:', error);
        alert('Không thể xóa bình luận. Vui lòng thử lại.');
      }
    },
  },
};
</script>

<style lang="scss" scoped>
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fb-modal-header {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  backdrop-filter: blur(12px);
  border-radius: 18px 18px 0 0;
  box-shadow: 0 2px 12px rgba(102, 126, 234, 0.08);
  border-bottom: 1px solid rgba(102, 126, 234, 0.1);
  z-index: 20;
  padding: 1.25rem 1.75rem;
  min-height: 60px;
  overflow: visible;
  margin-top: 0;
  animation: slideDown 0.3s ease;
}

.fb-modal-header__flex {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 0;
  position: relative;
}

.fb-modal-header__title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  text-align: center;
  letter-spacing: -0.01em;
}

.fb-modal-header__user {
  font-size: 1.125rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.fb-modal-header__close {
  position: absolute;
  top: 50%;
  right: -0.5rem;
  transform: translateY(-50%);
  background: rgba(102, 126, 234, 0.08);
  border: none;
  border-radius: 50%;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  color: #667eea;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
  z-index: 21;
  font-weight: 300;
}

.fb-modal-header__close:hover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  transform: translateY(-50%) rotate(90deg) scale(1.05);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}
.post-detail {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  position: relative;
  padding-top: 0;
  max-height: 85vh;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(102, 126, 234, 0.3) transparent;
  background: white;
  border-radius: 18px;
}

.post-detail::-webkit-scrollbar {
  width: 6px;
}

.post-detail::-webkit-scrollbar-track {
  background: transparent;
}

.post-detail::-webkit-scrollbar-thumb {
  background: rgba(102, 126, 234, 0.3);
  border-radius: 10px;
  transition: background 0.2s ease;
}

.post-detail::-webkit-scrollbar-thumb:hover {
  background: rgba(102, 126, 234, 0.5);
}

.timeline__text-post {
  padding: 2rem;
  display: flex;
  justify-content: flex-start;
  flex-direction: column;
  background: white;
  margin-bottom: 0;
  transform: translate(0, 0);
  transition: all 0.3s ease;
}

.timeline__text-post:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.02) 0%, rgba(118, 75, 162, 0.02) 100%);
}

/* Avatar trong phần main post: dùng cùng style với Timeline (40x40, tròn) */
.timeline__text-post > :deep(img.image-post__avatar) {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 1rem;
  flex-shrink: 0;
}

.text-post__user-post a {
  font-weight: bold;
  font-size: 1rem;
}

.text-post__content {
  font-size: 0.9rem;
  white-space: pre-wrap;
  word-wrap: break-word;
  word-break: break-word;
  overflow-wrap: break-word;
  line-height: 1.4;
  max-width: 100%;
  width: fit-content; /* Thêm để co giãn theo nội dung */
  font-family: inherit;
  letter-spacing: normal;
  word-spacing: normal;
  margin-bottom: 1rem;
  margin-top: 1rem;
}

.main-post {
  display: flex;
}

.post__user-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  max-width: 100%;
}

.post-user-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.post-time {
  font-size: 0.8125rem;
  color: #94a3b8;
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.post-time:hover {
  color: #667eea;
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
  margin: 0.25rem 0 0.25rem 0;
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

.comments-section {
  width: 100%;
  margin-top: 1.5rem;
}

.comments-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1.25rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
}

.comments {
  margin-top: 1rem;
  width: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box; /* Đảm bảo kích thước chính xác */
}

.no-comments {
  color: #9ca3af;
  font-style: italic;
  padding: 2rem;
  text-align: center;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%);
  border-radius: 12px;
  border: 2px dashed rgba(102, 126, 234, 0.2);
}

.additional-comments {
  margin-top: 0.75rem;
  width: 100%;
}

.comment {
  margin-top: 1rem;
  display: flex;
  flex-direction: row;
  animation: fadeIn 0.3s ease;
}

.comment__content {
  display: inline-block;
  max-width: 100%;
  word-wrap: break-word;
  box-sizing: border-box;
  padding: 1rem 1.25rem;
  align-items: flex-start;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.04) 0%, rgba(118, 75, 162, 0.04) 100%);
  border: 1px solid rgba(102, 126, 234, 0.1);
  border-radius: 18px;
  width: fit-content;
  transition: all 0.3s ease;
}

.comment__content:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
  border-color: rgba(102, 126, 234, 0.2);
  transform: translateX(2px);
}

.btn-textadd {
  transform: translate(0, 3px);
  transition: 0.4s;
  background-color: var(--green);
  width: 8rem;
  font-size: 0.85rem;
  margin-right: 1rem;
}
.btn-textadd:hover {
  background-color: #59b956;
  transition: 0.4s;
  box-shadow: 0px 15px 15px -5px rgba(0, 0, 0, 0.2);
  transform: translate(0, -3px);
}

.add-post {
  position: fixed;
  left: 50%;
  top: 40%;
  transform: translate(-50%, -50%);
  width: auto;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: 1.6rem 3rem;
  border: 3px solid black;
  border-radius: 5px;
  background: white;
  box-shadow: 8px 8px 0 rgba(0, 0, 0, 0.2);
  z-index: 1;
  &__title {
    margin-bottom: 1rem;
    margin-top: 1rem;
  }
}

.description {
  font-size: 1.1rem;
  margin-bottom: 1.6rem;
  margin-top: 0;
}
.btn-addpost {
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  background: white;
  padding: 0.3rem 3.4rem;
  border: 3px solid black;
  margin-right: 2.6rem;
  box-shadow: 0 0 0 black;
  transition: all 0.2s;
}

.btn-addpost:last-child {
  margin: 0;
}

.btn-addpost:hover {
  box-shadow: 0.4rem 0.4rem 0 black;
  transform: translate(-0.4rem, -0.4rem);
}

.btn-addpost:active {
  box-shadow: 0 0 0 black;
  transform: translate(0, 0);
}

.options {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

.input {
  position: relative;

  &__label {
    position: absolute;
    left: 0;
    top: 0;
    padding: calc(var(--size-bezel) * 0.75) calc(var(--size-bezel) * 0.5);
    margin: calc(var(--size-bezel) * 0.75 + 3px) calc(var(--size-bezel) * 0.5);
    white-space: nowrap;
    transform: translate(0, 0);
    transform-origin: 0 0;
    transition: transform 120ms ease-in;
    font-weight: bold;
    line-height: 1.2;
  }
  &__field {
    box-sizing: border-box;
    display: block;
    width: 300px;
    border: 3px solid currentColor;
    padding: calc(var(--size-bezel) * 1.5) var(--size-bezel);
    color: currentColor;
    background: transparent;
    border-radius: var(--size-radius);
    margin-bottom: 1rem;

    &:focus,
    &:not(:placeholder-shown) {
      & + .input__label {
        transform: translate(0.25rem, -90%) scale(0.8);
        color: var(--pink);
      }
    }
  }
}

.warn {
  color: var(--red);
}

.image-post__user-post {
  display: flex;
  flex-direction: column;
}

.image-post__user-post a {
  font-weight: bold;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.main-post :deep(.image-post__avatar) {
  margin-right: 1rem;
}

.post-detail-main-img {
  max-width: 100%;
  width: auto !important;
  height: auto !important;
  border-radius: 0 !important;
  display: block;
  margin: 0.5rem 0;
}

.comment-img {
  width: auto !important;
  height: auto !important;
  max-height: 250px; /* Giới hạn chiều cao tối đa */
  border-radius: 8px !important;
  display: block;
  margin: 0.5rem 0; /* Margin trên dưới, không có margin trái phải */
  object-fit: cover; /* Đảm bảo ảnh hiển thị đẹp */
  align-self: flex-start; /* Căn trái */
}

.post-actions {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 0.5rem 0;
  margin: 0.5rem 0;
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

.like-btn.liked .action-icon {
  filter: brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%)
    hue-rotate(346deg) brightness(104%) contrast(97%);
}

.post-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.25rem;
  margin: 0.75rem 0;
  color: #6b7280;
  font-size: 0.9rem;
}

.stats-likes {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0.25rem 0.5rem;
  border-radius: 8px;
}

.stats-likes:hover {
  background: rgba(102, 126, 234, 0.05);
}

.stats-like-icon {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);
}

.stats-likes-number {
  font-weight: 600;
  color: #667eea;
}

.stats-comments {
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  padding: 0.25rem 0.5rem;
  border-radius: 8px;
}

.stats-comments:hover {
  color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

.comment-input-box {
  display: flex;
  align-items: flex-start;
  padding: 1.5rem;
  margin-top: 0;
  gap: 1rem;
}

/* Sticky footer styling */
.sticky-footer {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%);
  backdrop-filter: blur(12px);
  box-shadow: 0 -2px 12px rgba(102, 126, 234, 0.1);
  margin: 0;
  border-radius: 0 0 18px 18px;
  z-index: 10;
  border-top: 1px solid rgba(102, 126, 234, 0.1);
}

/* Avatar trong danh sách comment và ô nhập bình luận */
.comment-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  margin-right: 0;
  border: 3px solid transparent;
  background: linear-gradient(white, white) padding-box,
              linear-gradient(135deg, #667eea, #764ba2) border-box;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
  transition: all 0.3s ease;
}

.comment-avatar:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.25);
}

.comment-input-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.comment-input-wrapper {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center; /* Căn giữa các phần tử theo chiều dọc */
}

.comment-textarea {
  width: 100%;
  min-height: 44px;
  padding: 0.875rem 5.5rem 0.875rem 1rem;
  border: 2px solid rgba(102, 126, 234, 0.15);
  border-radius: 24px;
  resize: none;
  font-family: inherit;
  font-size: 0.9375rem;
  outline: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(102, 126, 234, 0.02);
  color: #1f2937;
}

.comment-textarea::placeholder {
  color: #9ca3af;
}

.comment-textarea:focus {
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
  transform: translateY(-1px);
}

.input-actions {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding-right: 0.25rem;
  height: 36px;
  z-index: 15;
}

.comment-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.5rem;
  padding-bottom: 4px; /* Thêm padding dưới để nút không bị cắt */
}

.file-input {
  display: none;
}

.attach-btn {
  background: rgba(102, 126, 234, 0.08);
  border: none;
  font-size: 1.125rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  position: relative;
  z-index: 16;
  color: #667eea;
}

.attach-btn:hover {
  transform: scale(1.1);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
}

.attach-btn.active-upload {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  position: relative;
}

.attach-btn.active-upload::after {
  content: "";
  position: absolute;
  width: 10px;
  height: 10px;
  background: #10b981;
  border: 2px solid white;
  border-radius: 50%;
  bottom: -2px;
  right: -2px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

.send-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  width: 36px;
  height: 36px;
  position: relative;
  z-index: 20;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.1) rotate(-5deg);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.send-btn:disabled {
  background: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
  box-shadow: none;
}

.send-icon i,
.attach-btn i {
  font-size: 1.125rem;
}

.attach-btn:not(.active-upload) i {
  color: #667eea;
}

.attach-btn.active-upload i {
  color: white;
}
.comment-buttons {
  display: flex;
  justify-content: flex-end;
}

.likes-count {
  margin-left: 4px;
  color: #999;
}

.view-more-btn {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
  border: 2px solid rgba(102, 126, 234, 0.2);
  color: #667eea;
  font-weight: 600;
  cursor: pointer;
  padding: 0.625rem 1.25rem;
  font-size: 0.9375rem;
  margin: 0.75rem 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 12px;
  letter-spacing: -0.01em;
}

.view-more-btn:hover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

/* Highlight comment effect - chỉ highlight nội dung comment, không highlight cả dòng */
.comment__content.highlight-content {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.12) 100%) !important;
  border: 2px solid #667eea !important;
  border-radius: 18px !important;
  padding: 1rem 1.25rem !important;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2) !important;
  animation: highlight-fade 1.5s ease-in-out;
  position: relative;
}

.comment__content.highlight-content::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 20px;
  z-index: -1;
  animation: pulse-border 1.5s ease-in-out;
}

@keyframes highlight-fade {
  0% {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.12) 100%);
    border-color: #667eea;
    transform: scale(1.03);
  }
  40% {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.12) 100%);
    border-color: #667eea;
    transform: scale(1.03);
  }
  100% {
    background: transparent;
    border-color: transparent;
    transform: scale(1);
  }
}

@keyframes pulse-border {
  0%, 40% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.1);
  }
}

/* Highlight comment khi scroll đến */
.highlight-comment {
  background-color: rgba(255, 235, 59, 0.3);
  border-left: 3px solid #ff9800;
  padding-left: 8px;
  margin-left: -8px;
  transition: all 0.3s ease;
  border-radius: 4px;
}

/* Loading indicator for comments pagination */
.loading-more-comments {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1.5rem;
  color: #667eea;
  font-size: 0.9375rem;
  font-weight: 500;
}

.loading-more-comments::before {
  content: '';
  display: inline-block;
  width: 20px;
  height: 20px;
  margin-right: 0.75rem;
  border: 3px solid rgba(102, 126, 234, 0.2);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.post-detail-skeleton {
  padding: 1.5rem;
}

.skeleton-main {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.skeleton-content {
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

/* Invisible trigger for infinite scroll */
.load-more-trigger {
  height: 1px;
  width: 100%;
  visibility: hidden;
}

/* Responsive styles */
@media (max-width: 768px) {
  .post-time {
    font-size: 0.75rem;
  }
}

@media (max-width: 480px) {
  .post-time {
    font-size: 0.7rem;
  }
}

@media (max-width: 360px) {
  .post-time {
    font-size: 0.7rem;
  }
}

/* Comment header with time and actions */
.comment__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
  width: 100%;
}

.comment__user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.comment__time {
  color: #65676b;
  font-size: 12px;
  font-weight: 400;
}

.comment__actions {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.comment:hover .comment__actions {
  opacity: 1;
}

.comment__menu-icon {
  font-size: 18px !important;
  color: #65676b;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.comment__menu-icon:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: #1f2937;
}

/* Comment context menu */
.comment-context-menu {
  position: fixed;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 0.5rem 0;
  z-index: 1000;
  min-width: 160px;
  animation: slideDown 0.15s ease;
}

.comment-context-menu .menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background-color 0.15s ease;
  font-size: 0.9375rem;
  font-weight: 500;
}

.comment-context-menu .menu-item:hover {
  background-color: rgba(102, 126, 234, 0.08);
}

.comment-context-menu .menu-item.delete {
  color: #dc2626;
}

.comment-context-menu .menu-item.delete:hover {
  background-color: rgba(220, 38, 38, 0.08);
}

.comment-context-menu .menu-item i {
  font-size: 18px;
}

/* Edit comment modal - Facebook style */
.edit-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
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

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.edit-modal {
  background: white;
  border-radius: 16px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.25);
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow: hidden;
  animation: modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
}

.edit-modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%);
  position: relative;
}

.edit-modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1c1e21;
  text-align: center;
  letter-spacing: -0.02em;
}

.edit-modal-body {
  padding: 1.5rem;
  flex: 1;
  overflow-y: auto;
}

.edit-modal-body textarea {
  width: 100%;
  min-height: 140px;
  padding: 1rem;
  border: 2px solid #e4e6eb;
  border-radius: 12px;
  font-family: inherit;
  font-size: 0.9375rem;
  line-height: 1.5;
  resize: vertical;
  transition: all 0.2s ease;
  background: #f8f9fa;
  color: #1c1e21;
}

.edit-modal-body textarea:focus {
  outline: none;
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.edit-modal-body textarea::placeholder {
  color: #8a8d91;
}

.edit-modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  background: #f8f9fa;
}

.btn-cancel,
.btn-save,
.btn-delete {
  padding: 0.75rem 1.75rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  letter-spacing: 0.01em;
  position: relative;
  overflow: hidden;
}

.btn-cancel {
  background: #e4e6eb;
  color: #050505;
}

.btn-cancel:hover {
  background: #d8dadf;
  transform: translateY(-1px);
}

.btn-cancel:active {
  transform: translateY(0);
}

.btn-save {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.btn-save:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
}

.btn-save:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-delete {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
}

.btn-delete:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(220, 38, 38, 0.4);
}

.btn-delete:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
}

/* Delete confirmation modal - Facebook style */
.delete-confirm-modal {
  padding: 2rem 2.5rem;
  text-align: center;
  max-width: 420px;
}

.delete-confirm-modal h3 {
  margin: 0 0 1rem 0;
  font-size: 1.375rem;
  font-weight: 700;
  color: #1c1e21;
  letter-spacing: -0.02em;
}

.delete-confirm-modal p {
  margin: 0 0 2rem 0;
  font-size: 1rem;
  line-height: 1.5;
  color: #65676b;
}

.delete-confirm-modal .modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.delete-confirm-modal button {
  min-width: 120px;
}

/* Responsive modal styles */
@media (max-width: 640px) {
  .edit-modal {
    max-width: 95%;
    margin: 0 1rem;
  }

  .edit-modal-header h3 {
    font-size: 1.125rem;
  }

  .edit-modal-body {
    padding: 1.25rem;
  }

  .edit-modal-body textarea {
    min-height: 120px;
    font-size: 0.875rem;
  }

  .edit-modal-footer {
    padding: 0.875rem 1.25rem;
  }

  .btn-cancel,
  .btn-save,
  .btn-delete {
    padding: 0.625rem 1.25rem;
    font-size: 0.875rem;
  }

  .delete-confirm-modal {
    padding: 1.5rem 1.75rem;
    max-width: 95%;
  }

  .delete-confirm-modal h3 {
    font-size: 1.125rem;
  }

  .delete-confirm-modal p {
    font-size: 0.9375rem;
    margin-bottom: 1.5rem;
  }

  .delete-confirm-modal .modal-actions {
    flex-direction: column;
  }

  .delete-confirm-modal button {
    width: 100%;
  }
}
</style>
