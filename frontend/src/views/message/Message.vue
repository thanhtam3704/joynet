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
          <!-- Notifications -->
          <router-link to="/notifications">
            <div v-if="$route.name === 'Notifications'" class="on-page">
              <span class="material-icons w3-xxlarge" style="color: #ff80ab;">notifications</span>
              <span class="nav-icon" v-if="!isSidebarCollapsed">Thông báo</span>
            </div>
            <div v-else class="not-on-page">
              <span class="material-icons w3-xxlarge nav-icon-not" style="color: #ffb6c1;">notifications</span>
              <span class="nav-icon" v-if="!isSidebarCollapsed">Thông báo</span>
            </div>
          </router-link>
        </div>
      </nav>
    </div>
    
    <div class="message-sidebar">
      <div class="message-header">
        <div class="message-title">
          <h2>{{ user && (user.displayName || user.email) || 'Người dùng' }}</h2>
          <div class="message-header-actions">
            <i class="material-icons action-btn" @click="showNewConversationModal = true" title="Tin nhắn mới">edit</i>
            <i class="material-icons action-btn" @click="$router.push('/settings')" title="Cài đặt">settings</i>
          </div>
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
        :isLoading="isLoading"
        :isLoadingMore="isLoadingMore"
        :hasMore="hasMore"
        @select-conversation="selectConversation"
        @load-more="loadMoreConversations"
      />
    </div>
    <div class="message-content">
      <div v-if="activeConversation" class="message-chat-container">
        <ChatHeader :conversation="activeConversation" />
        <ChatMessages 
          :messages="messages" 
          :currentUserId="currentUserId"
          @add-reaction="handleAddReaction" 
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
      isLoadingMore: false,
      hasMore: true,
      currentPage: 1,
      pageSize: 20,
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
    async loadConversations(page = 1) {
      console.log(`🔍 [loadConversations] Bắt đầu load page ${page}...`);
      this.isLoading = page === 1;
      if (page === 1) {
        this.currentPage = 1;
      }
      try {
        const response = await MessageAPI.getConversations(page, this.pageSize);
        console.log(`📥 API trả về page ${page}:`, response.data?.length, 'conversations');
        console.log('📦 Raw API response:', response.data);
        if (response && response.data && Array.isArray(response.data)) {
          const mapped = response.data.map((conv, index) => {
            console.log(`  [${index}] Mapping conversation:`, conv._id, conv.isGroup ? 'GROUP' : '1-1');
            
            // XỬ LÝ GROUP CHAT
            if (conv.isGroup) {
              const lastMessage = conv.lastMessage || {};
              
              const result = {
                _id: conv._id || '',
                isGroup: true,
                groupName: conv.groupName || 'Nhóm chat',
                groupAvatar: conv.groupAvatar || null,
                participants: conv.participants || [],
                recipientId: null,
                recipientName: conv.groupName || 'Nhóm chat', // Hiển thị tên nhóm
                recipientEmail: '',
                recipientAvatar: null, // Group dùng icon thay vì avatar
                recipientLastSeen: null,
                recipientIsOnline: false,
                lastMessage: (lastMessage && typeof lastMessage === 'object' && lastMessage.content) ? String(lastMessage.content) : '',
                lastMessageTime: conv.lastMessageTime ? new Date(conv.lastMessageTime) : (conv.createdAt ? new Date(conv.createdAt) : new Date()),
                unread: conv.unread || 0
              };
              console.log(`    ✓ Mapped GROUP to:`, result.recipientName, `(${result.participants?.length || 0} members)`, result._id ? '✓' : '✗ NO ID');
              return result;
            }
            
            // XỬ LÝ 1-1 CHAT
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
            
            const result = {
              _id: conv._id || '',
              isGroup: false,
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
            console.log(`    ✓ Mapped to:`, result.recipientName, result._id ? '✓' : '✗ NO ID');
            return result;
          });
          if (page === 1) {
            this.conversations = mapped;
            console.log(`✅ Load trang 1: ${mapped.length} conversations`);
          } else {
            // Append while avoiding duplicates by _id
            const existingIds = new Set(this.conversations.map(c => c._id));
            const toAdd = mapped.filter(m => m && m._id && !existingIds.has(m._id));
            this.conversations = this.conversations.concat(toAdd);
            console.log(`✅ Thêm ${toAdd.length} conversations mới. Tổng: ${this.conversations.length}`);
          }
          // Simple hasMore detection based on page size
          this.hasMore = (response.data.length === this.pageSize);
          console.log(`📊 hasMore = ${this.hasMore} (vì API trả về ${response.data.length}/${this.pageSize})`);
        } else {
          this.conversations = [];
          this.hasMore = false;
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
        // Fallback to empty conversations if API fails
        this.conversations = [];
        this.hasMore = false;
        // You could also show a toast notification here
      } finally {
        this.isLoading = false;
      }
    },
    async loadMessages(conversationId) {
      this.isLoading = true;
      try {
        const response = await MessageAPI.getMessages(conversationId);
        if (response && response.data && response.data.messages && Array.isArray(response.data.messages)) {
          this.messages = response.data.messages.map(msg => {
            // Safely access nested properties
            const sender = msg.sender || {};
            
            // Map reactions to frontend format (same as socket listener)
            const reactions = (msg.reactions || []).map(r => {
              const user = r.user || {};
              const userName = user.displayName || 
                              (user.email ? user.email.split('@')[0] : null) ||
                              'Unknown User';
              
              return {
                userId: user._id || r.user,
                userName: userName,
                userAvatar: user.profilePicture || null,
                emoji: r.emoji
              };
            });
            
            return {
              _id: msg._id || '',
              senderId: sender._id || null,
              senderName: sender.displayName || '',
              senderAvatar: sender.profilePicture || null,
              content: msg.content || '',
              messageType: msg.messageType || 'text',
              file: msg.file || null,
              originalFileName: msg.originalFileName || null,
              readBy: msg.readBy || [],
              timestamp: msg.createdAt ? new Date(msg.createdAt) : new Date(),
              isMyMessage: String(sender._id) === String(this.currentUserId), // Thêm flag rõ ràng
              reactions: reactions // Thêm reactions đã map
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
    
    async loadMoreConversations() {
      if (this.isLoadingMore || !this.hasMore) {
        console.log('⏭️ Bỏ qua load more:', { isLoadingMore: this.isLoadingMore, hasMore: this.hasMore });
        return;
      }
      this.isLoadingMore = true;
      console.log(`🔄 Load more page ${this.currentPage + 1}...`);
      try {
        const nextPage = this.currentPage + 1;
        const response = await MessageAPI.getConversations(nextPage, this.pageSize);
        console.log(`📥 API trả về page ${nextPage}:`, response.data?.length, 'conversations');
        if (response && response.data && Array.isArray(response.data)) {
          const mapped = response.data.map(conv => {
            if (conv.isGroup) {
              const lastMessage = conv.lastMessage || {};
              return {
                _id: conv._id || '',
                isGroup: true,
                groupName: conv.groupName || 'Nhóm chat',
                groupAvatar: conv.groupAvatar || null,
                participants: conv.participants || [],
                recipientId: null,
                recipientName: conv.groupName || 'Nhóm chat',
                recipientEmail: '',
                recipientAvatar: null,
                recipientLastSeen: null,
                recipientIsOnline: false,
                lastMessage: (lastMessage && typeof lastMessage === 'object' && lastMessage.content) ? String(lastMessage.content) : '',
                lastMessageTime: conv.lastMessageTime ? new Date(conv.lastMessageTime) : (conv.createdAt ? new Date(conv.createdAt) : new Date()),
                unread: conv.unread || 0
              };
            }
            let otherParticipant = {};
            if (conv.participant) {
              otherParticipant = conv.participant;
            } else if (conv.participants && Array.isArray(conv.participants)) {
              otherParticipant = conv.participants.find(p => p && p._id && p._id.toString() !== this.currentUserId) || {};
            }
            const lastMessage = conv.lastMessage || {};
            return {
              _id: conv._id || '',
              isGroup: false,
              recipientId: otherParticipant._id || null,
              recipientName: otherParticipant.displayName || otherParticipant.email || 'Unknown User',
              recipientEmail: otherParticipant.email || '',
              recipientAvatar: otherParticipant.profilePicture || null,
              recipientLastSeen: otherParticipant.lastSeen || null,
              recipientIsOnline: otherParticipant.isOnline || false,
              lastMessage: (lastMessage && typeof lastMessage === 'object' && lastMessage.content) ? String(lastMessage.content) : '',
              lastMessageTime: conv.lastMessageTime ? new Date(conv.lastMessageTime) : (conv.createdAt ? new Date(conv.createdAt) : new Date()),
              unread: conv.unread || 0
            };
          });
          const existingIds = new Set(this.conversations.map(c => c._id));
          const toAdd = mapped.filter(m => m && m._id && !existingIds.has(m._id));
          this.conversations = this.conversations.concat(toAdd);
          this.currentPage = nextPage;
          this.hasMore = (response.data.length === this.pageSize);
        } else {
          this.hasMore = false;
        }
      } catch (error) {
        console.error('Error loading more conversations:', error);
      } finally {
        this.isLoadingMore = false;
      }
    },
    
    searchConversations() {
      // This is handled by the computed property filteredConversations
    },
    
    async handleAddReaction({ messageId, reaction }) {
      try {
        console.log('👍 [Message.vue] Adding reaction:', { messageId, reaction });
        
        // Call API using MessageAPI (same as ChatPopup)
        const response = await MessageAPI.addReaction(messageId, reaction);
        console.log('✅ [Message.vue] Reaction saved:', response.data);
      } catch (error) {
        console.error('❌ [Message.vue] Add reaction error:', error);
        
        // Rollback on error - find message and remove reaction
        const messageIndex = this.messages.findIndex(m => m._id === messageId);
        if (messageIndex !== -1 && reaction) {
          const currentUserId = this.$store.state.user._id;
          const reactionIndex = this.messages[messageIndex].reactions?.findIndex(
            r => r.userId === currentUserId
          );
          if (reactionIndex !== -1) {
            this.messages[messageIndex].reactions.splice(reactionIndex, 1);
          }
        }
      }
    },
    
    async sendMessage(messageData) {
      if ((!messageData.content && !messageData.file) || !this.activeConversationId) return;
      
      try {
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
          originalFileName: messageData.file ? messageData.file.name : null,
          fileUrl: fileUrl,
          fileName: messageData.file ? messageData.file.name : null,
          readBy: [{ user: this.currentUserId }],
          timestamp: new Date(),
          isSending: true,
          isMyMessage: true // Flag rõ ràng cho tin nhắn của tôi
        };
        
        this.messages.push(tempMessage);
        
        // Send to server
        const response = await MessageAPI.sendMessage(this.activeConversationId, messageData);
        
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
            originalFileName: responseData.originalFileName || null,
            readBy: responseData.readBy || [{ user: this.currentUserId }],
            timestamp: responseData.createdAt ? new Date(responseData.createdAt) : new Date(),
            isMyMessage: true // ✅ QUAN TRỌNG: Đánh dấu đây là tin nhắn của tôi
          };
          
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
      
    // Listen for reaction updates
    socketService.onMessageReactionUpdated((data) => {
      console.log('👍 [Message.vue] Reaction updated:', data);
      const messageIndex = this.messages.findIndex(m => m._id === data.messageId);
      if (messageIndex !== -1) {
        // Map reactions to match frontend format (same as ChatPopup)
        const updatedReactions = data.reactions.map(r => {
          const user = r.user || {};
          const userName = user.displayName || 
                          (user.email ? user.email.split('@')[0] : null) ||
                          'Unknown User';
          
          return {
            userId: user._id || r.user,
            userName: userName,
            userAvatar: user.profilePicture || null,
            emoji: r.emoji
          };
        });
        
        // Update reactions - Vue 3 reactive
        this.messages[messageIndex].reactions = updatedReactions;
        
        console.log('✅ [Message.vue] Reactions updated for message:', this.messages[messageIndex]._id);
      }
    });
      
    // Listen for new messages
    socketService.onNewMessage((data) => {
      console.log('📨 Message.vue received newMessage:', data);
      
      // Extract message from data (backend sends { conversationId, message })
      const messageData = data.message || data;
      const receivedConversationId = data.conversationId || messageData.conversationId;
      
      // Add message to current conversation if it matches
      if (receivedConversationId === this.activeConversationId) {
        // Kiểm tra xem tin nhắn có phải từ người khác không
        const messageSenderId = String(messageData.sender?._id || messageData.senderId);
        const myUserId = String(this.currentUserId);
        const isFromOtherUser = messageSenderId !== myUserId;
        
        if (isFromOtherUser) {
          // Bỏ qua các thông điệp rỗng (không có text, không có file/media)
          const hasText = typeof messageData.content === 'string' && messageData.content.trim().length > 0;
          const hasMedia = !!messageData.file || messageData.messageType === 'image' || messageData.messageType === 'file';
          if (!(hasText || hasMedia)) {
            return; // không hiển thị bong bóng trống
          }
          // ✅ Chỉ thêm tin nhắn từ người khác và chuẩn hóa format
          const messageWithFlag = {
            _id: messageData._id,
            senderId: messageData.sender?._id || messageData.senderId,
            senderName: messageData.sender?.displayName || messageData.senderName || '',
            senderAvatar: messageData.sender?.profilePicture || messageData.senderAvatar || null,
            content: messageData.content || '',
            messageType: messageData.messageType || 'text', 
            file: messageData.file || null,
            originalFileName: messageData.originalFileName || null,
            readBy: messageData.readBy || [],
            timestamp: messageData.createdAt ? new Date(messageData.createdAt) : new Date(),
            isMyMessage: false
          };
          
          this.messages.push(messageWithFlag);
          this.scrollToBottom();
          this.markAsRead(receivedConversationId);
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

      // Listen for messages read updates
      socketService.on('messagesRead', (data) => {
        if (data.conversationId === this.activeConversationId) {
          // Update readBy for all affected messages
          data.messages.forEach(updatedMsg => {
            const msgIndex = this.messages.findIndex(m => m._id === updatedMsg._id);
            if (msgIndex !== -1) {
              // Vue 3: Create new object to trigger reactivity
              this.messages[msgIndex] = {
                ...this.messages[msgIndex],
                readBy: updatedMsg.readBy
              };
            }
          });
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
  background: linear-gradient(135deg, rgba(250, 250, 250, 0.5) 0%, rgba(255, 255, 255, 0.5) 100%);
}

.left-sidebar-mini {
  width: 240px;
  border-right: 1px solid rgba(226, 232, 240, 0.6);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: white;
  
  &.collapsed {
    width: 60px;
  }
  
  .left-sidebar__menu {
    display: flex;
    flex-direction: column;
    padding: 1rem;
    height: 100%;
    background: white;
  }
  
  .left-sidebar__nav {
    display: flex;
    flex-direction: column;
    margin-top: 2rem;
    background: white;
    
    &.icons-only {
      align-items: center;
    }
    
    .on-page, .not-on-page {
      opacity: 1;
      width: 100%;
      border-radius: 12px;
      padding: 0.75rem;
      display: flex;
      align-items: center;
      margin-bottom: 0.75rem;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }
    
    .on-page {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
      font-weight: 700;
      
      .material-icons {
        color: #667eea !important;
      }
      
      .nav-icon {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      
      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 0 3px 3px 0;
      }
    }
    
    .not-on-page {
      opacity: 0.7;
      color: #64748b;
      
      &:hover {
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
        opacity: 1;
        transform: translateX(4px);
      }
      
      .material-icons {
        color: #94a3b8 !important;
      }
    }
    
    .nav-icon {
      margin-left: 1rem;
      white-space: nowrap;
      font-weight: 600;
      font-size: 0.9375rem;
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
    padding: 0.625rem;
    margin-bottom: 1rem;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
    border-radius: 12px;
    transition: all 0.2s ease;
    
    &:hover {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
    }
    
    i {
      padding: 0.25rem;
      border-radius: 50%;
      color: #667eea;
      transition: all 0.2s ease;
      
      &:hover {
        background: rgba(102, 126, 234, 0.1);
      }
    }
  }
  
  .unread-badge {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 50%;
    min-width: 20px;
    height: 20px;
    font-size: 0.6875rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: auto;
    margin-right: 5px;
    border: 2px solid white;
    box-shadow: 0 2px 6px rgba(102, 126, 234, 0.4);
  }
  
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
  height: 100vh;
  max-height: 100vh;
  border-right: 1px solid rgba(226, 232, 240, 0.6);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  background: white;
  overflow: hidden;
}

.message-header {
  padding: 1.25rem;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%);
}

.message-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  
  h2 {
    font-size: 1.25rem;
    font-weight: 700;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0;
    flex: 1;
  }
  
  .message-header-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  
  .action-btn {
    cursor: pointer;
    color: #667eea;
    font-size: 20px;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s ease;
    
    &:hover {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
      transform: scale(1.05);
    }
    
    &:active {
      transform: scale(0.95);
    }
  }
}

.toggle-sidebar {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 4px;
  transition: all 0.2s ease;
  border-radius: 50%;
  
  &:hover {
    background: rgba(102, 126, 234, 0.1);
  }
  
  i {
    font-size: 24px;
    color: #667eea;
  }
}

.message-search {
  position: relative;
  margin-bottom: 0.5rem;
  
  input {
    width: 100%;
    padding: 0.75rem 2.75rem 0.75rem 1rem;
    border-radius: 12px;
    border: 2px solid rgba(226, 232, 240, 0.6);
    background-color: white;
    font-size: 0.875rem;
    transition: all 0.2s ease;
    
    &:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    
    &::placeholder {
      color: #94a3b8;
    }
  }
  
  .search-icon {
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: #667eea;
    font-size: 20px;
  }
}

.message-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, rgba(250, 250, 250, 0.5) 0%, rgba(255, 255, 255, 0.5) 100%);
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
  text-align: center;
}

.empty-state-content {
  max-width: 380px;
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-circle {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.25rem;
  border: 3px solid rgba(102, 126, 234, 0.2);
  
  i {
    font-size: 40px;
    transform: rotate(-20deg);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}

.empty-state-content h2 {
  font-size: 1.5rem;
  margin-bottom: 0.75rem;
  font-weight: 700;
  color: #1e293b;
}

.empty-state-content p {
  color: #64748b;
  font-size: 0.9375rem;
  margin-bottom: 1.75rem;
  line-height: 1.6;
}

.btn-send-message {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
  color: white;
  cursor: pointer;
  font-size: 0.9375rem;
  font-weight: 600;
  padding: 0.875rem 1.75rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
  }
  
  &:active {
    transform: translateY(0);
  }
}

/* ========== RESPONSIVE DESIGN ========== */

/* Tablet Large - 1024px and below */
@media (max-width: 1024px) {
  .left-sidebar-mini {
    width: 200px;
    
    &.collapsed {
      width: 55px;
    }
  }

  .message-sidebar {
    width: 300px;
  }
}

/* Tablet - 768px and below */
@media (max-width: 768px) {
  .message-container {
    position: relative;
  }

  .left-sidebar-mini {
    position: fixed;
    left: 0;
    top: 58px;
    height: calc(100vh - 58px);
    z-index: 100;
    width: 60px;
    
    &.collapsed {
      width: 60px;
    }

    .sidebar-toggle {
      display: none;
    }

    .left-sidebar__nav {
      align-items: center;

      .nav-icon {
        display: none;
      }
    }
  }

  .message-sidebar {
    width: 100%;
    max-width: 350px;
    position: fixed;
    left: 60px;
    top: 58px;
    height: calc(100vh - 58px);
    z-index: 99;
    transition: transform 0.3s ease;
  }

  .message-content {
    margin-left: 60px;
    width: calc(100% - 60px);
  }

  .message-sidebar:not(.has-active-conversation) {
    transform: translateX(0);
  }

  .has-active-conversation .message-sidebar {
    transform: translateX(-100%);
  }

  .has-active-conversation .message-content {
    margin-left: 60px;
    width: calc(100% - 60px);
  }
}

/* Mobile - 480px and below */
@media (max-width: 480px) {
  .message-container {
    height: calc(100vh - 50px);
  }

  .left-sidebar-mini {
    width: 50px;
    top: 50px;
    height: calc(100vh - 50px);

    .on-page, .not-on-page {
      padding: 0.5rem;
      justify-content: center;
    }

    .material-icons {
      font-size: 20px !important;
    }
  }

  .message-sidebar {
    left: 50px;
    top: 50px;
    height: calc(100vh - 50px);
    width: calc(100% - 50px);
    max-width: none;
  }

  .message-content {
    margin-left: 50px;
    width: calc(100% - 50px);
  }

  .message-header {
    padding: 1rem;

    .message-title h2 {
      font-size: 1.125rem;
    }

    .message-title i {
      font-size: 20px;
    }
  }

  .message-search input {
    padding: 0.625rem 2.5rem 0.625rem 0.875rem;
    font-size: 0.8125rem;
  }

  .empty-state-content h2 {
    font-size: 1.25rem;
  }

  .empty-state-content p {
    font-size: 0.875rem;
  }

  .message-circle {
    width: 85px;
    height: 85px;

    i {
      font-size: 34px;
    }
  }

  .btn-send-message {
    font-size: 0.875rem;
    padding: 0.75rem 1.5rem;
  }
}

/* Extra Small Mobile - 360px and below */
@media (max-width: 360px) {
  .left-sidebar-mini {
    width: 45px;

    .material-icons {
      font-size: 18px !important;
    }
  }

  .message-sidebar {
    left: 45px;
    width: calc(100% - 45px);
  }

  .message-content {
    margin-left: 45px;
    width: calc(100% - 45px);
  }

  .message-header {
    padding: 0.875rem;
  }

  .message-circle {
    width: 75px;
    height: 75px;

    i {
      font-size: 30px;
    }
  }
}
</style>