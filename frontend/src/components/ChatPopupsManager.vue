<template>
  <div class="chat-popups-container">
    <ChatPopup
      v-for="(conversation, index) in openChats"
      :key="conversation._id"
      :conversation="conversation"
      :style="{ right: `${80 + index * 348}px` }"
      @close="closeChat(conversation._id)"
      @conversation-updated="updateConversation"
    />
  </div>
</template>

<script>
import ChatPopup from './ChatPopup.vue'

export default {
  name: 'ChatPopupsManager',
  components: {
    ChatPopup
  },
  data() {
    return {
      openChats: []
    }
  },
  methods: {
    openChat(conversation) {
      // Kiểm tra xem chat đã mở chưa
      const existingIndex = this.openChats.findIndex(c => c._id === conversation._id)
      
      if (existingIndex !== -1) {
        // Nếu đã mở, đưa lên đầu (focus)
        const [existing] = this.openChats.splice(existingIndex, 1)
        this.openChats.unshift(existing)
      } else {
        // Nếu chưa mở, thêm vào đầu
        this.openChats.unshift(conversation)
        
        // Giới hạn tối đa 3 chats cùng lúc
        if (this.openChats.length > 3) {
          this.openChats.pop()
        }
      }
    },
    
    closeChat(conversationId) {
      this.openChats = this.openChats.filter(c => c._id !== conversationId)
    },
    
    updateConversation(updatedConversation) {
      console.log('🔄 [ChatPopupsManager] Updating conversation:', updatedConversation);
      const index = this.openChats.findIndex(c => c._id === updatedConversation._id);
      if (index !== -1) {
        // Replace the entire conversation object to trigger reactivity
        this.openChats[index] = { ...updatedConversation };
        console.log('✅ [ChatPopupsManager] Conversation updated at index', index);
      }
    }
  }
}
</script>

<style scoped>
.chat-popups-container {
  position: fixed;
  bottom: 0;
  right: 0;
  z-index: 9998;
  pointer-events: none;
}

.chat-popups-container > * {
  pointer-events: all;
}
</style>
