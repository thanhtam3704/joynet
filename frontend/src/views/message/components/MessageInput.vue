<template>
  <div class="message-input-container">
    <button class="message-action-btn">
      <i class="material-icons">add_photo_alternate</i>
    </button>
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
      :disabled="!message.trim()"
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
      maxHeight: 120 // Max height in pixels
    };
  },
  methods: {
    sendMessage() {
      const trimmedMessage = this.message.trim();
      if (!trimmedMessage) return;
      
      this.$emit('send-message', trimmedMessage);
      this.message = '';
      this.adjustHeight();
      this.$nextTick(() => {
        this.$refs.messageInput.focus();
      });
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
</style>