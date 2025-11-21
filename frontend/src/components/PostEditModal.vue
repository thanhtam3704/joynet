<template>
  <Teleport to="body">
    <div class="modal-overlay" v-show="show" @click="handleOverlayClick">
      <div class="modal-container" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">Chỉnh sửa bài viết</h3>
          <button class="close-button" @click="close">
            <span>&times;</span>
          </button>
        </div>

        <div class="modal-body">
        <!-- User info section -->
        <div class="user-info">
          <ProfileImage :id="currentUser._id" class="user-avatar" />
          <div class="user-details">
            <span class="user-name">{{ currentUser.displayName || currentUser.email }}</span>
            <div class="privacy-selector" @click="togglePrivacy">
              <i class="material-icons">{{ editedPrivacy === 'public' ? 'public' : 'lock' }}</i>
              <span>{{ editedPrivacy === 'public' ? 'Công khai' : 'Chỉ mình tôi' }}</span>
              <i class="material-icons arrow">arrow_drop_down</i>
            </div>
          </div>
        </div>

        <!-- Privacy Dropdown -->
        <div class="privacy-dropdown" v-if="showPrivacyMenu" @click.stop>
          <div class="privacy-option" :class="{ active: editedPrivacy === 'public' }" @click="selectPrivacy('public')">
            <i class="material-icons">public</i>
            <div class="privacy-option-text">
              <span class="privacy-title">Công khai</span>
              <span class="privacy-desc">Mọi người đều có thể xem</span>
            </div>
            <i class="material-icons check" v-if="editedPrivacy === 'public'">check_circle</i>
          </div>
          <div class="privacy-option" :class="{ active: editedPrivacy === 'private' }" @click="selectPrivacy('private')">
            <i class="material-icons">lock</i>
            <div class="privacy-option-text">
              <span class="privacy-title">Chỉ mình tôi</span>
              <span class="privacy-desc">Chỉ bạn có thể xem</span>
            </div>
            <i class="material-icons check" v-if="editedPrivacy === 'private'">check_circle</i>
          </div>
        </div>

        <!-- Post content editor -->
        <div class="content-editor">
          <textarea
            ref="descriptionInput"
            v-model="editedDescription"
            class="description-input"
            :placeholder="placeholder"
            rows="4"
            @input="autoResize"
          ></textarea>
        </div>

        <!-- Current image display and replacement -->
        <div class="image-section" v-if="editedImageUrl || newImageFile">
          <div class="image-container">
            <img 
              :src="currentImageUrl" 
              :alt="imageAlt"
              class="post-image"
            />
            <button 
              class="remove-image-btn"
              @click="removeImage"
              title="Xóa ảnh"
            >
              &times;
            </button>
          </div>
        </div>

        <!-- Image upload section -->
        <div class="upload-section">
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            @change="handleFileChange"
            style="display: none;"
          />
          <button 
            class="upload-button"
            @click="triggerFileInput"
            :disabled="isUploading"
          >
            <span class="upload-icon">📷</span>
            <span>{{ editedImageUrl || newImageFile ? 'Thay đổi ảnh' : 'Thêm ảnh' }}</span>
          </button>
        </div>

        <!-- Error message -->
        <div class="error-message" v-if="errorMessage">
          {{ errorMessage }}
        </div>
      </div>

      <div class="modal-footer">
        <button 
          class="cancel-button" 
          @click="close"
          :disabled="isSaving"
        >
          Hủy
        </button>
        <button 
          class="save-button" 
          @click="saveChanges"
          :disabled="!hasChanges || isSaving"
          :class="{ 'loading': isSaving }"
        >
          <span v-if="isSaving">Đang lưu...</span>
          <span v-else>Lưu thay đổi</span>
        </button>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<script>
import ProfileImage from '@/components/ProfileImage.vue';

export default {
  name: 'PostEditModal',
  components: {
    ProfileImage
  },
  props: {
    show: {
      type: Boolean,
      default: false
    },
    post: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      editedDescription: '',
      editedImageUrl: '',
      newImageFile: null,
      isSaving: false,
      isUploading: false,
      errorMessage: '',
      placeholder: 'Bạn đang nghĩ gì?',
      editedPrivacy: 'public',
      showPrivacyMenu: false,
    };
  },
  computed: {
    currentUser() {
      return this.$store.state.user;
    },
    hasChanges() {
      if (!this.post) return false;
      const descriptionChanged = this.editedDescription !== (this.post.description || '');
      const imageChanged = this.newImageFile !== null || this.editedImageUrl !== (this.post.file || '');
      const privacyChanged = this.editedPrivacy !== (this.post.privacy || 'public');
      return descriptionChanged || imageChanged || privacyChanged;
    },
    currentImageUrl() {
      if (this.newImageFile) {
        return URL.createObjectURL(this.newImageFile);
      }
      return this.editedImageUrl || '';
    },
    imageAlt() {
      return 'Ảnh bài viết';
    }
  },
  watch: {
    show(newVal) {
      if (newVal) {
        this.resetForm();
        // Lock body scroll when modal opens
        document.body.style.overflow = 'hidden';
        this.$nextTick(() => {
          this.autoResize();
          if (this.$refs.descriptionInput) {
            this.$refs.descriptionInput.focus();
          }
        });
      } else {
        // Unlock body scroll when modal closes
        document.body.style.overflow = '';
      }
    },
    post: {
      handler(newPost) {
        if (newPost) {
          this.resetForm();
        }
      },
      immediate: false
    }
  },
  methods: {
    resetForm() {
      if (this.post) {
        this.editedDescription = this.post.description || '';
        this.editedImageUrl = this.post.file || '';
        this.editedPrivacy = this.post.privacy || 'public';
      } else {
        this.editedDescription = '';
        this.editedImageUrl = '';
        this.editedPrivacy = 'public';
      }
      this.newImageFile = null;
      this.errorMessage = '';
      this.isSaving = false;
      this.showPrivacyMenu = false;
    },
    autoResize() {
      this.$nextTick(() => {
        const textarea = this.$refs.descriptionInput;
        if (textarea) {
          textarea.style.height = 'auto';
          textarea.style.height = Math.min(textarea.scrollHeight, 300) + 'px';
        }
      });
    },
    handleOverlayClick() {
      if (!this.isSaving) {
        this.close();
      }
    },
    close() {
      if (!this.isSaving) {
        this.$emit('close');
      }
    },
    triggerFileInput() {
      this.$refs.fileInput.click();
    },
    handleFileChange(event) {
      const file = event.target.files[0];
      if (file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          this.errorMessage = 'Vui lòng chọn file ảnh hợp lệ.';
          return;
        }

        // Validate file size (e.g., max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          this.errorMessage = 'Kích thước file không được vượt quá 10MB.';
          return;
        }

        this.newImageFile = file;
        this.errorMessage = '';
      }
    },
    removeImage() {
      this.newImageFile = null;
      this.editedImageUrl = '';
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = '';
      }
    },
    async saveChanges() {
      if (!this.post || !this.hasChanges || this.isSaving) return;

      this.isSaving = true;
      this.errorMessage = '';

      try {
        let imageFileName = this.editedImageUrl;

        // Upload new image if there's one
        if (this.newImageFile) {
          imageFileName = await this.uploadImage(this.newImageFile);
        }

        const updatedPost = {
          ...this.post,
          description: this.editedDescription,
          file: imageFileName,
          privacy: this.editedPrivacy
        };

        this.$emit('save', updatedPost);
      } catch (error) {
        console.error('Error saving post:', error);
        this.errorMessage = 'Có lỗi xảy ra khi lưu bài viết. Vui lòng thử lại.';
      } finally {
        this.isSaving = false;
      }
    },
    async uploadImage(file) {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);

      try {
        // You'll need to implement this API call
        const apiUrl = process.env.VUE_APP_API_URL || 'https://social-backend-tfha.onrender.com/api';
        const response = await fetch(`${apiUrl}/posts/upload`, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        return data.url; // Return Cloudinary URL từ response
      } catch (error) {
        console.error('Upload error:', error);
        throw new Error('Không thể tải lên ảnh. Vui lòng thử lại.');
      }
    },
    togglePrivacy() {
      this.showPrivacyMenu = !this.showPrivacyMenu;
    },
    selectPrivacy(privacy) {
      this.editedPrivacy = privacy;
      this.showPrivacyMenu = false;
    }
  },
  beforeUnmount() {
    // Ensure body scroll is restored when component is destroyed
    document.body.style.overflow = '';
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.75);
  z-index: 999999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 20px 20px 20px;
  box-sizing: border-box;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  animation: fadeIn 0.25s ease;
  isolation: isolate;
  will-change: opacity;
  contain: layout style paint;
  pointer-events: auto;
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  overflow: hidden;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(40px) scale(0.92);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-container {
  background: white;
  border-radius: 20px;
  max-width: 600px;
  width: 100%;
  max-height: calc(100vh - 100px);
  height: auto;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 70px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.08);
  animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
  position: relative;
  z-index: 1000000;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e8eaed;
  flex-shrink: 0;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%);
}

.modal-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1c1e21;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.close-button {
  background: #f0f2f5;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.close-button:hover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transform: rotate(90deg) scale(1.1);
}

.close-button:hover span {
  color: white;
}

.close-button span {
  font-size: 28px;
  color: #65676b;
  line-height: 1;
  transition: color 0.2s;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(102, 126, 234, 0.3) transparent;
}

.modal-body::-webkit-scrollbar {
  width: 8px;
}

.modal-body::-webkit-scrollbar-track {
  background: transparent;
}

.modal-body::-webkit-scrollbar-thumb {
  background: rgba(102, 126, 234, 0.3);
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: rgba(102, 126, 234, 0.5);
}

.user-info {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  margin-right: 12px;
}

.user-details {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 600;
  font-size: 15px;
  color: #1c1e21;
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
}

.privacy-selector:hover {
  background: rgba(102, 126, 234, 0.15);
}

.privacy-selector i {
  font-size: 16px;
}

.privacy-selector .arrow {
  font-size: 18px;
  margin-left: -2px;
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
}

.privacy-option:hover {
  background: rgba(102, 126, 234, 0.08);
}

.privacy-option.active {
  background: rgba(102, 126, 234, 0.1);
}

.privacy-option i {
  color: #667eea;
  font-size: 22px;
}

.privacy-option .check {
  margin-left: auto;
  color: #667eea;
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

.content-editor {
  margin-bottom: 16px;
}

.description-input {
  width: 100%;
  border: none;
  resize: none;
  font-size: 16px;
  font-family: inherit;
  color: #1c1e21;
  line-height: 1.4;
  padding: 0;
  background: transparent;
  min-height: 60px;
  max-height: 300px;
  overflow-y: auto;
  box-sizing: border-box;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.description-input::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.description-input:focus {
  outline: none;
}

.description-input::placeholder {
  color: #65676b;
}

.image-section {
  margin-bottom: 16px;
}

.image-container {
  position: relative;
  display: flex;
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  background: #f8f9fa;
  border: 2px solid rgba(102, 126, 234, 0.15);
}

.post-image {
  width: 100%;
  height: auto;
  max-height: 400px;
  object-fit: contain;
  display: block;
}

.remove-image-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border: none;
  border-radius: 50%;
  width: 38px;
  height: 38px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  line-height: 1;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.remove-image-btn:hover {
  background: linear-gradient(135deg, #e41e3f 0%, #c71e37 100%);
  transform: rotate(90deg) scale(1.15);
  box-shadow: 0 6px 16px rgba(228, 30, 63, 0.5);
}

.upload-section {
  margin-bottom: 16px;
}

.upload-button {
  display: flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
  border: 2px solid rgba(102, 126, 234, 0.2);
  border-radius: 12px;
  padding: 12px 16px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  color: #667eea;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  width: 100%;
  justify-content: center;
}

.upload-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.upload-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.upload-icon {
  font-size: 20px;
}

.error-message {
  color: #e41e3f;
  font-size: 14px;
  margin-top: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(228, 30, 63, 0.08) 0%, rgba(220, 30, 63, 0.08) 100%);
  border-radius: 10px;
  border-left: 4px solid #e41e3f;
  display: flex;
  align-items: center;
  gap: 10px;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.error-message::before {
  content: '⚠️';
  font-size: 16px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid #e8eaed;
  background: #f8f9fa;
  flex-shrink: 0;
}

.cancel-button,
.save-button {
  padding: 10px 24px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 90px;
  border: 2px solid transparent;
}

.cancel-button {
  background: white;
  color: #65676b;
  border-color: #dadde1;
}

.cancel-button:hover:not(:disabled) {
  background: #f0f2f5;
  border-color: #bcc0c4;
  transform: translateY(-1px);
}

.save-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.save-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.save-button:disabled {
  background: #e4e6ea;
  color: #bcc0c4;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.save-button.loading {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.7) 0%, rgba(118, 75, 162, 0.7) 100%);
  cursor: wait;
}

/* Responsive */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 70px 15px 15px 15px;
  }
  
  .modal-container {
    max-width: 100%;
    max-height: calc(100vh - 85px);
    border-radius: 16px;
  }
  
  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 20px;
  }
  
  .modal-title {
    font-size: 18px;
  }
  
  .post-image {
    max-height: 350px;
  }
}

@media (max-width: 480px) {
  .modal-overlay {
    padding: 65px 12px 12px 12px;
  }
  
  .modal-container {
    max-height: calc(100vh - 77px);
    border-radius: 14px;
  }
  
  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 16px;
  }
  
  .modal-title {
    font-size: 17px;
  }
  
  .post-image {
    max-height: 300px;
  }
  
  .close-button {
    width: 36px;
    height: 36px;
  }
  
  .close-button span {
    font-size: 24px;
  }
}
</style>