<template>
  <div class="message-container">
    <div class="left-sidebar-mini" :class="{ 'collapsed': isSidebarCollapsed }">
      <nav class="left-sidebar__menu">
        <div class="sidebar-toggle" @click="toggleSidebar" :title="isSidebarCollapsed ? 'Mở rộng' : 'Thu gọn'">
          <i class="material-icons">{{ isSidebarCollapsed ? 'chevron_right' : 'chevron_left' }}</i>
        </div>
        <div class="left-sidebar__nav" :class="{ 'icons-only': isSidebarCollapsed }">
          <router-link to="/home">
            <div v-if="$route.name === 'Home'" class="on-page">
              <span class="material-icons w3-xxlarge" style="color: #ff80ab;">home</span>
              <span class="nav-icon" v-if="!isSidebarCollapsed">Trang chủ</span>
            </div>
            <div v-else class="not-on-page">
              <span class="material-icons w3-xxlarge nav-icon-not" style="color: #ffb6c1;">home</span>
              <span class="nav-icon" v-if="!isSidebarCollapsed">Trang chủ</span>
            </div>
          </router-link>
          <router-link
            v-if="user && user._id"
            :to="{
              name: 'Profile',
              params: {
                id: user._id,
              },
            }"
          >
            <div v-if="$route.name === 'Profile'" class="on-page">
              <span class="material-icons w3-xxlarge" style="color: #ff80ab;">account_circle</span>
              <span class="nav-icon" v-if="!isSidebarCollapsed">Trang cá nhân</span>
            </div>
            <div v-else class="not-on-page">
              <span class="material-icons w3-xxlarge nav-icon-not" style="color: #ffb6c1;">account_circle</span>
              <span class="nav-icon" v-if="!isSidebarCollapsed">Trang cá nhân</span>
            </div>
          </router-link>
          <div v-else class="not-on-page">
            <span class="material-icons w3-xxlarge nav-icon-not" style="color: #ffb6c1;">account_circle</span>
            <span class="nav-icon" v-if="!isSidebarCollapsed">Trang cá nhân</span>
          </div>
          <!-- Messages -->
          <router-link to="/messages">
            <div class="on-page message-nav-item">
              <span class="material-icons w3-xxlarge" style="color: #ff80ab;">message</span>
              <span class="nav-icon" v-if="!isSidebarCollapsed">Tin nhắn</span>
              <span v-if="totalUnreadCount > 0" class="unread-badge">{{ totalUnreadCount }}</span>
            </div>
          </router-link>
          <!-- Settings -->
          <div class="not-on-page disabled">
            <span class="material-icons w3-xxlarge nav-icon-not" style="color: #ffb6c1;">settings</span>
            <span class="nav-icon" v-if="!isSidebarCollapsed">Cài đặt</span>
          </div>
        </div>
      </nav>
    </div>
    
    <div class="message-sidebar">
      <div class="message-header">
        <div class="message-title">
          <h2>{{ user && (user.displayName || user.email) || 'Người dùng' }}</h2>
          <i class="material-icons" @click="showNewConversationModal = true">create</i>
        </div>
        <div class="message-search">
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Tìm kiếm"
            @input="searchConversations"
          />
          <i class="material-icons search-icon">search</i>
        </div>
      </div>
      <ConversationList 
        :conversations="filteredConversations"
        :activeConversationId="activeConversationId"
        @select-conversation="selectConversation" 
      />
    </div>
    <div class="message-content">
      <div v-if="activeConversation" class="message-chat-container">
        <ChatHeader :conversation="activeConversation" />
        <ChatMessages 
          :messages="messages" 
          :currentUserId="currentUserId" 
        />
        <MessageInput @send-message="sendMessage" />
      </div>
      <div v-else class="message-empty-state">
        <div class="empty-state-content">
          <div class="message-circle">
            <i class="material-icons">send</i>
          </div>
          <h2>Tin nhắn của bạn</h2>
          <p>Gửi ảnh và tin nhắn riêng tư cho bạn bè hoặc nhóm</p>
          <button class="btn-send-message" @click="showNewConversationModal = true">
            Gửi tin nhắn
          </button>
        </div>
      </div>
    </div>
    
    <!-- New Conversation Modal -->
    <NewConversationModal 
      :show="showNewConversationModal"
      :friends="allAvailableUsers"
      @close="showNewConversationModal = false"
      @select-friend="startNewConversation"
    />
  </div>
</template>

<script>
import ConversationList from './components/ConversationList.vue';
import ChatHeader from './components/ChatHeader.vue';
import ChatMessages from './components/ChatMessages.vue';
import MessageInput from './components/MessageInput.vue';
import NewConversationModal from './components/NewConversationModal.vue';
import MessageAPI from '../../api/messages';
import socketService from '../../services/socketService';

export default {
  name: 'Message',
  components: {
    ConversationList,
    ChatHeader,
    ChatMessages,
    MessageInput,
    NewConversationModal
  },
  data() {
    return {
      conversations: [],
      messages: [],
      activeConversationId: null,
      searchQuery: '',
      isLoading: false,
      isSidebarCollapsed: false,
      friends: [],
      showNewConversationModal: false,
      messagePollingInterval: null,
      conversationPollingInterval: null,
      totalUnreadCount: 0,
      activityInterval: null
    };
  },
  errorCaptured(err, vm, info) {
    console.error('Component error captured:', err, info);
    return false;
  },
  computed: {
    currentUserId() {
      return this.$store.state.user?._id;
    },
    user() {
      return this.$store.state.user || {};
    },
    activeConversation() {
      try {
        return this.conversations.find(conv => conv && conv._id === this.activeConversationId) || null;
      } catch (error) {
        console.error('Error in activeConversation:', error);
        return null;
      }
    },
    filteredConversations() {
      try {
        if (!this.searchQuery) return this.conversations || [];
        
        return (this.conversations || []).filter(conversation => {
          if (!conversation) return false;
          // Filter by name or last message content
          const name = conversation.recipientName || '';
          const lastMessage = conversation.lastMessage || '';
          const query = this.searchQuery.toLowerCase();
          
          return name.toLowerCase().includes(query) || 
                 lastMessage.toLowerCase().includes(query);
        });
      } catch (error) {
        console.error('Error in filteredConversations:', error);
        return [];
      }
    },
    unreadCount() {
      try {
        return (this.conversations || []).reduce((total, conv) => {
          if (!conv) return total;
          return total + (conv.unread || 0);
        }, 0);
      } catch (error) {
        console.error('Error in unreadCount:', error);
        return 0;
      }
    },
    allAvailableUsers() {
      try {
        const allUsers = [];
        const userIds = new Set();
        
        // Thêm friends trước
        (this.friends || []).forEach(friend => {
          if (friend && friend._id && !userIds.has(friend._id)) {
            allUsers.push({
              _id: friend._id,
              displayName: friend.displayName,
              email: friend.email,
              profilePicture: friend.profilePicture,
              type: 'friend'
            });
            userIds.add(friend._id);
          }
        });
        
        // Thêm những người đã có conversation nhưng chưa có trong friends
        (this.conversations || []).forEach(conv => {
          if (conv && conv.recipientId && !userIds.has(conv.recipientId)) {
            allUsers.push({
              _id: conv.recipientId,
              displayName: conv.recipientName,
              email: conv.recipientEmail || '', // Lấy email từ conversation nếu có
              profilePicture: conv.recipientAvatar,
              type: 'conversation'
            });
            userIds.add(conv.recipientId);
          }
        });
        
        return allUsers;
      } catch (error) {
        console.error('Error in allAvailableUsers:', error);
        return this.friends || [];
      }
    }
  },
  methods: {
    async loadConversations() {
      this.isLoading = true;
      try {
        console.log('Loading conversations from API...');
        const response = await MessageAPI.getConversations();
        if (response && response.data && Array.isArray(response.data)) {
          this.conversations = response.data.map(conv => {
            console.log('Processing conversation:', conv);
            
            let otherParticipant = {};
            
            // Xử lý cả hai format: participant (từ GET) và participants (từ POST)
            if (conv.participant) {
              // Format từ GET /conversations
              otherParticipant = conv.participant;
            } else if (conv.participants && Array.isArray(conv.participants)) {
              // Format từ POST /conversations hoặc format khác
              otherParticipant = conv.participants.find(p => p && p._id && p._id.toString() !== this.currentUserId) || {};
            }
            
            const lastMessage = conv.lastMessage || {};
            
            console.log('Other participant found in loadConversations:', otherParticipant);
            
            return {
              _id: conv._id || '',
              recipientId: otherParticipant._id || null,
              recipientName: otherParticipant.displayName || otherParticipant.email || 'Unknown User',
              recipientEmail: otherParticipant.email || '', // Thêm email
              recipientAvatar: otherParticipant.profilePicture || null,
              recipientLastSeen: otherParticipant.lastSeen || null,
              recipientIsOnline: otherParticipant.isOnline || false,
              lastMessage: (lastMessage && typeof lastMessage === 'object' && lastMessage.content) ? String(lastMessage.content) : '',
              lastMessageTime: conv.lastMessageTime ? new Date(conv.lastMessageTime) : (conv.createdAt ? new Date(conv.createdAt) : new Date()),
              unread: conv.unread || 0 // Lấy unread count từ server
            };
          });
        } else {
          this.conversations = [];
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
        // Fallback to empty conversations if API fails
        this.conversations = [];
        // You could also show a toast notification here
      } finally {
        this.isLoading = false;
      }
    },
    async loadMessages(conversationId) {
      this.isLoading = true;
      try {
        console.log('Loading messages from API for conversation:', conversationId);
        const response = await MessageAPI.getMessages(conversationId);
        if (response && response.data && response.data.messages && Array.isArray(response.data.messages)) {
          this.messages = response.data.messages.map(msg => {
            // Safely access nested properties
            const sender = msg.sender || {};
            
            console.log('Debug: Processing message', { 
              msgId: msg._id,
              senderId: sender._id,
              currentUserId: this.currentUserId,
              senderType: typeof sender._id,
              currentType: typeof this.currentUserId,
              content: msg.content
            });
            
            return {
              _id: msg._id || '',
              senderId: sender._id || null,
              senderName: sender.displayName || '',
              senderAvatar: sender.profilePicture || null,
              content: msg.content || '',
              messageType: msg.messageType || 'text',
              file: msg.file || null,
              timestamp: msg.createdAt ? new Date(msg.createdAt) : new Date(),
              isMyMessage: String(sender._id) === String(this.currentUserId) // Thêm flag rõ ràng
            };
          });
        } else {
          this.messages = [];
        }
      } catch (error) {
        console.error('Error loading messages:', error);
        // Fallback to empty messages if API fails  
        this.messages = [];
      } finally {
        this.isLoading = false;
      }
    },
    async selectConversation(conversationId) {
      // Leave previous conversation room
      if (this.activeConversationId && socketService.getConnectionStatus()) {
        socketService.leaveConversation(this.activeConversationId);
      }
      
      this.activeConversationId = conversationId;
      this.loadMessages(conversationId);
      
      // Join new conversation room
      if (socketService.getConnectionStatus()) {
        socketService.joinConversation(conversationId);
      }
      
      // Mark as read
      const conversation = this.conversations.find(c => c._id === conversationId);
      if (conversation) {
        conversation.unread = 0;
      }
      
      // Mark messages as read on server
      try {
        await MessageAPI.markAsRead(conversationId);
        
        // Cập nhật unread count local
        this.loadUnreadCount();
        
        // Trigger global notification update
        if (window.updateNotifications) {
          window.updateNotifications();
        }
        
        // Trigger sidebar notification update
        if (window.updateSidebarNotifications) {
          window.updateSidebarNotifications();
        }
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    },
    searchConversations() {
      // This is handled by the computed property filteredConversations
    },
    async sendMessage(messageData) {
      if ((!messageData.content && !messageData.file) || !this.activeConversationId) return;
      
      try {
        console.log('Sending message via API:', messageData);
        
        // Add message to UI immediately (optimistic update)
        let fileUrl = null;
        if (messageData.file) {
          fileUrl = URL.createObjectURL(messageData.file);
        }
        
        const tempMessage = {
          _id: `temp_${Date.now()}`,
          senderId: this.currentUserId,
          senderName: this.user.displayName || 'Bạn',
          senderAvatar: this.user.profilePicture || null,
          content: messageData.content || '',
          messageType: messageData.messageType || 'text',
          file: messageData.file ? messageData.file.name : null,
          fileUrl: fileUrl,
          fileName: messageData.file ? messageData.file.name : null,
          timestamp: new Date(),
          isSending: true,
          isMyMessage: true // Flag rõ ràng cho tin nhắn của tôi
        };
        
        console.log('Debug: Temp message created', {
          tempSenderId: tempMessage.senderId,
          currentUserId: this.currentUserId,
          userFromStore: this.$store.state.user?._id,
          isEqual: tempMessage.senderId === this.currentUserId
        });
        
        this.messages.push(tempMessage);
        
        // Send to server
        const response = await MessageAPI.sendMessage(this.activeConversationId, messageData);
        
        console.log('🚀 Server response:', {
          status: response?.status,
          success: response?.data?.success,
          data: response?.data,
          hasFile: !!messageData.file,
          fileType: messageData.messageType
        });
        
        // Replace temp message with server response
        const index = this.messages.findIndex(m => m._id === tempMessage._id);
        if (index !== -1 && response && response.data) {
          const responseData = response.data;
          const sender = responseData.sender || {};
          
          const finalMessage = {
            _id: responseData._id || '',
            senderId: sender._id || this.currentUserId, // Fallback to currentUserId if sender not populated
            senderName: sender.displayName || this.user.displayName || '',
            senderAvatar: sender.profilePicture || this.user.profilePicture || null,
            content: responseData.content || '',
            messageType: responseData.messageType || 'text',
            file: responseData.file || null,
            timestamp: responseData.createdAt ? new Date(responseData.createdAt) : new Date(),
            isMyMessage: true // ✅ QUAN TRỌNG: Đánh dấu đây là tin nhắn của tôi
          };
          
          console.log('Debug: Final message from server', {
            finalSenderId: finalMessage.senderId,
            currentUserId: this.currentUserId,
            serverSender: sender._id,
            isEqual: finalMessage.senderId === this.currentUserId
          });
          
          this.messages.splice(index, 1, finalMessage);
        }
        
        // Update last message in conversation
        const conversation = this.conversations.find(c => c._id === this.activeConversationId);
        if (conversation && response && response.data) {
          conversation.lastMessage = response.data.content || '';
          conversation.lastMessageTime = response.data.createdAt ? new Date(response.data.createdAt) : new Date();
        }
        
      } catch (error) {
        console.error('Error sending message:', error);
        // Remove temp message on error
        const index = this.messages.findIndex(m => m._id.startsWith('temp_'));
        if (index !== -1) {
          this.messages.splice(index, 1);
        }
      }
    },

    async loadFriends() {
      try {
        console.log('Loading friends from API...');
        const response = await MessageAPI.getFriends();
        this.friends = response.data;
      } catch (error) {
        console.error('Error loading friends:', error);
        // Fallback to empty friends list if API fails
        this.friends = [];
      }
    },

    async startNewConversation(friendId) {
      try {
        console.log('Starting conversation with friend via API:', friendId);
        
        // Tìm thông tin friend từ danh sách friends đã load
        const selectedFriend = this.friends.find(f => f && f._id === friendId);
        console.log('Selected friend info:', selectedFriend);
        
        const response = await MessageAPI.createOrGetConversation(friendId);
        if (response && response.data) {
          const conversation = response.data;
          console.log('API response conversation:', conversation);
          
          // Check if conversation already exists in our list
          const existingConv = this.conversations.find(c => c._id === conversation._id);
          if (!existingConv) {
            // Thử lấy thông tin từ API response trước, sau đó fallback về selectedFriend
            const participants = conversation.participants || [];
            console.log('Participants from API:', participants);
            
            const otherParticipant = participants.find(p => p && p._id && p._id.toString() !== this.currentUserId);
            console.log('Other participant found:', otherParticipant);
            
            let recipientInfo = otherParticipant;
            
            // Nếu không có thông tin từ API, dùng từ selectedFriend
            if (!recipientInfo && selectedFriend) {
              recipientInfo = selectedFriend;
              console.log('Using selectedFriend as fallback:', selectedFriend);
            }
            
            const newConv = {
              _id: conversation._id || '',
              recipientId: recipientInfo ? recipientInfo._id : friendId,
              recipientName: recipientInfo ? (recipientInfo.displayName || recipientInfo.email || 'Unknown User') : 'Unknown User',
              recipientEmail: recipientInfo ? recipientInfo.email || '' : '', // Thêm email
              recipientAvatar: recipientInfo ? recipientInfo.profilePicture : null,
              lastMessage: '',
              lastMessageTime: conversation.createdAt ? new Date(conversation.createdAt) : new Date(),
              unread: 0
            };
            
            console.log('Creating new conversation with data:', newConv);
            this.conversations.unshift(newConv);
          }
          
          // Select the conversation
          this.selectConversation(conversation._id || (existingConv && existingConv._id));
        }
      } catch (error) {
        console.error('Error starting conversation:', error);
      }
    },
    
    toggleSidebar() {
      this.isSidebarCollapsed = !this.isSidebarCollapsed;
      // Lưu trạng thái vào localStorage để duy trì trạng thái khi người dùng quay lại
      localStorage.setItem('messageSidebarCollapsed', this.isSidebarCollapsed);
    },

    // [DEPRECATED] Polling cho tin nhắn mới - replaced by WebSocket
    startMessagePolling() {
      // This method is no longer used since we switched to WebSocket
      // Real-time messages are now handled by WebSocket in initializeWebSocket()
      console.log('startMessagePolling called but disabled - using WebSocket instead');
    },

    // [DEPRECATED] Polling cho conversations mới - replaced by WebSocket
    startConversationPolling() {
      // This method is no longer used since we switched to WebSocket
      // Real-time conversation updates are now handled by WebSocket in initializeWebSocket()
      console.log('startConversationPolling called but disabled - using WebSocket instead');
    },

    stopPolling() {
      if (this.messagePollingInterval) {
        clearInterval(this.messagePollingInterval);
        this.messagePollingInterval = null;
      }
      if (this.conversationPollingInterval) {
        clearInterval(this.conversationPollingInterval);
        this.conversationPollingInterval = null;
      }
      if (this.activityInterval) {
        clearInterval(this.activityInterval);
        this.activityInterval = null;
      }
    },

    async loadUnreadCount() {
      try {
        const response = await MessageAPI.getUnreadCount();
        if (response?.data) {
          this.totalUnreadCount = response.data.count || 0;
        }
      } catch (error) {
        console.error('Error loading unread count:', error);
      }
    },

    async updateActivity() {
      try {
        const { updateUserActivity } = await import('@/api/messages');
        await updateUserActivity();
      } catch (error) {
        console.error('Error updating activity:', error);
      }
    },

    startActivityUpdate() {
      // Cập nhật activity mỗi 2 phút
      this.activityInterval = setInterval(() => {
        this.updateActivity();
      }, 120000); // 2 minutes
    },

    // WebSocket methods
    initializeWebSocket() {
      // Connect to WebSocket
      socketService.connect();
      
    // Listen for new messages
    socketService.onNewMessage((messageData) => {
      
      // Add message to current conversation if it matches
      if (messageData.conversationId === this.activeConversationId) {
        // Kiểm tra xem tin nhắn có phải từ người khác không
        const isFromOtherUser = String(messageData.sender?._id || messageData.senderId) !== String(this.currentUserId);
        
        if (isFromOtherUser) {
          

          
          // ✅ Chỉ thêm tin nhắn từ người khác và chuẩn hóa format
          const messageWithFlag = {
            _id: messageData._id,
            senderId: messageData.sender?._id || messageData.senderId,
            senderName: messageData.sender?.displayName || messageData.senderName || '',
            senderAvatar: messageData.sender?.profilePicture || messageData.senderAvatar || null,
            content: messageData.content || '',
            messageType: messageData.messageType || 'text', 
            file: messageData.file || null,
            timestamp: messageData.createdAt ? new Date(messageData.createdAt) : new Date(),
            isMyMessage: false
          };
          
          
          this.messages.push(messageWithFlag);
          this.scrollToBottom();
          this.markAsRead(messageData.conversationId);
        }
      }
      
      // Update conversations list (always update for notification purposes)
      this.loadConversations();
      this.loadUnreadCount();
    });      // Listen for conversation updates
      socketService.onConversationUpdated((conversationData) => {
        // Update conversations list
        this.loadConversations();
      });
      
      // Listen for typing indicators
      socketService.onUserTyping((data) => {
        if (data.conversationId === this.activeConversationId && data.userId !== this.$store.state.auth.user.id) {
          // Show typing indicator
        }
      });
      
      // Listen for stop typing
      socketService.onUserStopTyping((data) => {
        if (data.conversationId === this.activeConversationId) {
          // Hide typing indicator
        }
      });
      
      // Join conversation room when active conversation changes
      if (this.activeConversationId) {
        socketService.joinConversation(this.activeConversationId);
      }
    },

    cleanupWebSocket() {
      if (this.activeConversationId) {
        socketService.leaveConversation(this.activeConversationId);
      }
      
      socketService.disconnect();
    },

    scrollToBottom() {
      // Scroll to bottom of messages
      this.$nextTick(() => {
        const messagesContainer = document.querySelector('.chat-messages');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      });
    },

    async markAsRead(conversationId) {
      try {
        await MessageAPI.markAsRead(conversationId);
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }
  },
  async mounted() {
    try {
      console.log('📱 [Message.vue] Component mounted - initializing...');
      await this.$store.dispatch('loadUser');
      
      // Initialize WebSocket connection
      console.log('🔌 [Message.vue] Starting WebSocket initialization...');
      this.initializeWebSocket();
      
      this.loadConversations();
      this.loadFriends();
      
      // If conversation ID is in route, select it
      if (this.$route.params.id) {
        this.activeConversationId = this.$route.params.id;
        this.loadMessages(this.$route.params.id);
      }
      
      // Khôi phục trạng thái sidebar từ localStorage (nếu có)
      const savedState = localStorage.getItem('messageSidebarCollapsed');
      if (savedState !== null) {
        this.isSidebarCollapsed = savedState === 'true';
      }

      // Start activity tracking (still needed for periodic updates)
      this.loadUnreadCount();
      this.updateActivity();
      this.startActivityUpdate();
    } catch (error) {
      console.error('Error in mounted:', error);
    }
  },
  beforeUnmount() {
    this.stopPolling();
    this.cleanupWebSocket();
  },
  watch: {
    '$route.params.id'(newId) {
      if (newId && newId !== this.activeConversationId) {
        // Leave previous conversation room
        if (this.activeConversationId && socketService.getConnectionStatus()) {
          socketService.leaveConversation(this.activeConversationId);
        }
        
        this.activeConversationId = newId;
        this.loadMessages(newId);
        
        // Join new conversation room
        if (newId && socketService.getConnectionStatus()) {
          socketService.joinConversation(newId);
        }
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.message-container {
  display: flex;
  height: calc(100vh);
//   margin-top: 58px; // Height of the header
  background-color: #fffdfd;
}

.left-sidebar-mini {
  width: 240px;
  border-right: 1px solid #ffdce0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: all 0.3s ease;
  background-color: #fffdfd;
  
  &.collapsed {
    width: 60px;
  }
  
  .left-sidebar__menu {
    display: flex;
    flex-direction: column;
    padding: 1rem;
    height: 100%;
    background-color: #fffdfd;
  }
  
  .left-sidebar__nav {
    display: flex;
    flex-direction: column;
    margin-top: 2rem;
    background-color: #fffdfd;
    
    &.icons-only {
      align-items: center;
    }
    
    .on-page, .not-on-page {
      opacity: 1;
      width: 100%;
      border-radius: 0.5rem;
      padding: 0.5rem;
      display: flex;
      align-items: center;
      margin-bottom: 1rem;
      transition: 0.3s;
      position: relative;
    }
    
    .on-page {
      background-color: #ffebee;
      font-weight: bold;
      color: #ff80ab;
    }
    
    .not-on-page {
      opacity: 0.7;
      color: rgb(92, 92, 92);
      
      &:hover {
        background-color: #fff5f7;
        opacity: 0.9;
      }
    }
    
    .nav-icon {
      margin-left: 1rem;
      white-space: nowrap;
      font-weight: 500;
      color: #ff80ab;
    }
    
    .disabled {
      opacity: 0.4;
      cursor: not-allowed;
      pointer-events: none;
    }
  }
  
  .sidebar-toggle {
    display: flex;
    justify-content: flex-end;
    cursor: pointer;
    padding: 0.5rem;
    margin-bottom: 1rem;
    background-color: #fff5f8;
    
    i {
      padding: 0.25rem;
      border-radius: 50%;
      color: #ff80ab;
      
      &:hover {
        background-color: #fff0f5;
      }
    }
  }
  
  .unread-badge {
    background-color: #ff80ab;
    color: white;
    border-radius: 50%;
    min-width: 18px;
    height: 18px;
    font-size: 11px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: auto;
    margin-right: 5px;
    border: 2px solid white;
  }
  
  // Badge positioning when sidebar collapsed
  &.collapsed {
    .message-nav-item {
      position: relative;
      
      .unread-badge {
        position: absolute;
        top: 2px;
        right: 2px;
        margin: 0;
      }
    }
  }
}

.message-sidebar {
  width: 350px;
  border-right: 1px solid #ffdce0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  background-color: #fffdfd;
}

.message-header {
  padding: 16px;
  border-bottom: 1px solid #ffe6eb;
  background-color: #fff5f8;
}

.message-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  
  h2 {
    font-size: 16px;
    font-weight: 600;
  }
  
  i {
    cursor: pointer;
    color: #ff80ab;
    font-size: 24px;
  }
}

.toggle-sidebar {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 4px;
  
  &:hover {
    background-color: #f5f5f5;
    border-radius: 50%;
  }
  
  i {
    font-size: 24px;
  }
}

.message-search {
  position: relative;
  margin-bottom: 8px;
  
  input {
    width: 100%;
    padding: 8px 30px 8px 12px;
    border-radius: 8px;
    border: none;
    background-color: #fff0f5;
    font-size: 14px;
    
    &:focus {
      outline: none;
      background-color: #fce4ec;
    }
  }
  
  .search-icon {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: #8e8e8e;
    font-size: 18px;
  }
}

.message-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #fff5f8;
}

.message-chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.message-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #ff80ab;
  text-align: center;
}

.empty-state-content {
  max-width: 350px;
}

.message-circle {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  border: 3px solid #ff80ab;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  
  i {
    font-size: 36px;
    transform: rotate(-20deg);
  }
}

.empty-state-content h2 {
  font-size: 22px;
  margin-bottom: 8px;
}

.empty-state-content p {
  color: #ffb6c1;
  font-size: 14px;
  margin-bottom: 24px;
}

.btn-send-message {
  background: #ff80ab;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  padding: 8px 16px;
  
  &:hover {
    background: #ffb6c1;
  }
}
</style>