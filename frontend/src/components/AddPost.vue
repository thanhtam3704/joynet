<template>
  <form
    class="fb-create-post"
    @submit.prevent="addImagePost"
    enctype="multipart/form-data"
    v-if="openAddPost"
    @click.self="closeModal"
  >
    <div class="fb-card">
      <!-- Header -->
      <div class="fb-card__header">
        <div class="fb-card__title">Tạo bài viết</div>
        <button
          class="fb-card__close"
          type="button"
          aria-label="Đóng"
          @click="closeModal"
        >
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="fb-card__body">
        <!-- User row -->
        <div class="fb-user-row">
          <ProfileImage :id="currentUser._id || id" class="fb-user-row__avatar" />
          <div class="fb-user-row__meta">
            <div class="fb-user-row__name">{{ currentUser.displayName || currentUser.name || currentUser.email || 'Người dùng' }}</div>
          </div>
        </div>

        <!-- Textarea -->
        <div class="fb-input">
          <textarea
            v-model="textDescription"
            class="fb-input__textarea"
            placeholder="Bạn đang nghĩ gì?"
            rows="4"
            @input="autoResize"
            ref="composerTextarea"
          ></textarea>
        </div>

        <!-- Media -->
        <div class="fb-media">
          <input
            class="fb-media__file-input"
            type="file"
            @change="onFileChange"
            ref="file"
            name="file"
            accept="image/*"
          />

          <div v-if="previewUrl" class="fb-media__preview">
            <div class="fb-media__preview-inner">
              <img :src="previewUrl" alt="preview" />
              <button type="button" class="fb-media__remove" @click="removeImage">×</button>
            </div>
          </div>
          <label v-else class="fb-media__dropzone" @click="$refs.file.click()">
            <div class="fb-media__dz-icon">🖼️</div>
            <div class="fb-media__dz-text">Thêm ảnh/video<span>Kéo & thả để tải nhanh</span></div>
          </label>
        </div>
      </div>

      <!-- Error -->
      <div class="fb-error" v-if="fillError">Vui lòng nhập nội dung hoặc chọn ảnh</div>

      <!-- Footer actions -->
      <div class="fb-actions">
        <button
          type="submit"
          id="btn-post"
          class="fb-btn fb-btn--primary"
          :disabled="isLoading || (!textDescription && !file)"
          v-if="!isLoading"
        >
          Đăng
        </button>
        <sync-loader :color="color" v-else></sync-loader>
        <button type="button" class="fb-btn fb-btn--ghost" @click="closeModal" v-if="!isLoading">Đóng</button>
      </div>
    </div>
  </form>
</template>

<script>
import SyncLoader from "vue-spinner/src/SyncLoader.vue";
import { createToast } from "mosha-vue-toastify";
import ProfileImage from "@/components/ProfileImage";

export default {
  name: "AddImagePost",
  components: {
    SyncLoader,
    ProfileImage,
  },
  props: ["id"],
  data() {
    return {
      posts: [],
      user: [], // legacy field (kept for backward compatibility)
      file: null,
      previewUrl: "",
      isLoading: false,
      color: "pink",
      openAddPost: true,
      textDescription: "",
      fillError: false,
      postingSuccess: "",
    };
  },
  computed: {
    currentUser() {
      return (this.$store && this.$store.state && this.$store.state.user) || {};
    }
  },
  created() {
    try {
      if (this.$store && (!this.$store.state.isUserLoaded || !this.$store.state.user?._id)) {
        this.$store.dispatch('loadUser');
      }
    } catch (_) {}
  },
  methods: {
    onFileChange() {
      const file = this.$refs.file.files[0];
      this.file = file;
      if (this.previewUrl) {
        try { URL.revokeObjectURL(this.previewUrl); } catch (_) {}
      }
      this.previewUrl = file ? URL.createObjectURL(file) : "";
    },
    removeImage() {
      this.file = null;
      if (this.$refs.file) this.$refs.file.value = "";
      if (this.previewUrl) {
        try { URL.revokeObjectURL(this.previewUrl); } catch (_) {}
      }
      this.previewUrl = "";
    },
    closeModal() {
      this.removeImage();
      this.textDescription = ''; // Reset text
      this.fillError = false; // Reset error state
      this.openAddPost = false;
      this.$emit('close'); // Emit close event to parent component
    },
    autoResize() {
      // Cho textarea tự giãn chiều cao, phần thân card sẽ scroll chung
      const el = this.$refs.composerTextarea;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
      el.style.overflowY = 'hidden';
    },
    async addImagePost() {
      // Kiểm tra nếu không có cả mô tả và ảnh thì báo lỗi
      if (!this.textDescription && !this.file) {
        this.fillError = true;
      } else {
        this.isLoading = true;
        this.postingSuccess = "Đăng bài viết thành công!";

        let formData = null;
        let fileName = null;

        // Chỉ tạo FormData nếu có file
        if (this.file) {
          formData = new FormData();
          formData.append("file", this.file);
          fileName = this.file.name;
        }

        const post = {
          description: this.textDescription || "", // Để trống nếu không có mô tả
          isImagePost: !!this.file, // true nếu có file, false nếu không
          userId: (this.currentUser && this.currentUser._id) || this.id,
          file: fileName, // null nếu không có file
        };

        try {
          // Gọi addPost duy nhất với post và formData (có thể null)
          await this.$store.dispatch("addPost", { post, formData });
          
          this.isLoading = false;
          this.closeModal();
          createToast(
            {
              title: this.postingSuccess,
            },
            {
              type: "success",
              showIcon: true,
            }
          );
        } catch (error) {
          this.isLoading = false;
          createToast(
            {
              title: "Đăng bài viết thất bại!",
            },
            {
              type: "error",
              showIcon: true,
            }
          );
        }
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.fb-create-post {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

.fb-card {
  --composer-height: 500px; /* Có thể chỉnh nếu muốn */
  width: 100%;
  max-width: 620px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 12px 28px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  height: var(--composer-height);
  max-height: 90vh; /* Thu nhỏ nếu màn hình thấp */
}

.fb-card__header {
  position: relative;
  padding: 14px 56px 14px 16px;
  border-bottom: 1px solid #eee;
}
.fb-card__title {
  text-align: center;
  font-size: 20px;
  font-weight: 600;
  color: #1c1e21;
}
.fb-card__close {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e4e6eb;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: #050505;
}
.fb-card__close:hover { background: #d8dadf; }

.fb-card__body {
  padding: 0 0 8px 0;
  overflow-y: auto;
  scrollbar-width: thin;
  flex: 1; /* Lấp đầy chiều cao trống còn lại của card */
  min-height: 0; /* Đảm bảo flex container cho phép scroll */
}
.fb-card__body::-webkit-scrollbar { width: 8px; }
.fb-card__body::-webkit-scrollbar-track { background: transparent; }
.fb-card__body::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
.fb-card__body::-webkit-scrollbar-thumb:hover { background: #b5b5b5; }

.fb-user-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px 0 16px;
}
.fb-user-row__avatar { width: 40px; height: 40px; border-radius: 50%; }
.fb-user-row__meta { display: flex; flex-direction: column; }
.fb-user-row__name { font-weight: 600; color: #050505; }
.fb-user-row__audience {
  font-size: 12px;
  color: #65676b;
  background: #e4e6eb;
  border-radius: 6px;
  padding: 2px 6px;
  width: fit-content;
  margin-top: 2px;
}

.fb-input { padding: 8px 16px 0 16px; }
.fb-input__textarea {
  width: 100%;
  min-height: 60px;
  border: none;
  outline: none;
  font-size: 18px;
  color: #050505;
  resize: none;
  line-height: 1.4;
  overflow: hidden;
  transition: height .15s ease;
  padding: 4px 0 6px 0;
  background: transparent;
}
.fb-input__textarea::placeholder { color: #65676b; }

.fb-media { padding: 8px 16px 16px 16px; }
.fb-media__file-input { display: none; }
.fb-media__dropzone {
  width: 100%;
  min-height: 160px;
  border: 1px dashed #ced0d4;
  border-radius: 8px;
  background: #f0f2f5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: #65676b;
  cursor: pointer;
}
.fb-media__dz-icon { font-size: 28px; }
.fb-media__dz-text { font-weight: 600; }
.fb-media__dz-text span { display: block; font-weight: 400; font-size: 12px; }

.fb-media__preview { position: relative; width: 100%; }
.fb-media__preview-inner {
  position: relative;
  width: 100%;
  background: #000;
  border-radius: 8px;
  display: block;
  /* Không giới hạn chiều cao cố định; để nội dung cuộn cùng body */
}
.fb-media__preview-inner img {
  display: block;
  max-width: 100%;
  height: auto;
  max-height: 1000px; /* an upper safety bound to avoid runaway */
  object-fit: contain;
  margin: 0 auto;
  background: #000;
}
.fb-media__remove {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(0,0,0,0.6);
  color: #fff;
  font-size: 18px;
}
.fb-media__remove:hover { background: rgba(0,0,0,0.7); }

.fb-error {
  color: #e41e3f;
  font-size: 14px;
  padding: 0 16px 8px 16px;
}

.fb-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px 16px 16px;
  border-top: 1px solid #eee;
}
.fb-btn {
  flex: 1;
  height: 36px;
  border-radius: 8px;
  border: none;
  font-weight: 600;
}
.fb-btn--primary {
  background: #1877f2;
  color: #fff;
}
.fb-btn--primary:disabled { background: #e4e6eb; color: #bcc0c4; cursor: not-allowed; }
.fb-btn--ghost { background: #e4e6eb; color: #050505; }
.fb-btn--ghost:hover { background: #d8dadf; }
</style>
