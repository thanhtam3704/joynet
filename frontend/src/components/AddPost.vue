<template>
  <Teleport to="body">
  <form
    class="fb-create-post"
    @submit.prevent="addImagePost"
    enctype="multipart/form-data"
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
          @click.stop="closeModal"
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
            <div class="privacy-selector" @click="togglePrivacy">
              <i class="material-icons">{{ privacy === 'public' ? 'public' : 'lock' }}</i>
              <span>{{ privacy === 'public' ? 'Công khai' : 'Chỉ mình tôi' }}</span>
              <i class="material-icons arrow">arrow_drop_down</i>
            </div>
          </div>
        </div>
        
        <!-- Privacy Dropdown -->
        <div class="privacy-dropdown" v-if="showPrivacyMenu" @click.stop>
          <div class="privacy-option" :class="{ active: privacy === 'public' }" @click="selectPrivacy('public')">
            <i class="material-icons">public</i>
            <div class="privacy-option-text">
              <span class="privacy-title">Công khai</span>
              <span class="privacy-desc">Mọi người đều có thể xem</span>
            </div>
            <i class="material-icons check" v-if="privacy === 'public'">check_circle</i>
          </div>
          <div class="privacy-option" :class="{ active: privacy === 'private' }" @click="selectPrivacy('private')">
            <i class="material-icons">lock</i>
            <div class="privacy-option-text">
              <span class="privacy-title">Chỉ mình tôi</span>
              <span class="privacy-desc">Chỉ bạn có thể xem</span>
            </div>
            <i class="material-icons check" v-if="privacy === 'private'">check_circle</i>
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
            <div class="fb-media__dz-text">Thêm ảnh/video</div>
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
        <button type="button" class="fb-btn fb-btn--ghost" @click.stop="closeModal" v-if="!isLoading">Đóng</button>
      </div>
    </div>
  </form>
</Teleport>
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
      textDescription: "",
      fillError: false,
      postingSuccess: "",
      privacy: 'public',
      showPrivacyMenu: false,
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
          privacy: this.privacy, // Thêm privacy
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
    togglePrivacy() {
      this.showPrivacyMenu = !this.showPrivacyMenu;
    },
    selectPrivacy(privacy) {
      this.privacy = privacy;
      this.showPrivacyMenu = false;
    },
  },
  mounted() {
    // Lock body scroll when modal opens
    document.body.style.overflow = 'hidden';
  },
  beforeUnmount() {
    // Restore body scroll when modal closes
    document.body.style.overflow = '';
  },
};
</script>

<style lang="scss" scoped>
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to { 
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.fb-create-post {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(17, 24, 39, 0.8);
  backdrop-filter: blur(8px);
  z-index: 999999;
  animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 1rem;
}

.fb-card {
  --composer-height: 550px;
  width: 100%;
  max-width: 640px;
  background: #ffffff;
  border-radius: 18px;
  box-shadow: 
    0 25px 50px -12px rgba(102, 126, 234, 0.25),
    0 0 0 1px rgba(102, 126, 234, 0.1);
  display: flex;
  flex-direction: column;
  height: var(--composer-height);
  max-height: 90vh;
  animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  overflow: hidden;
}

.fb-card__header {
  position: relative;
  padding: 1.5rem 3.5rem 1.5rem 1.5rem;
  border-bottom: 1px solid rgba(102, 126, 234, 0.1);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
}

.fb-card__title {
  text-align: center;
  font-size: 1.375rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
}

.fb-card__close {
  position: absolute;
  top: 50%;
  right: 1.25rem;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(102, 126, 234, 0.08);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: #667eea;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 300;
  line-height: 1;
  z-index: 10;
}

.fb-card__close:hover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  transform: translateY(-50%) rotate(90deg) scale(1.05);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.fb-card__body {
  padding: 0 0 1rem 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(102, 126, 234, 0.3) transparent;
  flex: 1;
  min-height: 0;
}

.fb-card__body::-webkit-scrollbar {
  width: 6px;
}

.fb-card__body::-webkit-scrollbar-track {
  background: transparent;
}

.fb-card__body::-webkit-scrollbar-thumb {
  background: rgba(102, 126, 234, 0.3);
  border-radius: 10px;
  transition: background 0.2s ease;
}

.fb-card__body::-webkit-scrollbar-thumb:hover {
  background: rgba(102, 126, 234, 0.5);
}

.fb-user-row {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 1.5rem 1.5rem 0 1.5rem;
}

.fb-user-row__avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 3px solid transparent;
  background: linear-gradient(white, white) padding-box,
              linear-gradient(135deg, #667eea, #764ba2) border-box;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
  transition: all 0.3s ease;
}

.fb-user-row__avatar:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.25);
}

.fb-user-row__meta {
  display: flex;
  flex-direction: column;
}

.fb-user-row__name {
  font-weight: 600;
  color: #1f2937;
  font-size: 1rem;
  letter-spacing: -0.01em;
}

.privacy-selector {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding: 6px 12px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  color: #667eea;
  font-weight: 500;
  width: fit-content;

  &:hover {
    background: rgba(102, 126, 234, 0.15);
  }

  i {
    font-size: 16px;
  }

  .arrow {
    font-size: 18px;
    margin-left: -2px;
  }
}

.privacy-dropdown {
  position: absolute;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 8px;
  margin-top: 8px;
  z-index: 1000;
  min-width: 280px;
  animation: slideDown 0.2s ease;
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

.privacy-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(102, 126, 234, 0.08);
  }

  &.active {
    background: rgba(102, 126, 234, 0.1);
  }

  i {
    color: #667eea;
    font-size: 22px;
  }

  .check {
    margin-left: auto;
    color: #667eea;
  }
}

.privacy-option-text {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.privacy-title {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.9375rem;
}

.privacy-desc {
  color: #6b7280;
  font-size: 0.8125rem;
  margin-top: 2px;
}

.fb-input {
  padding: 1.25rem 1.5rem 0 1.5rem;
}

.fb-input__textarea {
  width: 100%;
  min-height: 80px;
  border: none;
  outline: none;
  font-size: 1.0625rem;
  color: #1f2937;
  resize: none;
  line-height: 1.5;
  overflow: hidden;
  transition: height 0.15s ease;
  padding: 0.5rem 0;
  background: transparent;
  font-family: inherit;
}

.fb-input__textarea::placeholder {
  color: #9ca3af;
  font-weight: 400;
}

.fb-media {
  padding: 1.25rem 1.5rem;
}

.fb-media__file-input {
  display: none;
}

.fb-media__dropzone {
  width: 100%;
  min-height: 180px;
  border: 2px dashed rgba(102, 126, 234, 0.3);
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 0.75rem;
  color: #667eea;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.fb-media__dropzone::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.fb-media__dropzone:hover::before {
  opacity: 0.05;
}

.fb-media__dropzone:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15);
}

.fb-media__dz-icon {
  font-size: 2.5rem;
  filter: grayscale(0%);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  z-index: 1;
}

.fb-media__dropzone:hover .fb-media__dz-icon {
  transform: scale(1.15) rotate(-5deg);
}

.fb-media__dz-text {
  font-weight: 600;
  font-size: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  position: relative;
  z-index: 1;
}

.fb-media__preview {
  position: relative;
  width: 100%;
}

.fb-media__preview-inner {
  position: relative;
  width: 100%;
  background: #1f2937;
  border-radius: 16px;
  display: block;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border: 3px solid transparent;
  background-clip: padding-box;
}

.fb-media__preview-inner::before {
  content: '';
  position: absolute;
  inset: -3px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  z-index: -1;
  opacity: 0.3;
}

.fb-media__preview-inner img {
  display: block;
  max-width: 100%;
  height: auto;
  max-height: 1000px;
  object-fit: contain;
  margin: 0 auto;
  background: #1f2937;
}

.fb-media__remove {
  position: absolute;
  top: 0.875rem;
  right: 0.875rem;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(12px);
  color: white;
  font-size: 1.5rem;
  font-weight: 300;
  line-height: 1;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.fb-media__remove:hover {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  transform: rotate(90deg) scale(1.1);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.fb-error {
  color: #ef4444;
  font-size: 0.875rem;
  padding: 0 1.5rem 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(220, 38, 38, 0.05) 100%);
  margin: 0 1.5rem;
  border-radius: 12px;
  padding: 0.875rem 1rem;
}

.fb-error::before {
  content: '⚠️';
  font-size: 1.125rem;
}

.fb-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  border-top: 1px solid rgba(102, 126, 234, 0.1);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%);
}

.fb-btn {
  flex: 1;
  height: 48px;
  border-radius: 12px;
  border: none;
  font-weight: 600;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: inherit;
  letter-spacing: -0.01em;
}

.fb-btn--primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  position: relative;
  overflow: hidden;
}

.fb-btn--primary::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.fb-btn--primary:hover:not(:disabled)::before {
  opacity: 1;
}

.fb-btn--primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(102, 126, 234, 0.4);
}

.fb-btn--primary:active:not(:disabled) {
  transform: translateY(0);
}

.fb-btn--primary:disabled {
  background: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
  box-shadow: none;
}

.fb-btn--ghost {
  background: white;
  color: #667eea;
  border: 2px solid rgba(102, 126, 234, 0.2);
  box-shadow: none;
  transition: all 0.3s ease;
}

.fb-btn--ghost:hover {
  background: rgba(102, 126, 234, 0.05);
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

/* Responsive */
@media (max-width: 768px) {
  .fb-card {
    --composer-height: 500px;
    max-width: 95%;
  }

  .fb-card__header {
    padding: 1rem 3rem 1rem 1rem;
  }

  .fb-card__title {
    font-size: 1.125rem;
  }

  .fb-user-row {
    padding: 1rem 1rem 0 1rem;
  }

  .fb-input {
    padding: 0.875rem 1rem 0 1rem;
  }

  .fb-media {
    padding: 0.875rem 1rem;
  }

  .fb-actions {
    padding: 0.875rem 1rem;
  }
}

@media (max-width: 480px) {
  .fb-create-post {
    padding: 0.5rem;
  }

  .fb-card {
    border-radius: var(--radius-xl);
    max-width: 100%;
  }

  .fb-card__close {
    width: 34px;
    height: 34px;
  }

  .fb-media__dropzone {
    min-height: 150px;
  }

  .fb-btn {
    height: 40px;
    font-size: 0.875rem;
  }
}
</style>
