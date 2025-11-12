<template>
  <div class="message-input-container">
    <input 
      type="file" 
      ref="fileInput" 
      @change="onFileSelect"
      accept="image/*,.pdf,.doc,.docx,.txt"
      style="display: none"
    />
    <button class="message-action-btn" @click="$refs.fileInput.click()">
      <i class="material-icons">add_photo_alternate</i>
    </button>
    
    <!-- File preview -->
    <div v-if="selectedFile" class="file-preview">
      <!-- Image preview -->
      <div v-if="isImage(selectedFile)" class="image-preview">
        <img :src="getImagePreview()" alt="Preview" />
        <button @click="clearFile" class="clear-file-btn image-close">
          <i class="material-icons">close</i>
        </button>
      </div>
      <!-- File info for non-images -->
      <div v-else class="file-info">
        <i class="material-icons">{{ getFileIcon() }}</i>
        <span>{{ selectedFile.name }}</span>
        <button @click="clearFile" class="clear-file-btn">
          <i class="material-icons">close</i>
        </button>
      </div>
    </div>
    
    <div class="message-input-wrapper">
      <textarea 
        ref="messageInput"
        v-model="message"
        placeholder="Nhắn tin..."
        class="message-input"
        @keydown.enter.prevent="onEnterPress"
        @input="adjustHeight"
      ></textarea>
    </div>
    <button 
      class="message-send-btn" 
      @click="sendMessage" 
      :disabled="!canSend"
    >
      <i class="material-icons">send</i>
    </button>
  </div>
</template>

<script>
export default {
  name: 'MessageInput',
  data() {
    return {
      message: '',
      selectedFile: null,
      maxHeight: 120 // Max height in pixels
    };
  },
  computed: {
    canSend() {
      return this.message.trim() || this.selectedFile;
    }
  },
  methods: {
    sendMessage() {
      const trimmedMessage = this.message.trim();
      if (!trimmedMessage && !this.selectedFile) return;
      
      const messageData = {
        content: trimmedMessage,
        messageType: this.selectedFile ? (this.isImage(this.selectedFile) ? 'image' : 'file') : 'text',
        file: this.selectedFile
      };
      
      this.$emit('send-message', messageData);
      this.message = '';
      this.selectedFile = null;
      this.adjustHeight();
      this.$nextTick(() => {
        this.$refs.messageInput.focus();
      });
    },
    
    onFileSelect(event) {
      const file = event.target.files[0];
      if (file) {
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert('File quá lớn. Vui lòng chọn file nhỏ hơn 10MB.');
          return;
        }
        this.selectedFile = file;
      }
    },
    
    clearFile() {
      this.selectedFile = null;
      this.$refs.fileInput.value = '';
    },
    
    getFileIcon() {
      if (!this.selectedFile) return 'attach_file';
      
      if (this.isImage(this.selectedFile)) {
        return 'image';
      } else if (this.selectedFile.type.includes('pdf')) {
        return 'picture_as_pdf';
      } else if (this.selectedFile.type.includes('word')) {
        return 'description';
      } else {
        return 'attach_file';
      }
    },
    
    isImage(file) {
      return file && file.type.startsWith('image/');
    },
    
    getImagePreview() {
      if (this.selectedFile && this.isImage(this.selectedFile)) {
        return URL.createObjectURL(this.selectedFile);
      }
      return null;
    },
    onEnterPress(event) {
      // Send on Enter, but allow Shift+Enter for new line
      if (!event.shiftKey) {
        this.sendMessage();
      }
    },
    adjustHeight() {
      const textarea = this.$refs.messageInput;
      if (!textarea) return;
      
      // Reset height to get the correct scrollHeight
      textarea.style.height = 'auto';
      
      // Set new height but cap at maxHeight
      const newHeight = Math.min(textarea.scrollHeight, this.maxHeight);
      textarea.style.height = `${newHeight}px`;
      
      // Add scrollbar if content exceeds maxHeight
      textarea.style.overflowY = textarea.scrollHeight > this.maxHeight ? 'auto' : 'hidden';
    }
  },
  mounted() {
    this.$refs.messageInput.focus();
  },
  beforeUnmount() {
    // Cleanup object URLs to prevent memory leaks
    if (this.selectedFile && this.isImage(this.selectedFile)) {
      URL.revokeObjectURL(this.getImagePreview());
    }
  },
  watch: {
    selectedFile(newFile, oldFile) {
      // Cleanup old object URL when file changes
      if (oldFile && this.isImage(oldFile)) {
        URL.revokeObjectURL(URL.createObjectURL(oldFile));
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.message-input-container {
  display: flex;
  align-items: flex-end;
  border-top: 1px solid rgba(226, 232, 240, 0.6);
  padding: 1rem 1.25rem;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.02) 0%, rgba(118, 75, 162, 0.02) 100%);
  backdrop-filter: blur(10px);
  gap: 0.75rem;
}

.message-action-btn {
  background: #f1f5f9;
  border: none;
  color: #667eea;
  cursor: pointer;
  padding: 0.625rem;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
  
  &:hover {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
  }
  
  i {
    font-size: 22px;
  }
}

.message-input-wrapper {
  flex: 1;
  background: white;
  border-radius: 24px;
  padding: 0.625rem 1rem;
  border: 2px solid rgba(226, 232, 240, 0.6);
  transition: all 0.2s ease;
  
  &:focus-within {
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
}

.message-input {
  width: 100%;
  resize: none;
  border: none;
  background: transparent;
  font-size: 0.9375rem;
  max-height: 120px;
  outline: none;
  line-height: 1.5;
  overflow-y: hidden;
  color: #1e293b;
  font-family: inherit;
  
  &::placeholder {
    color: #94a3b8;
  }
}

.message-send-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  cursor: pointer;
  padding: 0.625rem;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);
  flex-shrink: 0;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 6px 15px rgba(102, 126, 234, 0.4);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0) scale(0.98);
  }
  
  &:disabled {
    background: #e2e8f0;
    color: #94a3b8;
    cursor: not-allowed;
    box-shadow: none;
  }
  
  i {
    font-size: 20px;
  }
}

.file-preview {
  margin: 0 0.5rem;
  animation: fadeInScale 0.2s ease;
  
  .image-preview {
    position: relative;
    margin-bottom: 0.5rem;
    
    img {
      max-width: 220px;
      max-height: 160px;
      border-radius: 14px;
      object-fit: cover;
      border: 2px solid rgba(102, 126, 234, 0.2);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    
    .image-close {
      position: absolute;
      top: -8px;
      right: -8px;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 6px rgba(102, 126, 234, 0.4);
      
      i {
        font-size: 16px;
        margin: 0;
      }
      
      &:hover {
        transform: rotate(90deg) scale(1.1);
        background: linear-gradient(135deg, #5568d3 0%, #63428b 100%);
      }
    }
  }
  
  .file-info {
    display: flex;
    align-items: center;
    background: white;
    padding: 0.625rem 1rem;
    border-radius: 14px;
    border: 2px solid rgba(102, 126, 234, 0.2);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
    
    i {
      margin-right: 10px;
      color: #667eea;
      font-size: 20px;
    }
    
    span {
      font-size: 0.8125rem;
      color: #475569;
      max-width: 160px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: 500;
    }
    
    .clear-file-btn {
      background: none;
      border: none;
      margin-left: 10px;
      cursor: pointer;
      color: #94a3b8;
      transition: all 0.2s ease;
      
      &:hover {
        color: #667eea;
        transform: scale(1.2);
      }
      
      i {
        font-size: 18px;
        margin: 0;
      }
    }
  }
}

@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .message-input-container {
    padding: 0.875rem 1rem;
    gap: 0.625rem;
  }
  
  .message-action-btn,
  .message-send-btn {
    width: 36px;
    height: 36px;
    
    i {
      font-size: 20px;
    }
  }
  
  .message-input {
    font-size: 0.875rem;
  }
}

@media (max-width: 480px) {
  .message-input-container {
    padding: 0.75rem;
    gap: 0.5rem;
  }
  
  .file-preview .image-preview img {
    max-width: 180px;
    max-height: 140px;
  }
  
  .file-info span {
    max-width: 120px;
  }
}
</style>