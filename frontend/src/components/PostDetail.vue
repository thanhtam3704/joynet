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
      <Skeletor circle size="50" class="skeletor" v-if="isSkeletorLoading" />
      <Skeletor
        v-if="isSkeletorLoading"
        class="skeletor"
        width="600"
        height="20"
      />
      <Skeletor
        v-if="isSkeletorLoading"
        class="skeletor"
        width="600"
        height="300"
      />
      <div class="main-post" v-else>
        <ProfileImage :id="posts.userId" class="comment-avatar" />

        <div class="post__user-content">
          <PostDisplayName :id="posts.userId" />
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

      <!-- Action Bar - Thanh Thích/Bình luận -->
      <div class="post-actions">
        <button class="action-btn like-btn" @click="toggleLike">
          <span class="action-icon">👍</span>
          <span :class="{ liked: isLiked }">Thích</span>
        </button>

        <button class="action-btn comment-btn" @click="focusCommentInput">
          <span class="action-icon">💬</span>
          <span>Bình luận</span>
        </button>
      </div>

      <!-- Comments Section -->
      <div class="comments-section">
        <h3 class="comments-title">Bình luận</h3>
        <div class="comments" v-if="comments.length > 0">
          <!-- Hiển thị 1 comment đầu tiên -->
          <div
            class="comment"
            v-if="comments.length > 0"
            :class="{
              'comment--text-only': comments[0].comment && !comments[0].file,
              'comment--image-only': !comments[0].comment && comments[0].file,
              'comment--text-and-image':
                comments[0].comment && comments[0].file,
            }"
          >
            <ProfileImage :id="comments[0].userId" class="comment-avatar" />
            <div class="comment__content">
              <PostDisplayName :id="comments[0].userId" />
              <p class="text-post__content" v-if="comments[0].comment">
                {{ comments[0].comment }}
              </p>
              <img
                v-if="comments[0].file"
                class="comment-img"
                :src="`http://localhost:3000/uploads/${comments[0].file}`"
              />
            </div>
          </div>

          <!-- Nút Xem thêm bình luận -->
          <button
            v-if="!showAllComments && comments.length > 1"
            @click="toggleAllComments"
            class="view-more-btn"
          >
            Xem thêm {{ comments.length - 1 }} bình luận
          </button>

          <!-- Hiển thị tất cả comments còn lại khi showAllComments = true -->
          <div v-if="showAllComments" class="additional-comments">
            <div
              class="comment"
              v-for="(comment, index) in comments.slice(1)"
              :key="comment._id"
              :class="{
                'comment--text-only': comment.comment && !comment.file,
                'comment--image-only': !comment.comment && comment.file,
                'comment--text-and-image': comment.comment && comment.file,
              }"
            >
              <ProfileImage :id="comment.userId" class="comment-avatar" />
              <div class="comment__content">
                <PostDisplayName :id="comment.userId" />
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

            <!-- Nút Ẩn bớt bình luận -->
            <button @click="toggleAllComments" class="view-more-btn">
              Ẩn bớt bình luận
            </button>
          </div>
        </div>
        <div v-else class="no-comments">
          Chưa có bình luận nào. Hãy là người đầu tiên bình luận!
        </div>
      </div>
    </div>

    <!-- Padding để tạo không gian cho comment box cố định ở dưới -->
    <div class="comment-padding"></div>

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
import SyncLoader from "vue-spinner/src/SyncLoader.vue";
import { Skeletor } from "vue-skeletor";
import { createToast } from "mosha-vue-toastify";

export default {
  name: "PostDetail",
  props: ["id"],
  components: { ProfileImage, SyncLoader, Skeletor, PostDisplayName },
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
      showAllComments: false,
    };
  },
  async created() {
    console.log("PostDetail created with ID:", this.id);
    try {
      this.$store.dispatch("fetchUser");
      this.user = this.$store.state.user;

      // Không gọi fetchPostData ở đây vì đã có trong watch
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
          this.fetchPostData();
        }
      },
    },
  },
  methods: {
    async fetchPostData() {
      this.isSkeletorLoading = true;
      console.log("Fetching post data for ID:", this.id);

      try {
        const responsePost = await fetch(
          `http://localhost:3000/api/posts/${this.id}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          }
        );

        if (responsePost.ok) {
          this.posts = await responsePost.json();
          console.log("Post data loaded:", this.posts);
        } else {
          console.error("Failed to load post:", responsePost.status);
        }

        const responseComment = await fetch(
          `http://localhost:3000/api/posts/${this.id}/comments`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          }
        );

        if (responseComment.ok) {
          this.comments = await responseComment.json();
          console.log("Comments loaded:", this.comments.length);
        } else {
          console.error("Failed to load comments:", responseComment.status);
        }
      } catch (error) {
        console.error("Fetch post detail error:", error);
      }

      this.isSkeletorLoading = false;
    },
    toggleLike() {
      this.isLiked = !this.isLiked;
      // TODO: Gọi API để like/unlike post
    },

    focusCommentInput() {
      this.$refs.commentTextarea.focus();
    },

    toggleAllComments() {
      this.showAllComments = !this.showAllComments;
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
        // Nếu có file, upload file trước
        if (this.file) {
          const formData = new FormData();
          formData.append("file", this.file);

          const uploadResponse = await fetch(
            "http://localhost:3000/api/posts/upload",
            {
              method: "POST",
              credentials: "include",
              body: formData,
            }
          );

          if (!uploadResponse.ok) {
            throw new Error("File upload failed");
          }
        }

        // Thêm comment với text và/hoặc file
        const response = await fetch(
          `http://localhost:3000/api/posts/${this.id}/comment`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              comment: this.commentModel.trim() || undefined,
              userId: this.$store.state.user._id,
              postId: this.id,
              displayName: this.user.displayName,
              file: this.file ? this.file.name : undefined,
              isTextComment: !this.file, // true nếu chỉ có text, false nếu có file
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          this.comments.push(data);

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
  },
};
</script>

<style lang="scss" scoped>
.fb-modal-header {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  background: #fff;
  border-radius: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-bottom: 1px solid #eee;
  z-index: 20;
  padding: 12px 24px 12px 24px;
  min-height: 30px;
  overflow: visible;
  margin-top: 0;
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
  font-size: 1em;
  font-weight: 500;
  color: #222;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  text-align: center;
}
.fb-modal-header__user {
  font-size: 1em;
  font-weight: 500;
  color: #222;
}
.fb-modal-header__close {
  position: absolute;
  top: 50%;
  right: 25px;
  transform: translateY(-50%);
  background: #e5e7eb;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.7rem;
  color: #222;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
  z-index: 2;
}
.fb-modal-header__close:hover {
  background: #d1d5db;
}
.post-detail {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  position: relative;
  padding-top: 0; /* Không để khoảng cách phía trên, header dính sát modal */
  max-height: 80vh; /* Giới hạn chiều cao để đảm bảo scroll hoạt động đúng */
  overflow-x: hidden; /* Ẩn thanh cuộn ngang */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE & Edge */
}

.timeline__text-post {
  padding: 1.5rem;
  display: flex;
  justify-content: flex-start;
  flex-direction: column;
  background-color: white;
  border-radius: 0 0 1rem 1rem; /* Bo góc dưới, phía trên sát header */
  margin-bottom: 0; /* Loại bỏ margin để không có khoảng trống giữa nội dung và comment box */
  transform: translate(
    0,
    0
  ); /* Loại bỏ transform để tránh vấn đề với sticky positioning */
  transition: 0.4s;
}

.timeline__text-post:hover {
  transition: 0.4s;
  box-shadow: rgb(233, 191, 191) 3px 3px 6px 0px inset,
    rgba(255, 255, 255, 0.5) -3px -3px 6px 1px inset;
  /* Loại bỏ transform để không ảnh hưởng đến layout */
}

.timeline__text-post img {
  width: 54px;
  height: 54px;
  border-radius: 35%;
  margin-right: 1rem;
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

.comments-section {
  margin-top: 1.5rem;
  padding-top: 1rem;
  width: 100%;
  border-top: 1px solid #e0e0e0;
}

.comments-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #333;
}

.comments {
  margin-top: 1rem;
  width: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box; /* Đảm bảo kích thước chính xác */
}

.no-comments {
  color: #777;
  font-style: italic;
  padding: 1rem 0;
  text-align: center;
}

.additional-comments {
  margin-top: 0.5rem;
  width: 100%;
}

.comment {
  margin-top: 1rem;
  display: flex;
  flex-direction: row;
}

.comment__content {
  /* Ensure the width adjusts to the content */
  display: inline-block; /* Change to inline-block for content-based width */
  max-width: 100%; /* Prevent overflow */
  word-wrap: break-word; /* Handle long words */
  box-sizing: border-box; /* Include padding and border in width */
  padding: 0.25rem;
  align-items: flex-start; /* Đảm bảo tất cả các phần tử con đều căn trái */
  box-sizing: border-box; /* Đảm bảo padding không làm tăng kích thước */
  background-color: #f5f5f7; /* Đồng nhất màu nền */
  border: 1px solid #e0e0e5;
  border-radius: 18px;
  padding: 1rem;
  width: fit-content; /* Thay đổi để co giãn theo nội dung */
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

.image-post__avatar {
  width: 54px;
  height: 54px;
  border-radius: 35%;
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

.like-btn.liked .action-icon {
  filter: brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%)
    hue-rotate(346deg) brightness(104%) contrast(97%);
}

.comment-padding {
  height: 50px; /* Tăng không gian cho comment box */
  margin-top: 2rem; /* Thêm margin để tạo không gian giữa comments và comment box */
}

.comment-input-box {
  display: flex;
  align-items: flex-start;
  padding: 1rem;
  border-top: 1px solid #e0e0e0;
  margin-top: 1rem;
  gap: 0.75rem;
}

/* Sticky footer styling */
.sticky-footer {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  margin: 0;
  border-radius: 0 0 12px 12px;
  z-index: 10;
}

.comment-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
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
  width: 80%; /* Đặt chiều rộng của textarea là 80% */
  min-height: 40px;
  padding: 0.75rem;
  padding-right: 90px; /* Tạo khoảng trống cho các icon */
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  resize: none;
  font-family: inherit;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.3s ease;
  float: left; /* Giúp các nút không bị che khuất */
}

.comment-textarea:focus {
  border-color: #007bff;
}

.input-actions {
  position: absolute;
  right: 20px; /* Di chuyển các nút sang phải để phù hợp với textarea 80% */
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding-right: 5px;
  height: 30px;
  z-index: 15; /* Tăng z-index để đảm bảo luôn ở trên cùng */
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
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  position: relative;
  z-index: 10; /* Đảm bảo có thể click được */
}

.attach-btn:hover {
  transform: scale(1.1);
  color: #007bff;
}

.attach-btn.active-upload {
  color: #007bff;
  position: relative;
}

.attach-btn.active-upload::after {
  content: "";
  position: absolute;
  width: 8px;
  height: 8px;
  background-color: #007bff;
  border-radius: 50%;
  bottom: 0;
  right: 0;
}

.send-btn {
  background: none;
  border: none;
  color: #007bff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 30px;
  height: 30px;
  position: relative;
  z-index: 20; /* Tăng z-index để luôn ở trên cùng */
  margin-left: auto; /* Đẩy nút sang bên phải */
}

.send-icon {
  font-size: 1.2rem;
}

.send-icon i,
.attach-btn i {
  font-size: 1.2rem;
  color: #666;
}

.attach-btn:hover i,
.send-btn:hover:not(:disabled) i {
  color: #007bff;
}

.send-btn.active-upload i {
  color: #007bff;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.1);
  color: #0056b3;
}

// .send-btn:not(:disabled) {
//   cursor: pointer;
// }

.send-btn:disabled {
  color: #ccc;
  cursor: not-allowed;
}
.comment-buttons {
  display: flex;
  justify-content: flex-end;
}

.view-more-btn {
  background: none;
  border: none;
  color: #007bff;
  font-weight: 600;
  cursor: pointer;
  padding: 0.5rem 0;
  font-size: 0.9rem;
  margin: 0.5rem 0;
  transition: color 0.2s ease;
}

.view-more-btn:hover {
  color: #0056b3;
  text-decoration: underline;
}
</style>
