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
            <div class="on-page">
              <span class="material-icons w3-xxlarge" style="color: #ff80ab;">message</span>
              <span class="nav-icon" v-if="!isSidebarCollapsed">Tin nhắn</span>
              <span v-if="unreadCount > 0" class="unread-badge">{{ unreadCount }}</span>
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
          <h2>{{ user.displayName || user.email }}</h2>
          <i class="material-icons">create</i>
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
          <button class="btn-send-message">Gửi tin nhắn</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ConversationList from './components/ConversationList.vue';
import ChatHeader from './components/ChatHeader.vue';
import ChatMessages from './components/ChatMessages.vue';
import MessageInput from './components/MessageInput.vue';

export default {
  name: 'Message',
  components: {
    ConversationList,
    ChatHeader,
    ChatMessages,
    MessageInput
  },
  data() {
    return {
      conversations: [],
      messages: [],
      activeConversationId: null,
      searchQuery: '',
      isLoading: false,
      isSidebarCollapsed: false
    };
  },
  computed: {
    currentUserId() {
      return this.$store.state.user?._id;
    },
    user() {
      return this.$store.state.user || {};
    },
    activeConversation() {
      return this.conversations.find(conv => conv._id === this.activeConversationId);
    },
    filteredConversations() {
      if (!this.searchQuery) return this.conversations;
      
      return this.conversations.filter(conversation => {
        // Filter by name or last message content
        const name = conversation.recipientName || '';
        const lastMessage = conversation.lastMessage || '';
        const query = this.searchQuery.toLowerCase();
        
        return name.toLowerCase().includes(query) || 
               lastMessage.toLowerCase().includes(query);
      });
    },
    unreadCount() {
      return this.conversations.reduce((total, conv) => total + (conv.unread || 0), 0);
    }
  },
  methods: {
    async loadConversations() {
      this.isLoading = true;
      try {
        // This will be connected to the backend API later
        // For now, let's use mock data
        this.conversations = [
          {
            _id: '1',
            recipientId: 'user1',
            recipientName: 'Nguyễn Văn A',
            recipientAvatar: '',
            lastMessage: 'Xin chào, bạn khỏe không?',
            lastMessageTime: new Date(2023, 8, 22, 14, 30),
            unread: 2
          },
          {
            _id: '2',
            recipientId: 'user2',
            recipientName: 'Trần Thị B',
            recipientAvatar: '',
            lastMessage: 'Hôm nay thời tiết đẹp quá!',
            lastMessageTime: new Date(2023, 8, 22, 10, 15),
            unread: 0
          },
          {
            _id: '3',
            recipientId: 'user3',
            recipientName: 'Lê Văn C',
            recipientAvatar: '',
            lastMessage: 'Bạn đã xem bài viết mới của tôi chưa?',
            lastMessageTime: new Date(2023, 8, 21, 18, 45),
            unread: 1
          }
        ];
      } catch (error) {
        console.error('Error loading conversations:', error);
      } finally {
        this.isLoading = false;
      }
    },
    async loadMessages(conversationId) {
      this.isLoading = true;
      try {
        // This will be connected to the backend API later
        // For now, let's use mock data
        if (conversationId === '1') {
          this.messages = [
            {
              _id: 'm1',
              senderId: this.currentUserId,
              content: 'Xin chào!',
              timestamp: new Date(2023, 8, 22, 14, 20)
            },
            {
              _id: 'm2',
              senderId: 'user1',
              content: 'Xin chào, bạn khỏe không?',
              timestamp: new Date(2023, 8, 22, 14, 30)
            }
          ];
        } else if (conversationId === '2') {
          this.messages = [
            {
              _id: 'm3',
              senderId: 'user2',
              content: 'Hôm nay thời tiết đẹp quá!',
              timestamp: new Date(2023, 8, 22, 10, 15)
            }
          ];
        } else if (conversationId === '3') {
          this.messages = [
            {
              _id: 'm4',
              senderId: this.currentUserId,
              content: 'Tôi rất thích bài viết gần đây của bạn.',
              timestamp: new Date(2023, 8, 21, 18, 30)
            },
            {
              _id: 'm5',
              senderId: 'user3',
              content: 'Bạn đã xem bài viết mới của tôi chưa?',
              timestamp: new Date(2023, 8, 21, 18, 45)
            }
          ];
        } else {
          this.messages = [];
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        this.isLoading = false;
      }
    },
    selectConversation(conversationId) {
      this.activeConversationId = conversationId;
      this.loadMessages(conversationId);
      
      // Mark as read
      const conversation = this.conversations.find(c => c._id === conversationId);
      if (conversation) {
        conversation.unread = 0;
      }
    },
    searchConversations() {
      // This is handled by the computed property filteredConversations
    },
    async sendMessage(content) {
      if (!content || !this.activeConversationId) return;
      
      try {
        const newMessage = {
          _id: `temp_${Date.now()}`,
          senderId: this.currentUserId,
          content,
          timestamp: new Date()
        };
        
        // Add message to UI immediately
        this.messages.push(newMessage);
        
        // Update last message in conversation
        const conversation = this.conversations.find(c => c._id === this.activeConversationId);
        if (conversation) {
          conversation.lastMessage = content;
          conversation.lastMessageTime = new Date();
        }
        
        // In a real app, here you would send the message to the server
        // and then update the message with the server's response
        
      } catch (error) {
        console.error('Error sending message:', error);
      }
    },
    
    toggleSidebar() {
      this.isSidebarCollapsed = !this.isSidebarCollapsed;
      // Lưu trạng thái vào localStorage để duy trì trạng thái khi người dùng quay lại
      localStorage.setItem('messageSidebarCollapsed', this.isSidebarCollapsed);
    }
  },
  async mounted() {
    await this.$store.dispatch('loadUser');
    this.loadConversations();
    
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
  },
  watch: {
    '$route.params.id'(newId) {
      if (newId && newId !== this.activeConversationId) {
        this.activeConversationId = newId;
        this.loadMessages(newId);
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