<template>
  <div>
    <div v-if="isVisible" class="messages-dropdown" @click.stop>
      <div class="messages-header">
        <h3>Tin nhắn ({{ conversations.length }})</h3>
          <div class="messages-actions">
            <i class="material-icons action-icon" @click="showCreateGroupModal = true" title="Tạo nhóm chat">
              group_add
            </i>
            <i class="material-icons action-icon" @click="showNewMessageModal = true" title="Tin nhắn mới">
              edit
            </i>
            <i class="material-icons action-icon" @click="goToMessagesPage" title="Xem tất cả">
              open_in_new
            </i>
          </div>
        </div>

      <div class="messages-search">
        <i class="material-icons search-icon">search</i>
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="Tìm kiếm tin nhắn"
          @input="handleSearch"
        />
      </div>

      <div class="messages-list" v-if="!loading">
        <div v-if="filteredConversations.length === 0" class="empty-state">
          <div class="empty-icon">💬</div>
          <p class="empty-text">{{ searchQuery ? 'Không tìm thấy cuộc trò chuyện' : 'Chưa có tin nhắn nào' }}</p>
          <button v-if="!searchQuery" class="btn-primary" @click="showNewMessageModal = true">
            Gửi tin nhắn mới
          </button>
        </div>

        <div class="conversations-scroll" v-else>
          <div 
            v-for="conversation in filteredConversations.slice(0, 5)" 
            :key="conversation._id"
            class="message-item"
            :class="{ 'unread': conversation.unread > 0, 'group-chat': conversation.isGroup }"
            @click="openConversation(conversation._id)"
          >
            <!-- Group Chat Avatar -->
            <div v-if="conversation.isGroup" class="message-avatar group-avatar">
              <div class="group-icon-wrapper">
                <i class="material-icons">groups</i>
              </div>
            </div>
            
            <!-- 1-1 Chat Avatar -->
            <div v-else class="message-avatar">
              <img 
                v-if="getOtherUser(conversation)?.profilePicture" 
                :src="`http://localhost:3000/uploads/user/${getOtherUser(conversation).profilePicture}`"
                :alt="getOtherUser(conversation).displayName"
              />
              <img 
                v-else 
                src="@/assets/defaultProfile.png" 
                alt="User"
              />
              <div class="online-status" v-if="getOtherUser(conversation)?.isOnline"></div>
            </div>
            
            <div class="message-content">
              <div class="message-info">
                <!-- Group Name or User Name -->
                <span class="user-name">
                  <i v-if="conversation.isGroup" class="material-icons group-icon-small">groups</i>
                  {{ conversation.isGroup ? conversation.groupName : (getOtherUser(conversation)?.displayName || getOtherUser(conversation)?.email || 'Người dùng') }}
                </span>
                <span class="message-time">{{ formatTime(conversation.lastMessageTime) }}</span>
              </div>
              <div class="message-preview">
                <span class="preview-text" :class="{ 'unread-text': conversation.unread > 0 }">
                  {{ getLastMessagePreview(conversation) }}
                </span>
                <span v-if="conversation.unread > 0" class="unread-count">{{ conversation.unread }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- View All Messages Button - Always show if there are conversations -->
        <div v-if="conversations.length > 0" class="view-all-messages" @click="goToMessagesPage">
          <span>Xem tất cả trong Messenger</span>
        </div>
      </div>

      <div v-else class="loading-state">
        <div class="loading-spinner"></div>
        <span>Đang tải...</span>
      </div>
    </div>

    <!-- New Message Modal -->
    <teleport to="body">
      <NewMessageModal 
        v-if="showNewMessageModal"
        @close="showNewMessageModal = false"
        @open-chat="handleOpenChat"
      />
      
      <!-- Create Group Modal -->
      <CreateGroupModal 
        v-if="showCreateGroupModal"
        @close="showCreateGroupModal = false"
        @group-created="handleGroupCreated"
      />
    </teleport>
  </div>
</template>

<script>
import NewMessageModal from './NewMessageModal.vue'
import CreateGroupModal from './CreateGroupModal.vue'

export default {
  name: 'MessagesDropdown',
  components: {
    NewMessageModal,
    CreateGroupModal
  },
  props: {
    isVisible: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      searchQuery: '',
      loading: false,
      showNewMessageModal: false,
      showCreateGroupModal: false
    }
  },
  computed: {
    conversations() {
      return this.$store.getters.sortedConversations || []
    },
    filteredConversations() {
      if (!this.searchQuery || this.searchQuery.trim() === '') {
        return this.conversations
      }
      
      const query = this.searchQuery.toLowerCase().trim()
      return this.conversations.filter(conv => {
        const otherUser = this.getOtherUser(conv)
        const userName = (otherUser?.displayName || otherUser?.email || '').toLowerCase()
        const lastMessagePreview = this.getLastMessagePreview(conv).toLowerCase()
        return userName.includes(query) || lastMessagePreview.includes(query)
      })
    }
  },
  watch: {
    isVisible(newVal) {
      console.log('MessagesDropdown isVisible changed:', newVal);
      if (newVal) {
        this.loadConversations()
      }
    }
  },
  methods: {
    async loadConversations() {
      console.log('🔄 Loading conversations in MessagesDropdown...');
      this.loading = true
      try {
        await this.$store.dispatch('loadConversations')
        console.log('✅ Conversations loaded:', this.conversations);
      } catch (error) {
        console.error('❌ Load conversations error:', error)
      } finally {
        this.loading = false
      }
    },
    
    handleSearch() {
      // Search is handled by computed property
    },
    
    openConversation(conversationId) {
      const conversation = this.conversations.find(c => c._id === conversationId)
      if (conversation) {
        // Emit event để mở chat popup
        this.$emit('open-chat', conversation)
        this.$emit('close')
      }
    },
    
    handleOpenChat(conversation) {
      // Forward event từ NewMessageModal lên parent (TheHeader)
      this.$emit('open-chat', conversation)
      this.showNewMessageModal = false
      this.$emit('close')
    },
    
    handleGroupCreated(group) {
      console.log('Group created:', group)
      this.showCreateGroupModal = false
      // Emit để mở chat popup với group mới
      this.$emit('open-chat', group)
      this.$emit('close')
    },
    
    createNewMessage() {
      this.$emit('close')
      this.$router.push({
        name: 'Messages',
        query: { new: 'true' }
      })
    },
    
    goToMessagesPage() {
      this.$emit('close')
      this.$router.push({ name: 'Messages' })
    },
    
    getOtherUser(conversation) {
      // Backend trả về field 'participant' chứ không phải 'otherUser'
      return conversation.participant || conversation.otherUser || null
    },
    
    formatTime(timestamp) {
      if (!timestamp) return ''
      
      const now = new Date()
      const time = new Date(timestamp)
      const diff = now - time
      
      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(diff / 3600000)
      const days = Math.floor(diff / 86400000)
      
      if (minutes < 1) return 'Vừa xong'
      if (minutes < 60) return `${minutes} phút`
      if (hours < 24) return `${hours} giờ`
      if (days < 7) return `${days} ngày`
      
      return time.toLocaleDateString('vi-VN')
    },
    
    getLastMessagePreview(conversation) {
      // Nếu không có lastMessage
      if (!conversation.lastMessage) {
        return 'Bắt đầu cuộc trò chuyện'
      }
      
      const message = conversation.lastMessage
      
      // Nếu lastMessage là string (dữ liệu cũ)
      if (typeof message === 'string') {
        return message
      }
      
      // Nếu lastMessage là object
      if (typeof message === 'object') {
        // Kiểm tra messageType
        if (message.messageType === 'image') {
          return '📷 Đã gửi một ảnh'
        }
        if (message.messageType === 'file') {
          return '📎 Đã gửi một file'
        }
        
        // Trả về content cho text message
        if (message.content) {
          // Giới hạn độ dài preview
          return message.content.length > 50 
            ? message.content.substring(0, 50) + '...' 
            : message.content
        }
      }
      
      return 'Tin nhắn mới'
    }
  }
}
</script>

<style scoped>
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: all 0.2s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.messages-dropdown {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 360px;
  max-height: 480px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  z-index: 10000;
  border: 1px solid rgba(226, 232, 240, 0.8);
  display: flex;
  flex-direction: column;
}

.messages-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--gray-100);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%);
}

.messages-header h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--gray-900);
  font-family: var(--font-display);
  margin: 0;
}

.messages-actions {
  display: flex;
  gap: 0.5rem;
}

.action-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: var(--gray-100);
  color: var(--gray-600);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 18px;
}

.action-icon:hover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  transform: scale(1.05);
}

.messages-search {
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--gray-100);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--white);
}

.search-icon {
  color: var(--gray-400);
  font-size: 20px;
}

.messages-search input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 0.875rem;
  color: var(--gray-900);
  background: transparent;
}

.messages-search input::placeholder {
  color: var(--gray-400);
}

.messages-list {
  flex: 1;
  overflow-y: auto;
  max-height: 400px;
  display: flex;
  flex-direction: column;
}

.conversations-scroll {
  flex: 1;
  overflow-y: auto;
}

.conversations-scroll::-webkit-scrollbar {
  width: 6px;
}

.conversations-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.conversations-scroll::-webkit-scrollbar-thumb {
  background: var(--gray-300);
  border-radius: var(--radius-full);
}

.conversations-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--gray-400);
}

.messages-list::-webkit-scrollbar {
  width: 6px;
}

.messages-list::-webkit-scrollbar-track {
  background: transparent;
}

.messages-list::-webkit-scrollbar-thumb {
  background: var(--gray-300);
  border-radius: var(--radius-full);
}

.messages-list::-webkit-scrollbar-thumb:hover {
  background: var(--gray-400);
}

.message-item {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.875rem 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}

.message-item:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  border-left-color: var(--primary);
}

.message-item.unread {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
}

.message-avatar {
  position: relative;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}

.message-avatar img {
  width: 100%;
  height: 100%;
  border-radius: var(--radius-full);
  object-fit: cover;
  border: 2px solid var(--white);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Group Avatar Styles */
.group-avatar .group-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--white);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.group-icon-wrapper i {
  color: white;
  font-size: 24px;
}

.group-icon-small {
  font-size: 16px !important;
  vertical-align: middle;
  margin-right: 4px;
  color: var(--primary);
}

.message-item.group-chat {
  border-left: 3px solid transparent;
}

.message-item.group-chat:hover {
  border-left-color: var(--primary);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
}

.online-status {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: 2px solid var(--white);
  border-radius: var(--radius-full);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.message-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.message-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.user-name {
  font-weight: 600;
  color: var(--gray-900);
  font-size: 0.9375rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.message-time {
  font-size: 0.75rem;
  color: var(--gray-500);
  flex-shrink: 0;
}

.message-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.preview-text {
  font-size: 0.8125rem;
  color: var(--gray-600);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.preview-text.unread-text {
  font-weight: 600;
  color: var(--gray-900);
}

.unread-count {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-full);
  min-width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  text-align: center;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-text {
  font-size: 0.9375rem;
  color: var(--gray-600);
  margin-bottom: 1rem;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.625rem 1.25rem;
  border-radius: var(--radius-lg);
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 6px -1px rgba(102, 126, 234, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px -5px rgba(102, 126, 234, 0.4);
}

.view-all-messages {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9375rem;
  border-top: 1px solid var(--gray-200);
  transition: all 0.2s ease;
  background: white;
  position: sticky;
  bottom: 0;
  color: #667eea;
}

.view-all-messages:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  color: #764ba2;
}

.view-all-messages span {
  display: block;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  gap: 1rem;
  color: var(--gray-600);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--gray-200);
  border-top-color: var(--primary);
  border-radius: var(--radius-full);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 480px) {
  .messages-dropdown {
    width: 320px;
    max-height: 420px;
  }
}
</style>
