<template>
  <div class="avatar-upload-section">
    <div class="avatar-preview">
      <img 
        :src="currentAvatarUrl" 
        :alt="currentUser.displayName"
        class="avatar-image"
      />
      <div class="avatar-overlay">
        <label for="avatar-input" class="upload-button">
          <span class="upload-icon">📷</span>
          <span class="upload-text">Thay đổi</span>
        </label>
        <input 
          id="avatar-input"
          type="file" 
          accept="image/*"
          @change="handleFileSelect"
          hidden
        />
      </div>
    </div>
    
    <div class="upload-info">
      <h3 class="info-title">Ảnh đại diện</h3>
      <p class="info-text">JPG, PNG hoặc GIF. Tối đa 5MB</p>
      
      <div v-if="selectedFile" class="file-actions">
        <button @click="uploadAvatar" :disabled="uploading" class="btn-upload">
          <span v-if="!uploading">✓ Lưu ảnh</span>
          <span v-else>
            <span class="spinner"></span> Đang tải lên...
          </span>
        </button>
        <button @click="cancelUpload" :disabled="uploading" class="btn-cancel">
          ✕ Hủy
        </button>
      </div>
      
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
      
      <div v-if="successMessage" class="success-message">
        {{ successMessage }}
      </div>
    </div>
  </div>
</template>

<script>
import axiosInstance from '@/utils/axios';

export default {
  name: 'AvatarUpload',
  data() {
    return {
      selectedFile: null,
      previewUrl: null,
      uploading: false,
      errorMessage: '',
      successMessage: '',
      defaultAvatar: 'https://via.placeholder.com/150/667eea/ffffff?text=Avatar'
    };
  },
  computed: {
    currentUser() {
      return this.$store.state.user || {};
    },
    currentAvatarUrl() {
      if (this.previewUrl) return this.previewUrl;
      const avatar = this.currentUser.profilePicture;
      return avatar || this.defaultAvatar;
    }
  },
  methods: {
    handleFileSelect(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      // Kiểm tra loại file
      if (!file.type.startsWith('image/')) {
        this.errorMessage = 'Vui lòng chọn file ảnh';
        return;
      }
      
      // Kiểm tra kích thước (5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'Kích thước file không được vượt quá 5MB';
        return;
      }
      
      this.selectedFile = file;
      this.errorMessage = '';
      this.successMessage = '';
      
      // Tạo preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    },
    
    async uploadAvatar() {
      if (!this.selectedFile) return;
      
      this.uploading = true;
      this.errorMessage = '';
      this.successMessage = '';
      
      try {
        const formData = new FormData();
        formData.append('avatar', this.selectedFile);
        
        const response = await axiosInstance.post(
          `/users/${this.currentUser._id}/upload-avatar`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        );
        
        // Cập nhật store với URL mới
        this.$store.commit('updateUser', {
          ...this.currentUser,
          profilePicture: response.data.profilePicture
        });
        
        this.successMessage = 'Cập nhật ảnh đại diện thành công!';
        this.selectedFile = null;
        this.previewUrl = null;
        
        // Reset input
        document.getElementById('avatar-input').value = '';
        
        // Clear success message sau 3 giây
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
        
      } catch (error) {
        console.error('Upload avatar error:', error);
        this.errorMessage = error.response?.data?.error || 'Lỗi upload ảnh';
      } finally {
        this.uploading = false;
      }
    },
    
    cancelUpload() {
      this.selectedFile = null;
      this.previewUrl = null;
      this.errorMessage = '';
      this.successMessage = '';
      document.getElementById('avatar-input').value = '';
    }
  }
};
</script>

<style lang="scss" scoped>
.avatar-upload-section {
  display: flex;
  gap: 32px;
  align-items: flex-start;
  padding: 8px 0;
}

.avatar-preview {
  position: relative;
  width: 150px;
  height: 150px;
  border-radius: var(--radius-2xl);
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
  
  .avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .avatar-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover .avatar-overlay {
    opacity: 1;
  }
  
  .upload-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    color: white;
    
    .upload-icon {
      font-size: 32px;
    }
    
    .upload-text {
      font-size: 14px;
      font-weight: 600;
    }
  }
}

.upload-info {
  flex: 1;
  
  .info-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--gray-900);
    margin: 0 0 8px 0;
  }
  
  .info-text {
    font-size: 14px;
    color: var(--gray-600);
    margin: 0 0 20px 0;
  }
}

.file-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  
  button {
    padding: 10px 20px;
    border-radius: var(--radius-lg);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 2px solid transparent;
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
  
  .btn-upload {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    
    &:hover:not(:disabled) {
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      transform: translateY(-2px);
    }
  }
  
  .btn-cancel {
    background: white;
    color: var(--gray-700);
    border-color: var(--gray-300);
    
    &:hover:not(:disabled) {
      background: var(--gray-50);
      border-color: var(--gray-400);
    }
  }
}

.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-right: 6px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-lg);
  color: #dc2626;
  font-size: 14px;
  margin-top: 12px;
}

.success-message {
  padding: 12px 16px;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: var(--radius-lg);
  color: #16a34a;
  font-size: 14px;
  margin-top: 12px;
  animation: slideDown 0.3s ease;
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

@media (max-width: 640px) {
  .avatar-upload-section {
    flex-direction: column;
    align-items: center;
    gap: 24px;
  }
  
  .upload-info {
    text-align: center;
    
    .file-actions {
      flex-direction: column;
      
      button {
        width: 100%;
      }
    }
  }
}
</style>
