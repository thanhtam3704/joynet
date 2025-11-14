<template>
  <div class="chat-messages" ref="messageContainer">
    <div class="messages-date-separator" v-if="messages.length > 0">
      {{ formatDate(messages[0].timestamp) }}
    </div>
    
    <div v-for="(message, index) in groupedMessages" :key="message && message._id ? message._id : index" class="message-group">
      <div class="message-timestamp" v-if="shouldShowTimestamp(index)">
        {{ message && message.timestamp ? formatTime(message.timestamp) : '' }}
      </div>
      
      <div 
        class="message-bubble-container"
        :class="{ 'outgoing': isMyMessage(message) }"
        v-if="shouldRenderMessage(message)"
      >
        <div class="message-avatar" v-if="message && !isMyMessage(message)">
          <img 
            v-if="message && message.senderAvatar"
            :src="getAvatarUrl(message.senderAvatar)" 
            alt="Avatar"
            referrerpolicy="no-referrer"
            crossorigin="anonymous"
            @error="handleAvatarError"
          />
          <img 
            v-else
            src="@/assets/defaultProfile.png" 
            alt="Default Avatar" 
          />
        </div>
        
        <div class="message-content-wrapper">
          <div 
            class="message-bubble"
            :class="{ 
              'outgoing': isMyMessage(message),
              'incoming': !isMyMessage(message)
            }"
            @mousedown="startLongPress($event, message)"
            @mouseup="cancelLongPress"
            @mouseleave="cancelLongPress"
            @touchstart.passive="startLongPress($event, message)"
            @touchend.passive="cancelLongPress"
          >
            <div v-if="message && message.messageType === 'image'" class="message-image">
              <img 
                :src="message && (message.fileUrl || (message.file ? `http://localhost:3000/uploads/${message.file}` : ''))" 
                alt="Image" 
                @load="handleImageLoad"
                @error="handleImageError"
              />
              <div v-if="!message.fileUrl && !message.file" class="debug-info" style="color: red; font-size: 10px;">
                No image URL found
              </div>
            </div>
            <div v-else-if="message && message.messageType === 'file'" class="message-file">
              <i class="material-icons">attach_file</i>
              <span>{{ message && (message.fileName || message.file) || '' }}</span>
            </div>
            <span v-if="message && message.content">{{ message.content }}</span>
            <div v-if="message && message.isSending" class="message-status">
              <i class="material-icons sending">schedule</i>
            </div>
          </div>
          
          <!-- Message Reactions Summary - Moved outside bubble -->
          <MessageReactionsSummary 
            v-if="message"
            :reactions="getMessageReactions(message)"
            @show-reactors="showMessageReactors(message)"
          />
        </div>
      </div>
    </div>
    
    <div class="messages-end" ref="messagesEnd"></div>
    
    <!-- Floating Emoji Animation -->
    <transition-group name="float" tag="div" class="floating-emojis">
      <div 
        v-for="emoji in floatingEmojis" 
        :key="emoji.id"
        class="floating-emoji"
        :style="{ left: emoji.x + 'px', top: emoji.y + 'px' }"
      >
        {{ emoji.emoji }}
      </div>
    </transition-group>
    
    <!-- Reaction Picker -->
    <MessageReactionPicker 
      :show="showReactionPicker"
      :position="reactionPickerPosition"
      :selected-message="selectedMessage"
      :current-user-id="currentUserId"
      @select="handleReactionSelect"
    />
    
    <!-- Message Reactors Modal -->
    <MessageReactorsModal 
      :show="showReactorsModal"
      :reactions="selectedMessageForReactors ? getMessageReactions(selectedMessageForReactors) : []"
      @close="showReactorsModal = false"
    />
  </div>
</template>

<script>
import MessageReactionPicker from '@/components/MessageReactionPicker.vue';
import MessageReactionsSummary from '@/components/MessageReactionsSummary.vue';
import MessageReactorsModal from '@/components/MessageReactorsModal.vue';

export default {
  name: 'ChatMessages',
  components: {
    MessageReactionPicker,
    MessageReactionsSummary,
    MessageReactorsModal
  },
  props: {
    messages: {
      type: Array,
      default: () => []
    },
    currentUserId: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      showReactionPicker: false,
      reactionPickerPosition: { top: 0, left: 0 },
      selectedMessage: null,
      longPressTimer: null,
      longPressDuration: 500, // milliseconds
      floatingEmojis: [], // For floating animation
      lastEvent: null,
      showReactorsModal: false,
      selectedMessageForReactors: null,
      shouldAutoScroll: true,
      previousMessagesLength: 0
    };
  },
  computed: {
    // Group messages by time (messages within 2 minutes of each other)
    groupedMessages() {
      return this.messages;
    }
  },
  methods: {
    isMyMessage(message) {
      if (!message) return false;
      if (!message.senderId || !this.currentUserId) return false;
      const senderId = String(message.senderId);
      const currentUserId = String(this.currentUserId);
      return senderId === currentUserId;
    },

    shouldRenderMessage(message) {
      if (!message) return false;
      // Show if has text content
      if (message.content && String(message.content).trim().length > 0) return true;
      // Show if has media/file
      if (message.messageType === 'image' && (message.fileUrl || message.file)) return true;
      if (message.messageType === 'file' && (message.fileName || message.file)) return true;
      return false;
    },
    formatDate(timestamp) {
      if (!timestamp) return '';
      
      const date = new Date(timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      ) {
        return 'Hôm nay';
      } else if (
        date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear()
      ) {
        return 'Hôm qua';
      } else {
        return date.toLocaleDateString('vi-VN', { 
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        });
      }
    },
    formatTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    },
    shouldShowTimestamp(index) {
      // Show timestamp for first message or if more than 15 minutes passed since previous message
      if (index === 0) return true;
      
      const currentMsg = this.messages[index];
      const prevMsg = this.messages[index - 1];
      
      if (!currentMsg.timestamp || !prevMsg.timestamp) return false;
      
      const currentTime = new Date(currentMsg.timestamp).getTime();
      const prevTime = new Date(prevMsg.timestamp).getTime();
      
      return (currentTime - prevTime) > 15 * 60 * 1000; // 15 minutes
    },
    handleImageLoad() {
      console.log('✅ Image loaded successfully');
      this.scrollToBottom();
    },
    handleImageError(event) {
      console.error('❌ Image load error:', event.target.src);
    },
    scrollToBottom() {
      if (this.$refs.messagesEnd) {
        this.$refs.messagesEnd.scrollIntoView({ behavior: 'smooth' });
      }
    },
    handleImageLoad() {
      // Scroll to bottom after image loads to show the complete message
      this.$nextTick(() => {
        this.scrollToBottom();
      });
    },
    handleImageError(event) {
      console.error('Error loading image:', event);
      // Có thể hiển thị placeholder image hoặc error message
    },
    
    getAvatarUrl(avatarPath) {
      if (!avatarPath) {
        return '';
      }
      
      // Nếu đã là absolute URL (bắt đầu bằng http/https)
      if (avatarPath.startsWith('http')) {
        return avatarPath; // Trả về nguyên URL cho Google OAuth avatar
      }
      
      // Nếu là relative path (uploaded avatar), thêm base URL  
      const fullUrl = `http://localhost:3000/uploads/user/${avatarPath}`;
      return fullUrl;
    },
    
    handleAvatarError(event) {
      console.error('❌ Avatar load error:', event.target.src);
      console.log('🔄 Falling back to default avatar...');
      
      // Prevent infinite error loop
      if (event.target.src.includes('defaultProfile.png')) {
        return;
      }
      
      // Fallback to default avatar
      event.target.src = require('@/assets/defaultProfile.png');
    },
    
    // Reaction Methods
    startLongPress(event, message) {
      if (!message) return;
      
      event.preventDefault();
      
      this.selectedMessage = message;
      this.lastEvent = event;
      
      this.longPressTimer = setTimeout(() => {
        this.showReactionPickerAtPosition(event);
      }, this.longPressDuration);
    },
    
    cancelLongPress() {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    },
    
    showReactionPickerAtPosition(event) {
      const bubble = event.target.closest('.message-bubble');
      if (!bubble) return;
      const rect = bubble.getBoundingClientRect();
      
      console.log('🎯 [ChatMessages] Opening picker for message:', {
        messageId: this.selectedMessage?._id,
        reactions: this.selectedMessage?.reactions,
        currentUserId: this.currentUserId
      });
      
      // Place picker BELOW the message bubble (like chat popup)
      const PICKER_HALF_WIDTH = 190; // ~380px / 2 (see picker component)
      this.reactionPickerPosition = {
        top: rect.bottom + 8, // below bubble with small gap
        left: rect.left + (rect.width / 2) - PICKER_HALF_WIDTH
      };
      this.showReactionPicker = true;
      
      // Delay to prevent immediate close
      setTimeout(() => {
        document.addEventListener('click', this.handleClickOutsideReactionPicker);
      }, 100);
    },
    
    handleClickOutsideReactionPicker(event) {
      if (this.showReactionPicker) {
        const picker = document.querySelector('.reaction-picker');
        const messageBubble = event.target.closest('.message-bubble');
        const isClickInsidePicker = picker && picker.contains(event.target);
        
        // Chỉ đóng khi click bên ngoài cả picker VÀ message bubble
        if (!isClickInsidePicker && !messageBubble) {
          this.showReactionPicker = false;
          this.selectedMessage = null;
          document.removeEventListener('click', this.handleClickOutsideReactionPicker);
        }
      }
    },
    
    handleReactionSelect(emoji) {
      if (this.selectedMessage) {
        const currentUserId = this.currentUserId;
        const existingReaction = this.selectedMessage.reactions?.find(r => r.userId === currentUserId);
        const newReaction = existingReaction?.emoji === emoji ? null : emoji;
        this.applyReaction(this.selectedMessage, newReaction);
      }
      this.showReactionPicker = false;
      this.selectedMessage = null;
      document.removeEventListener('click', this.handleClickOutsideReactionPicker);
    },
    
    applyReaction(message, reaction) {
      // Create floating emoji animation
      if (reaction) {
        this.createFloatingEmoji(reaction, this.lastEvent);
      }
      
      // Update local message object
      // Convert message.reactions to array format if needed
      if (!message.reactions) {
        message.reactions = [];
      }
      
      const currentUserId = this.currentUserId;
      const existingReactionIndex = message.reactions.findIndex(
        r => r.userId === currentUserId
      );
      
      if (reaction) {
        // Add or update reaction
        const currentUser = this.$store?.state?.user;
        const reactionObj = {
          userId: currentUserId,
          userName: currentUser?.displayName || currentUser?.email || 'Bạn',
          userAvatar: currentUser?.profilePicture || null,
          emoji: reaction
        };
        
        if (existingReactionIndex !== -1) {
          // Update existing - Vue 3 auto tracks
          message.reactions[existingReactionIndex] = reactionObj;
        } else {
          // Add new
          message.reactions.push(reactionObj);
        }
      } else {
        // Remove reaction
        if (existingReactionIndex !== -1) {
          message.reactions.splice(existingReactionIndex, 1);
        }
      }
      
      // Emit event to parent to save reaction
      this.$emit('add-reaction', {
        messageId: message._id,
        reaction: reaction
      });
    },
    
    createFloatingEmoji(emoji, clickEvent) {
      const id = Date.now() + Math.random();
      const floatingEmoji = {
        id,
        emoji,
        x: clickEvent ? clickEvent.clientX : window.innerWidth / 2,
        y: clickEvent ? clickEvent.clientY : window.innerHeight / 2
      };
      
      this.floatingEmojis.push(floatingEmoji);
      
      // Remove after animation completes
      setTimeout(() => {
        const index = this.floatingEmojis.findIndex(e => e.id === id);
        if (index !== -1) {
          this.floatingEmojis.splice(index, 1);
        }
      }, 1000);
    },
    
    getMessageReactions(message) {
      // Convert old format to new format if needed
      if (message.reaction && !message.reactions) {
        return [{
          userId: message.senderId,
          userName: 'Unknown',
          userAvatar: null,
          emoji: message.reaction
        }];
      }
      return message.reactions || [];
    },
    
    showMessageReactors(message) {
      this.selectedMessageForReactors = message;
      this.showReactorsModal = true;
    },
    
    logMessageForDebug(message) {
      return ''; // Method for debugging, now cleaned up
    }
  },
  updated() {
    if (this.shouldAutoScroll) {
      this.scrollToBottom();
    }
  },
  mounted() {
    this.scrollToBottom();
  },
  watch: {
    messages(newMessages, oldMessages) {
      // Chỉ auto scroll khi có tin nhắn mới thêm vào
      if (newMessages.length > oldMessages.length) {
        this.shouldAutoScroll = true;
      } else {
        // Nếu chỉ update reactions/properties, không scroll
        this.shouldAutoScroll = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.chat-messages {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, rgba(250, 250, 250, 0.5) 0%, rgba(255, 255, 255, 0.5) 100%);
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #5568d3 0%, #63428b 100%);
  }
}

.messages-date-separator {
  text-align: center;
  margin: 1rem 0 1.25rem;
  color: #667eea;
  font-size: 0.75rem;
  font-weight: 600;
  position: relative;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  &::before, &::after {
    content: "";
    position: absolute;
    top: 50%;
    width: calc(35% - 10px);
    height: 1px;
    background: linear-gradient(to right, transparent, rgba(102, 126, 234, 0.3));
  }
  
  &::before {
    left: 0;
  }
  
  &::after {
    right: 0;
    background: linear-gradient(to left, transparent, rgba(102, 126, 234, 0.3));
  }
}

.message-group {
  margin-bottom: 1rem;
}

.message-timestamp {
  text-align: center;
  margin: 0.75rem 0;
  color: #94a3b8;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.message-bubble-container {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  margin-bottom: 0.5rem;
  animation: messageSlideIn 0.3s ease;
  
  &.outgoing {
    flex-direction: row-reverse;
    align-items: flex-start;
  }
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-right: 10px;
  flex-shrink: 0;
  border: 2px solid rgba(102, 126, 234, 0.15);
  align-self: flex-start;
  
  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }
}

.message-content-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 70%;
  width: fit-content;
}

.message-bubble-container.outgoing .message-content-wrapper {
  align-items: flex-end;
}

.message-bubble {
  padding: 0.75rem 1rem;
  border-radius: 18px;
  max-width: 100%;
  width: fit-content;
  word-break: break-word;
  font-size: 0.9375rem;
  line-height: 1.5;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
  
  &.incoming {
    background: white;
    color: #1e293b;
    border-bottom-left-radius: 4px;
    border: 1px solid rgba(226, 232, 240, 0.6);
  }
  
  &.outgoing {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-bottom-right-radius: 4px;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    
    &:hover {
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
  }
}

.messages-end {
  height: 1px;
}

.message-image {
  margin-bottom: 0.5rem;
  
  img {
    max-width: 280px;
    max-height: 350px;
    width: auto;
    height: auto;
    border-radius: 14px;
    object-fit: cover;
    cursor: pointer;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    
    &:hover {
      transform: scale(1.03);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
    }
    
    &:loading {
      background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
      min-height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
}

.message-file {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  
  i {
    margin-right: 10px;
    font-size: 20px;
  }
  
  span {
    font-size: 0.8125rem;
    font-weight: 500;
  }
}

.message-status {
  display: flex;
  align-items: center;
  margin-top: 0.25rem;
  
  .sending {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
    animation: rotate 1s linear infinite;
  }
}

.message-reaction {
  position: absolute;
  bottom: -8px;
  right: -8px;
  background: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 2px solid white;
  animation: popIn 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
  cursor: pointer;
  transition: transform 0.2s ease;
}

.message-reaction:hover {
  transform: scale(1.2);
}

.message-bubble {
  position: relative;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

/* Floating Emoji Animation */
.floating-emojis {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 9999;
}

.floating-emoji {
  position: fixed;
  font-size: 48px;
  animation: floatUp 1s ease-out forwards;
  pointer-events: none;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
}

@keyframes floatUp {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1) rotate(0deg);
  }
  50% {
    transform: translateY(-60px) scale(1.3) rotate(15deg);
  }
  100% {
    opacity: 0;
    transform: translateY(-120px) scale(0.8) rotate(-10deg);
  }
}

.float-enter-active {
  animation: floatUp 1s ease-out;
}

.float-leave-active {
  animation: fadeOut 0.3s ease-out;
}

@keyframes popIn {
  0% {
    opacity: 0;
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .chat-messages {
    padding: 1rem;
  }
  
  .message-bubble {
    max-width: 80%;
    font-size: 0.875rem;
    padding: 0.625rem 0.875rem;
  }
  
  .message-image img {
    max-width: 240px;
    max-height: 300px;
  }
}

@media (max-width: 480px) {
  .chat-messages {
    padding: 0.75rem;
  }
  
  .message-bubble {
    max-width: 85%;
    font-size: 0.8125rem;
  }
  
  .message-avatar {
    width: 28px;
    height: 28px;
    margin-right: 8px;
  }
  
  .message-image img {
    max-width: 200px;
    max-height: 250px;
  }
}
</style>