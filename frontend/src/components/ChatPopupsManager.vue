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
import MessageAPI from '@/api/messages'

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
  mounted() {
    // Register global method to open chat popup
    window.openChatPopup = this.handleOpenChatPopup;
  },
  beforeUnmount() {
    delete window.openChatPopup;
  },
  methods: {
    async handleOpenChatPopup({ recipientId, recipientName, recipientAvatar }) {
      try {
        console.log('🔵 handleOpenChatPopup called for user:', recipientId);
        
        // 1. Kiểm tra xem đã mở chat này chưa (trong openChats)
        const existingOpenChat = this.openChats.find(chat => 
          (!chat.isGroup && chat.participant?._id === recipientId) ||
          chat._id === `temp_${recipientId}`
        );
        
        if (existingOpenChat) {
          console.log('✅ Chat already open, focusing:', existingOpenChat._id);
          this.openChat(existingOpenChat);
          return;
        }
        
        // 2. Kiểm tra store xem đã có conversation này chưa
        const conversationsInStore = this.$store.getters.sortedConversations || [];
        const existingConversation = conversationsInStore.find(conv => 
          !conv.isGroup && conv.participant?._id === recipientId
        );
        
        if (existingConversation) {
          console.log('✅ Found conversation in store, opening:', existingConversation._id);
          this.openChat(existingConversation);
          return;
        }
        
        // 3. Không có trong store → tạo temp và fetch từ API
        console.log('🔄 Creating temp conversation and fetching from API...');
        const tempConversation = {
          _id: `temp_${recipientId}`,
          isGroup: false,
          participant: {
            _id: recipientId,
            displayName: recipientName,
            profilePicture: recipientAvatar,
            isOnline: false
          },
          messages: [],
          isLoading: true
        };
        
        // Mở chat với temp conversation trước
        this.openChat(tempConversation);
        
        // Fetch conversation thật từ API
        const response = await MessageAPI.createOrGetConversation(recipientId);
        if (response.status === 200 || response.status === 201) {
          const realConversation = response.data;
          console.log('✅ Fetched real conversation:', realConversation._id);
          
          // Tìm temp conversation và thay thế
          const tempIndex = this.openChats.findIndex(c => c._id === `temp_${recipientId}`);
          if (tempIndex !== -1) {
            // Dùng splice để Vue detect change
            this.openChats.splice(tempIndex, 1, realConversation);
            console.log('✅ Replaced temp conversation with real one');
          }
          
          // Cập nhật store để lần sau không cần fetch nữa
          await this.$store.dispatch('loadConversations');
        }
      } catch (error) {
        console.error('❌ Error opening chat popup:', error);
        // Xóa temp conversation nếu lỗi
        this.openChats = this.openChats.filter(c => !c._id.startsWith('temp_'));
      }
    },
    
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
