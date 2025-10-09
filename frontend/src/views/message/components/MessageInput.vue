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
  border-top: 1px solid #f8e0e6;
  padding: 12px 16px;
  background-color: #fef1f6;
}

.message-action-btn {
  background: none;
  border: none;
  color: #e91e63;
  cursor: pointer;
  padding: 8px;
  margin-right: 8px;
  
  &:hover {
    color: #f06292;
  }
  
  i {
    font-size: 24px;
  }
}

.message-input-wrapper {
  flex: 1;
  background-color: #fce4ec;
  border-radius: 24px;
  padding: 8px 12px;
  margin-right: 8px;
}

.message-input {
  width: 100%;
  resize: none;
  border: none;
  background: transparent;
  font-size: 14px;
  max-height: 120px;
  outline: none;
  line-height: 20px;
  overflow-y: hidden;
  
  &::placeholder {
    color: #ec407a;
  }
}

.message-send-btn {
  background: none;
  border: none;
  color: #e91e63;
  cursor: pointer;
  padding: 8px;
  
  &:disabled {
    color: #f8bbd0;
    cursor: not-allowed;
  }
  
  i {
    font-size: 24px;
  }
}

.file-preview {
  margin: 0 8px;
  
  .image-preview {
    position: relative;
    margin-bottom: 8px;
    
    img {
      max-width: 200px;
      max-height: 150px;
      border-radius: 12px;
      object-fit: cover;
      border: 2px solid #f8bbd0;
    }
    
    .image-close {
      position: absolute;
      top: -8px;
      right: -8px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background-color: #e91e63;
      color: white;
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      
      i {
        font-size: 14px;
        margin: 0;
      }
      
      &:hover {
        background-color: #f06292;
      }
    }
  }
  
  .file-info {
    display: flex;
    align-items: center;
    background-color: #fce4ec;
    padding: 8px 12px;
    border-radius: 16px;
    border: 1px solid #f8bbd0;
    
    i {
      margin-right: 8px;
      color: #e91e63;
    }
    
    span {
      font-size: 12px;
      color: #e91e63;
      max-width: 150px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .clear-file-btn {
      background: none;
      border: none;
      margin-left: 8px;
      cursor: pointer;
      color: #e91e63;
      
      i {
        font-size: 16px;
        margin: 0;
      }
    }
  }
}
</style>