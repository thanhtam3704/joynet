<template>
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
      placeholder: 'Bạn đang nghĩ gì?'
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
      return descriptionChanged || imageChanged;
    },
    currentImageUrl() {
      if (this.newImageFile) {
        return URL.createObjectURL(this.newImageFile);
      }
      if (this.editedImageUrl) {
        return `http://localhost:3000/uploads/${this.editedImageUrl}`;
      }
      return '';
    },
    imageAlt() {
      return 'Ảnh bài viết';
    }
  },
  watch: {
    show(newVal) {
      if (newVal) {
        this.resetForm();
        this.$nextTick(() => {
          this.autoResize();
          if (this.$refs.descriptionInput) {
            this.$refs.descriptionInput.focus();
          }
        });
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
      } else {
        this.editedDescription = '';
        this.editedImageUrl = '';
      }
      this.newImageFile = null;
      this.errorMessage = '';
      this.isSaving = false;
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
      if (this.hasChanges && !this.isSaving) {
        if (confirm('Bạn có thay đổi chưa được lưu. Bạn có chắc chắn muốn đóng không?')) {
          this.$emit('close');
        }
      } else {
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
          file: imageFileName
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
        const response = await fetch('http://localhost:3000/api/posts/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        return file.name; // Return the filename
      } catch (error) {
        console.error('Upload error:', error);
        throw new Error('Không thể tải lên ảnh. Vui lòng thử lại.');
      }
    }
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
}

.modal-container {
  background: white;
  border-radius: 12px;
  max-width: 550px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #dadde1;
}

.modal-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1c1e21;
}

.close-button {
  background: #f0f2f5;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.close-button:hover {
  background: #e4e6ea;
}

.close-button span {
  font-size: 24px;
  color: #65676b;
  line-height: 1;
}

.modal-body {
  padding: 24px;
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
}

.user-name {
  font-weight: 600;
  font-size: 15px;
  color: #1c1e21;
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
  display: inline-block;
  max-width: 100%;
}

.post-image {
  max-width: 100%;
  max-height: 300px;
  border-radius: 8px;
  object-fit: cover;
}

.remove-image-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  line-height: 1;
}

.remove-image-btn:hover {
  background: rgba(0, 0, 0, 0.8);
}

.upload-section {
  margin-bottom: 16px;
}

.upload-button {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f0f2f5;
  border: 1px solid #dadde1;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 15px;
  color: #65676b;
  transition: background-color 0.2s;
  width: 100%;
  justify-content: center;
}

.upload-button:hover:not(:disabled) {
  background: #e4e6ea;
}

.upload-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.upload-icon {
  font-size: 16px;
}

.error-message {
  color: #e41e3f;
  font-size: 14px;
  margin-top: 8px;
  padding: 8px 12px;
  background: #ffebee;
  border-radius: 6px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid #dadde1;
}

.cancel-button,
.save-button {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 80px;
}

.cancel-button {
  background: #e4e6ea;
  color: #1c1e21;
  border: none;
}

.cancel-button:hover:not(:disabled) {
  background: #d8dadf;
}

.save-button {
  background: #1877f2;
  color: white;
  border: none;
}

.save-button:hover:not(:disabled) {
  background: #166fe5;
}

.save-button:disabled {
  background: #e4e6ea;
  color: #bcc0c4;
  cursor: not-allowed;
}

.save-button.loading {
  background: #bcc0c4;
}

/* Responsive */
@media (max-width: 600px) {
  .modal-overlay {
    padding: 10px;
  }
  
  .modal-container {
    max-width: 100%;
    max-height: 95vh;
  }
  
  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 16px;
  }
  
  .modal-title {
    font-size: 18px;
  }
}
</style>