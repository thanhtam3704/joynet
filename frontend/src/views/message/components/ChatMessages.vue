<template>
  <div class="chat-messages" ref="messageContainer">
    <div class="messages-date-separator" v-if="messages.length > 0">
      {{ formatDate(messages[0].timestamp) }}
    </div>
    
    <div v-for="(message, index) in groupedMessages" :key="message._id" class="message-group">
      <div class="message-timestamp" v-if="shouldShowTimestamp(index)">
        {{ formatTime(message.timestamp) }}
      </div>
      
      <div 
        class="message-bubble-container"
        :class="{ 'outgoing': message.senderId === currentUserId }"
      >
        <div class="message-avatar" v-if="message.senderId !== currentUserId">
          <!-- We'll replace this with actual user avatar from store or props later -->
          <img src="@/assets/defaultProfile.png" alt="Avatar" />
        </div>
        <div 
          class="message-bubble"
          :class="{ 
            'outgoing': message.senderId === currentUserId,
            'incoming': message.senderId !== currentUserId
          }"
        >
          {{ message.content }}
        </div>
      </div>
    </div>
    
    <div class="messages-end" ref="messagesEnd"></div>
  </div>
</template>

<script>
export default {
  name: 'ChatMessages',
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
  computed: {
    // Group messages by time (messages within 2 minutes of each other)
    groupedMessages() {
      return this.messages;
    }
  },
  methods: {
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
    scrollToBottom() {
      if (this.$refs.messagesEnd) {
        this.$refs.messagesEnd.scrollIntoView({ behavior: 'smooth' });
      }
    }
  },
  updated() {
    this.scrollToBottom();
  },
  mounted() {
    this.scrollToBottom();
  }
};
</script>

<style lang="scss" scoped>
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  background-color: #fff9fb;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: #f8bbd0;
    border-radius: 4px;
  }
}

.messages-date-separator {
  text-align: center;
  margin: 8px 0 16px;
  color: #ec407a;
  font-size: 12px;
  position: relative;
  
  &::before, &::after {
    content: "";
    position: absolute;
    top: 50%;
    width: 30%;
    height: 1px;
    background-color: #f8bbd0;
  }
  
  &::before {
    left: 0;
  }
  
  &::after {
    right: 0;
  }
}

.message-group {
  margin-bottom: 12px;
}

.message-timestamp {
  text-align: center;
  margin: 8px 0;
  color: #ec407a;
  font-size: 11px;
}

.message-bubble-container {
  display: flex;
  align-items: flex-end;
  margin-bottom: 4px;
  
  &.outgoing {
    justify-content: flex-end;
  }
}

.message-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  margin-right: 8px;
  flex-shrink: 0;
  
  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }
}

.message-bubble {
  padding: 12px 16px;
  border-radius: 24px;
  max-width: 65%;
  word-break: break-word;
  font-size: 14px;
  
  &.incoming {
    background-color: #fce4ec;
    color: #262626;
    border-bottom-left-radius: 4px;
  }
  
  &.outgoing {
    background-color: #f06292;
    color: white;
    border-bottom-right-radius: 4px;
  }
}

.messages-end {
  height: 1px;
}
</style>