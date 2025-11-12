<template>
  <header>
    <div class="header">
      <div class="header__left" @click="handleLogoClick">
        <img src="@/assets/logo.png" alt="Joynet Logo" class="header__logo" />
        <p>Joynet</p>
      </div>
      <div class="header__main">
        <div class="header__main-right">
          <div class="header__main-right-search" ref="searchContainer">
            <input 
              type="text" 
              placeholder="Tìm kiếm người dùng" 
              v-model="searchQuery"
              @input="handleSearchInput"
              @focus="handleSearchFocus"
              @keydown.down.prevent="navigateSearchResults('down')"
              @keydown.up.prevent="navigateSearchResults('up')"
              @keydown.enter.prevent="selectSearchResult(selectedIndex)"
            />
            <i class="material-icons" @click="handleSearch">search</i>
            
            <!-- User Search Results Dropdown -->
            <div 
              class="search-results" 
              v-show="showSearchResults && (isSearching || searchResults.length > 0) && searchQuery && searchQuery.trim().length > 0"
            >
              <div class="search-results-header" v-if="!isSearching && searchResults.length > 0">
                <span class="results-count">Tìm thấy {{ searchResults.length }} kết quả</span>
              </div>
              <div 
                v-for="(user, index) in searchResults" 
                :key="user._id"
                class="search-result-item"
                :class="{ 'selected': selectedIndex === index }"
                @click="goToUserProfile(user._id)"
                @mouseover="selectedIndex = index"
              >
                <div class="search-user-avatar">
                  <img 
                    v-if="user.profilePicture" 
                    :src="`http://localhost:3000/uploads/user/${user.profilePicture}`" 
                    alt="User avatar"
                  />
                  <img 
                    v-else
                    src="@/assets/defaultProfile.png" 
                    alt="Default avatar"
                  />
                </div>
                <div class="search-user-info">
                  <span class="search-user-name" v-html="highlightMatch(user.displayName || user.email, searchQuery)"></span>
                  <span class="search-user-email" v-if="user.email && user.displayName">{{ user.email }}</span>
                </div>
              </div>
              <div class="search-loading" v-if="isSearching">
                <div class="loading-spinner"></div>
                <span>Đang tìm kiếm...</span>
              </div>
              <div class="no-results" v-if="!isSearching && searchQuery && searchResults.length === 0">
                <span class="no-results-icon">🔍</span>
                <span class="no-results-text">Không tìm thấy người dùng</span>
                <span class="no-results-hint">Thử tìm kiếm với từ khóa khác</span>
              </div>
            </div>
          </div>

          <div class="header-actions">
            <button
              @click="
                (openAddImagePost = !openAddImagePost), (openAddTextPost = false)
              "
              class="btn btn-imageadd"
            >
              Đăng bài viết
            </button>
          </div>
        </div>
      </div>
      <div class="header__user">
        <!-- Messages Icon -->
        <div class="messages-wrapper" ref="messagesContainer">
          <i class="material-icons messages-icon" @click="toggleMessages">
            mail
          </i>
          <span v-if="messageUnreadCount > 0" class="messages-badge">{{ messageUnreadCount }}</span>
          
          <!-- Messages Dropdown -->
          <MessagesDropdown 
            :isVisible="showMessages" 
            @close="showMessages = false"
            @open-chat="handleOpenChat"
          />
        </div>

        <!-- Notification Icon -->
        <div class="notification-wrapper" ref="notificationContainer">
          <i class="material-icons notification-icon" @click="toggleNotifications">
            notifications
          </i>
          <span v-if="unreadCount > 0" class="notification-badge">{{ unreadCount }}</span>
          
          <!-- Notification Dropdown -->
          <NotificationList 
            :isVisible="showNotifications" 
            @close="showNotifications = false"
            @open-post-modal="handleOpenPostModal"
            @open-follow-requests-modal="handleOpenFollowRequestsModal"
          />
        </div>

        <!-- <label class="header__user-username"
          > {{ user.displayName }}</label
        >     -->
    <a-dropdown :trigger="['click']" placement="bottomRight">
      <a class="ant-dropdown-link user-avatar-wrapper" @click.prevent>
        <div class="avatar-container">
          <img
            v-if="user.profilePicture"
            class="user-avatar-img"
            :src="`http://localhost:3000/uploads/user/${user.profilePicture}`"
            :alt="user.displayName"
          />
          <img
            v-else
            class="user-avatar-img"
            src="@/assets/defaultProfile.png"
            alt="User"
          />
          <div class="avatar-status-dot"></div>
        </div>
        <DownOutlined class="dropdown-arrow" />
      </a>
      <template #overlay>
        <div class="custom-dropdown-menu">
          <div class="dropdown-header">
            <div class="dropdown-user-info">
              <img
                v-if="user.profilePicture"
                class="dropdown-avatar"
                :src="`http://localhost:3000/uploads/user/${user.profilePicture}`"
              />
              <img
                v-else
                class="dropdown-avatar"
                src="@/assets/defaultProfile.png"
              />
              <div class="dropdown-user-details">
                <span class="dropdown-username">{{ user.displayName || user.email }}</span>
                <span class="dropdown-user-email">{{ user.email }}</span>
              </div>
            </div>
          </div>
          <div class="dropdown-divider"></div>
          <a-menu class="styled-menu">
            <router-link
              v-if="currentUser"
              :to="{
                name: 'Profile',
                params: {
                  id: currentUser,
                },
              }"
            >
              <a-menu-item class="menu-item">
                <span class="menu-icon">👤</span>
                <span class="menu-text">Trang cá nhân</span>
              </a-menu-item>
            </router-link>
            <div class="dropdown-divider"></div>
            <a-menu-item class="menu-item logout-item" @click="logout">
              <span class="menu-icon">🚪</span>
              <span class="menu-text">Đăng xuất</span>
            </a-menu-item>
          </a-menu>
        </div>
      </template>
    </a-dropdown>
        
      </div>
    </div>

  <AddPost v-if="openAddImagePost" :id="currentUser" @close="openAddImagePost = false" />

  <!-- Post Detail Modal -->
  <div 
    v-if="showPostModal" 
    class="modal-overlay"
    @click.self="closePostModal"
  >
    <div class="modal-content">
      <button class="modal-close-btn" @click="closePostModal">×</button>
      <PostDetail 
        v-if="selectedPostId" 
        :id="selectedPostId" 
        :commentId="selectedCommentId"
        :scrollToComment="scrollToComment"
        @close="closePostModal"
      />
    </div>
  </div>

  <!-- Change Password Modal -->
  <ChangePassword
    v-if="showChangePassword"
    @close="closeChangePassword"
  />

  <!-- Follow Requests Modal -->
  <FollowRequestsModal
    v-if="showFollowRequestsModal"
    @close="showFollowRequestsModal = false"
    @request-updated="refreshNotifications"
  />

  <!-- Chat Popups Manager -->
  <ChatPopupsManager ref="chatPopupsManager" />
  </header>
</template>

<script>
import SyncLoader from "vue-spinner/src/SyncLoader.vue";
import AddPost from "@/components/AddPost.vue";
import NotificationList from "@/views/notification/components/NotificationList.vue";
import MessagesDropdown from "@/components/MessagesDropdown.vue";
import ChatPopupsManager from "@/components/ChatPopupsManager.vue";
import PostDetail from "@/views/post/components/PostDetail.vue";
import ChangePassword from "@/views/profile/components/ChangePassword.vue";
import FollowRequestsModal from "@/components/FollowRequestsModal.vue";
import socketService from '@/services/socketService'

export default {
  name: "TheHeader",
  components: {
    SyncLoader,
    AddPost,
    NotificationList,
    MessagesDropdown,
    ChatPopupsManager,
    PostDetail,
    ChangePassword,
    FollowRequestsModal,
  },
  props: ["currentUser"],
  data() {
    return {
      posts: [],
      openAddImagePost: false,
      openAddTextPost: false,
      profilePicture: "",
      searchQuery: "",
      searchResults: [],
      isSearching: false,
      showSearchResults: false,
      selectedIndex: -1,
      searchTimeout: null,
      showNotifications: false,
      showMessages: false,
      showPostModal: false,
      selectedPostId: null,
      selectedCommentId: null,
      scrollToComment: false,
      notificationPollingInterval: null,
      showChangePassword: false,
      showFollowRequestsModal: false,
    };
  },
  computed: {
    user() {
      return this.$store.state.user;
    },
    unreadCount() {
      return this.$store.getters.notificationUnreadCount;
    },
    messageUnreadCount() {
      return this.$store.getters.unreadCount || 0;
    }
  },
  methods: {
    logout() {
      localStorage.clear();
      this.$router.push("/login");
    },
    
    setupMessageSocketListener() {
      // Listen for new messages in active conversation
      socketService.onNewMessage(this.handleNewMessageForUnreadCount);
      
      // Listen for new message notifications (for unread count)
      socketService.onNewMessageNotification((data) => {
        console.log('🔔 [TheHeader] New message notification received:', data)
        this.$store.dispatch('loadConversations')
      });
      
      // Also listen for conversation updates
      socketService.onConversationUpdated(() => {
        console.log('📬 [TheHeader] Conversation updated, reloading')
        this.$store.dispatch('loadConversations')
      });
    },
    
    async handleNewMessageForUnreadCount(data) {
      console.log('📬 [TheHeader] New message received:', data)
      
      // Reload conversations ngay lập tức để cập nhật unread count
      await this.$store.dispatch('loadConversations')
      
      // Trigger global update cho các components khác
      if (window.updateSidebarNotifications) {
        window.updateSidebarNotifications()
      }
    },
    
    handleSearchInput() {
      // Hiện loading ngay khi bắt đầu gõ
      if (this.searchQuery && this.searchQuery.length > 0) {
        this.isSearching = true;
        this.showSearchResults = true; // Hiện dropdown ngay
      } else {
        this.isSearching = false;
        this.searchResults = [];
        this.showSearchResults = false;
        return;
      }
      
      // Clear any existing timeout
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }
      
      // Set a new timeout to avoid making too many requests while typing
      this.searchTimeout = setTimeout(() => {
        this.handleSearch();
      }, 300);
    },
    
    handleSearchFocus() {
      // Khi focus vào ô search, nếu đã có text và results thì hiện lại dropdown
      if (this.searchQuery && this.searchQuery.trim().length > 0) {
        if (this.searchResults.length > 0) {
          this.showSearchResults = true;
        } else {
          // Nếu chưa có results thì search lại
          this.handleSearch();
        }
      }
    },
    
    async handleSearch() {
      if (!this.searchQuery || this.searchQuery.trim().length === 0) {
        this.searchResults = [];
        this.showSearchResults = false;
        return;
      }
      
      this.isSearching = true;
      this.showSearchResults = true; // Hiện modal ngay khi bắt đầu tìm kiếm
      
      console.log('🔍 Searching for:', this.searchQuery); // Debug log
      
      try {
        const { getAllUsers } = await import('@/api/users');
        const response = await getAllUsers();
        
        console.log('📥 API Response:', response); // Debug log
        
        if (response.status === 200) {
          const allUsers = response.data;
          const searchLower = this.searchQuery.toLowerCase().trim();
          
          console.log('👥 Total users:', allUsers.length); // Debug log
          
          // Filter và score users dựa trên độ phù hợp
          const scoredUsers = allUsers
            .map(user => {
              const displayName = (user.displayName || '').toLowerCase();
              const email = (user.email || '').toLowerCase();
              let score = 0;
              
              // Exact match (điểm cao nhất)
              if (displayName === searchLower) {
                score += 100;
              } else if (email === searchLower) {
                score += 90;
              }
              
              // Starts with (bắt đầu bằng)
              if (displayName.startsWith(searchLower)) {
                score += 50;
              } else if (email.startsWith(searchLower)) {
                score += 40;
              }
              
              // Contains (chứa chuỗi tìm kiếm)
              if (displayName.includes(searchLower)) {
                score += 30;
              }
              if (email.includes(searchLower)) {
                score += 20;
              }
              
              // Fuzzy matching - tìm từng từ
              const searchWords = searchLower.split(' ').filter(w => w.length > 0);
              const nameWords = displayName.split(' ').filter(w => w.length > 0);
              
              searchWords.forEach(searchWord => {
                nameWords.forEach(nameWord => {
                  if (nameWord.startsWith(searchWord)) {
                    score += 15;
                  } else if (nameWord.includes(searchWord)) {
                    score += 10;
                  }
                });
              });
              
              return {
                user,
                score,
                displayName: user.displayName || user.email,
                email: user.email
              };
            })
            .filter(item => item.score > 0) // Chỉ lấy kết quả có điểm > 0
            .sort((a, b) => {
              // Sắp xếp theo điểm giảm dần
              if (b.score !== a.score) {
                return b.score - a.score;
              }
              // Nếu điểm bằng nhau, sắp xếp theo tên
              return a.displayName.localeCompare(b.displayName);
            })
            .slice(0, 8); // Giới hạn tối đa 8 kết quả phù hợp nhất
          
          this.searchResults = scoredUsers.map(item => item.user);
          this.showSearchResults = true;
          
          console.log('✅ Search results:', this.searchResults.length, 'found'); // Debug log
        }
      } catch (error) {
        console.error('❌ Error searching users:', error);
        this.searchResults = [];
      } finally {
        this.isSearching = false;
      }
    },
    
    navigateSearchResults(direction) {
      if (this.searchResults.length === 0) return;
      
      if (direction === 'down') {
        if (this.selectedIndex < this.searchResults.length - 1) {
          this.selectedIndex++;
        } else {
          this.selectedIndex = 0; // Loop back to the first item
        }
      } else if (direction === 'up') {
        if (this.selectedIndex > 0) {
          this.selectedIndex--;
        } else {
          this.selectedIndex = this.searchResults.length - 1; // Loop to the last item
        }
      }
    },
    
    selectSearchResult(index) {
      if (index >= 0 && index < this.searchResults.length) {
        const selectedUser = this.searchResults[index];
        this.goToUserProfile(selectedUser._id);
      }
    },
    
    goToUserProfile(userId) {
      this.showSearchResults = false;
      this.searchQuery = ''; // Clear search after selecting
      this.searchResults = [];
      this.selectedIndex = -1;
      this.$router.push({
        name: 'Profile',
        params: { id: userId }
      });
    },
    
    highlightMatch(text, query) {
      if (!text || !query) return text;
      
      const searchLower = query.toLowerCase().trim();
      const textLower = text.toLowerCase();
      
      // Tìm vị trí match
      const index = textLower.indexOf(searchLower);
      
      if (index === -1) {
        // Không tìm thấy exact match, thử tìm từng từ
        const words = searchLower.split(' ').filter(w => w.length > 0);
        let highlightedText = text;
        
        words.forEach(word => {
          const wordIndex = textLower.indexOf(word);
          if (wordIndex !== -1) {
            const regex = new RegExp(`(${word})`, 'gi');
            highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
          }
        });
        
        return highlightedText;
      }
      
      // Highlight exact match
      const before = text.substring(0, index);
      const match = text.substring(index, index + query.length);
      const after = text.substring(index + query.length);
      
      return `${before}<mark>${match}</mark>${after}`;
    },
    
    toggleNotifications() {
      console.log('Toggle notifications called, current state:', this.showNotifications);
      this.showNotifications = !this.showNotifications;
      console.log('New state:', this.showNotifications);
      
      if (this.showNotifications) {
        console.log('Loading notifications...');
        console.log('Notifications in store before load:', this.$store.state.notifications);
        
        // Đóng messages dropdown nếu đang mở
        this.showMessages = false;
        
        // Refresh notification count và load notifications
        Promise.all([
          this.$store.dispatch('loadNotificationUnreadCount'),
          this.$store.dispatch('loadNotifications')
        ]).then(() => {
          console.log('Notifications loaded successfully');
          console.log('Notifications in store after load:', this.$store.state.notifications);
        }).catch(error => {
          console.error('Error loading notifications:', error);
        });
      }
    },

    toggleMessages() {
      console.log('Toggle messages called, current state:', this.showMessages);
      this.showMessages = !this.showMessages;
      console.log('New state:', this.showMessages);
      
      if (this.showMessages) {
        console.log('Loading messages...');
        
        // Đóng notifications dropdown nếu đang mở
        this.showNotifications = false;
        
        // Load conversations và unread count
        Promise.all([
          this.$store.dispatch('loadConversations')
        ]).then(() => {
          console.log('Messages loaded successfully');
        }).catch(error => {
          console.error('Error loading messages:', error);
        });
      }
    },

    // Method để force refresh notifications (có thể gọi từ các component khác)
    refreshNotifications() {
      this.$store.dispatch("loadNotificationUnreadCount");
    },
    
    handleOpenPostModal(data) {
      this.selectedPostId = data.postId;
      this.selectedCommentId = data.commentId || null;
      this.scrollToComment = data.scrollToComment || false;
      this.showPostModal = true;
      // Đóng notification dropdown
      this.showNotifications = false;
    },

    handleOpenFollowRequestsModal() {
      this.showFollowRequestsModal = true;
      // Đóng notification dropdown
      this.showNotifications = false;
    },

    handleOpenChat(conversation) {
      console.log('Opening chat popup for conversation:', conversation);
      // Gọi method của ChatPopupsManager để mở chat
      if (this.$refs.chatPopupsManager) {
        this.$refs.chatPopupsManager.openChat(conversation);
      }
    },

    closePostModal() {
      this.showPostModal = false;
      this.selectedPostId = null;
      this.selectedCommentId = null;
      this.scrollToComment = false;
    },

    openChangePassword() {
      this.showChangePassword = true;
    },

    closeChangePassword() {
      this.showChangePassword = false;
    },

    handleLogoClick() {
      // Kiểm tra xem đang ở trang chủ hay không
      if (this.$route.name === 'Home') {
        // Đang ở trang chủ → reload timeline
        console.log('🏠 Already on home page, reloading timeline...');
        
        // Emit event hoặc gọi method reload timeline
        // Sử dụng event bus hoặc store để trigger reload
        this.$store.dispatch('reloadTimeline');
        
        // Scroll to top
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      } else {
        // Đang ở trang khác → navigate về trang chủ
        console.log('🏠 Navigating to home page...');
        this.$router.push({ name: 'Home' });
      }
    },



    startNotificationPolling() {
      // Check for new notifications every 30 seconds
      this.notificationPollingInterval = setInterval(() => {
        // Only poll if user is logged in
        if (this.$store.state.user && this.$store.state.user._id) {
          this.$store.dispatch("loadNotificationUnreadCount");
        }
      }, 30000); // 30 seconds
    },

    stopNotificationPolling() {
      if (this.notificationPollingInterval) {
        clearInterval(this.notificationPollingInterval);
        this.notificationPollingInterval = null;
      }
    },

    handleVisibilityChange() {
      if (!document.hidden && this.$store.state.user && this.$store.state.user._id) {
        // Tab is now visible, refresh notification count
        this.$store.dispatch("loadNotificationUnreadCount");
      }
    },

    handleClickOutside(event) {
      // Check if click is outside the search container
      if (this.$refs.searchContainer && !this.$refs.searchContainer.contains(event.target)) {
        this.showSearchResults = false;
        this.isSearching = false;
        // Không clear searchQuery để giữ lại text đã nhập
      }
      
      // Check if click is outside the notification container
      if (this.$refs.notificationContainer && !this.$refs.notificationContainer.contains(event.target)) {
        this.showNotifications = false;
      }
      
      // Check if click is outside the messages container
      if (this.$refs.messagesContainer && !this.$refs.messagesContainer.contains(event.target)) {
        this.showMessages = false;
      }
    },
  },
  async mounted() {
    // Only load data if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }
    
    this.$store.dispatch("loadUser");
    
    // Load notification unread count
    this.$store.dispatch("loadNotificationUnreadCount");
    
    // Load message unread count
    this.$store.dispatch("loadConversations");
    
    // Start polling for new notifications every 30 seconds
    this.startNotificationPolling();
    
    // Setup socket listener for new messages to update unread count
    this.setupMessageSocketListener();
    
    // Add event listener to handle clicks outside the search container
    document.addEventListener('click', this.handleClickOutside);
    
    // Add visibility change listener to refresh notifications when tab is focused
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Tạo global function để refresh notifications
    window.refreshNotifications = this.refreshNotifications;
    window.updateNotifications = this.refreshNotifications;
  },
  
  beforeUnmount() {
    // Remove event listener when component is destroyed
    document.removeEventListener('click', this.handleClickOutside);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Clean up socket listeners
    socketService.off('newMessage', this.handleNewMessageForUnreadCount);
    socketService.off('conversationUpdate');
    
    // Clean up global function
    if (window.refreshNotifications === this.refreshNotifications) {
      delete window.refreshNotifications;
    }
    
    // Stop polling when component is destroyed
    this.stopNotificationPolling();
  },
};
</script>

<style lang="scss" scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 2rem;
  position: fixed;
  z-index: 9999;
  width: 100%;
  height: 64px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.header__left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 180px;
  cursor: pointer;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-xl);
  transition: all 0.3s ease;
}

.header__left:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
  transform: translateX(2px);
}

.header__left:active {
  transform: scale(0.98);
}

.header__logo {
  width: 48px;
  height: 48px;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
  transition: transform 0.3s ease;
}

.header__logo:hover {
  transform: scale(1.05) rotate(5deg);
}

.header__left p {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.625rem;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.header__left p:hover {
  transform: translateY(-1px);
}

.header__left i {
  margin-left: auto;
  right: 0;
  border-bottom: 2px solid var(--secondary);
}

.header__main {
  width: 54%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header__main-right {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin-top: 0.7rem;

}

.header__main-right-search {
  background-color: var(--gray-100);
  margin-right: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  margin-left: 2.3rem;
  position: relative;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  overflow: visible; /* Cho phép dropdown hiện ra bên ngoài */
}

.header__main-right-search:focus-within {
  border-color: var(--primary);
  background-color: var(--white);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
}

.header__main-right input {
  background-color: transparent;
  width: 280px;
  height: 38px;
  border-radius: var(--radius-full);
  padding: 0 1rem;
  font-size: 0.9375rem;
  color: var(--gray-900);
  border: none;
}

.header__main-right input::placeholder {
  color: var(--gray-400);
  font-weight: 500;
}

.header__main-right i {
  height: 38px;
  border-radius: var(--radius-full);
  cursor: pointer;
  padding: 0 0.75rem;
  display: flex;
  align-items: center;
  color: var(--gray-500);
  transition: all 0.2s ease;
}

.header__main-right i:hover {
  color: var(--primary);
  transform: scale(1.1);
}

/* Search Results Dropdown Styles */
.search-results {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 100%;
  min-width: 320px;
  background-color: var(--white);
  border-radius: var(--radius-xl);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05);
  z-index: 1000;
  max-height: 420px;
  overflow-y: auto;
  padding: 0;
  animation: slideDown 0.2s ease-out;
}

.search-results::-webkit-scrollbar {
  width: 6px;
}

.search-results::-webkit-scrollbar-track {
  background: transparent;
}

.search-results::-webkit-scrollbar-thumb {
  background: var(--gray-300);
  border-radius: var(--radius-full);
}

.search-results::-webkit-scrollbar-thumb:hover {
  background: var(--gray-400);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.search-results-header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--gray-100);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%);
}

.results-count {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--gray-600);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.search-result-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
  position: relative;
}

.search-result-item:hover,
.search-result-item.selected {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
  border-left-color: var(--primary);
  padding-left: 1.25rem;
}

.search-result-item:hover::before,
.search-result-item.selected::before {
  content: '';
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  background: var(--primary);
  border-radius: var(--radius-full);
  animation: pulse 1.5s infinite;
}

.search-user-avatar {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-right: 0.875rem;
  flex-shrink: 0;
  border: 2px solid var(--white);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.search-result-item:hover .search-user-avatar {
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  transform: scale(1.08);
}

.search-user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.search-user-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  gap: 0.125rem;
}

.search-user-name {
  font-weight: 600;
  color: var(--gray-900);
  font-size: 0.9375rem;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-user-name :deep(mark) {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
  color: var(--primary);
  font-weight: 700;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  border-bottom: 2px solid var(--primary);
}

.search-user-email {
  font-size: 0.8125rem;
  color: var(--gray-500);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-loading {
  padding: 1.5rem 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: var(--gray-600);
  font-size: 0.875rem;
  font-weight: 500;
}

.loading-spinner {
  width: 20px;
  height: 20px;
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

.no-results {
  padding: 2rem 1rem;
  color: var(--gray-500);
  text-align: center;
  font-size: 0.875rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.no-results-icon {
  font-size: 2.5rem;
  opacity: 0.5;
}

.no-results-text {
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--gray-700);
}

.no-results-hint {
  font-size: 0.8125rem;
  color: var(--gray-500);
}

.header__main-right button {
  min-width: 140px;
  font-weight: 600;
  font-size: 0.9375rem;
  padding: 0.625rem 1.25rem;
}

.header__user {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  width: 20%;
  margin-right: 2em;
}

.header__user-username {
  font-weight: bold;
  font-size: 0.9em;
  margin-right: 0.5em;
}

.header__user-image {
  width: 40px;
  height: 40px;
  border-radius: 100%;
}

.btn {
  margin-left: 1rem;
}

.btn-imageadd {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: var(--white);
  border: none;
  border-radius: var(--radius-lg);
  font-weight: 600;
  padding: 0.625rem 1.25rem;
  margin-top: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 6px -1px rgba(102, 126, 234, 0.3);
  position: relative;
  overflow: hidden;
}

.btn-imageadd::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.btn-imageadd:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px -5px rgba(102, 126, 234, 0.4);
}

.btn-imageadd:hover::before {
  opacity: 1;
}

.btn-imageadd:active {
  transform: translateY(0);
  box-shadow: 0 4px 6px -1px rgba(102, 126, 234, 0.3);
}

.header-actions {
  display: flex;
  align-items: center;
}

.btn-logout {
  transform: translate(0, 3px);
  transition: 0.4s;
  background-color: var(--red);
  min-width: 100px;
  min-height: 30px;
  margin-top: 0.7rem;
}

.btn-logout:hover {
  background-color: #e64e49;
  transition: 0.4s;
  box-shadow: 0px 15px 15px -5px rgba(0, 0, 0, 0.2);
  transform: translate(0, -3px);
}

.image-post__img {
  width: 40px;
  height: 40px;
  border-radius: 100%;
}

/* User Avatar Dropdown Styles */
.user-avatar-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  border-radius: var(--radius-full);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
}

.user-avatar-wrapper:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
  transform: translateY(-1px);
}

.avatar-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-avatar-img {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  object-fit: cover;
  border: 2px solid var(--white);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  position: relative;
}

.user-avatar-wrapper:hover .user-avatar-img {
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  transform: scale(1.05);
}

.avatar-status-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: 2px solid var(--white);
  border-radius: var(--radius-full);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  animation: pulse-dot 2s infinite;
}

@keyframes pulse-dot {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

.dropdown-arrow {
  font-size: 0.75rem;
  color: var(--gray-600);
  transition: all 0.3s ease;
}

.user-avatar-wrapper:hover .dropdown-arrow {
  color: var(--primary);
  transform: translateY(2px);
}

/* Custom Dropdown Menu */
.custom-dropdown-menu {
  background: var(--white);
  border-radius: var(--radius-2xl);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  min-width: 280px;
  padding: 0;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.8);
  animation: dropdownSlide 0.3s ease-out;
}

@keyframes dropdownSlide {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.dropdown-header {
  padding: 1.25rem;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  border-bottom: 1px solid var(--gray-100);
}

.dropdown-user-info {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.dropdown-avatar {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  object-fit: cover;
  border: 2px solid var(--white);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.dropdown-user-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
}

.dropdown-username {
  font-weight: 700;
  font-size: 1rem;
  color: var(--gray-900);
  font-family: var(--font-display);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-user-email {
  font-size: 0.8125rem;
  color: var(--gray-600);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--gray-200), transparent);
  margin: 0.5rem 0;
}

.styled-menu {
  border: none;
  background: transparent;
  padding: 0.5rem 0.375rem;
}

:deep(.ant-menu-item) {
  background: transparent !important;
  border-radius: var(--radius-lg) !important;
  margin-bottom: 0.25rem !important;
  transition: all 0.2s ease !important;
  border: 1px solid transparent !important;
  padding: 0.75rem 0.875rem !important;
  height: auto !important;
  line-height: 1.5 !important;
}

:deep(.ant-menu-item:hover) {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%) !important;
  border-color: rgba(102, 126, 234, 0.2) !important;
  transform: translateX(4px) !important;
}

:deep(.ant-menu-item.logout-item:hover) {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.08) 100%) !important;
  border-color: rgba(239, 68, 68, 0.2) !important;
}

:deep(.ant-menu-item) {
  display: flex !important;
  align-items: center !important;
  padding: 0.75rem 0.875rem !important;
  height: auto !important;
  line-height: 1.5 !important;
}

.menu-item {
  display: flex !important;
  align-items: center !important;
  gap: 0.75rem !important;
  cursor: pointer !important;
  width: 100% !important;
}

.menu-icon {
  font-size: 1.25rem;
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: var(--gray-100);
  border-radius: var(--radius-lg);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

:deep(.ant-menu-item:hover) .menu-icon {
  background: var(--white);
  transform: scale(1.1);
}

.menu-text {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--gray-900);
  transition: color 0.2s ease;
  display: inline-block;
  vertical-align: middle;
}

:deep(.ant-menu-item.logout-item) .menu-text {
  color: var(--error);
}

/* Remove default Ant Design menu styles */
:deep(.ant-menu) {
  box-shadow: none !important;
}

:deep(.ant-menu-item)::after {
  display: none !important;
}

:deep(.ant-menu-item-selected) {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.12) 100%) !important;
}

:deep(.ant-dropdown) {
  padding-top: 8px !important;
}

/* Notification & Messages Styles */
.messages-wrapper {
  position: relative;
  margin-right: 1.25rem;
  display: flex;
  align-items: center;
}

.messages-icon {
  font-size: 24px;
  color: var(--gray-600);
  cursor: pointer;
  padding: 0.625rem;
  border-radius: var(--radius-full);
  transition: all 0.2s ease;
  position: relative;
}

.messages-icon:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
  color: var(--primary);
  transform: scale(1.05);
}

.messages-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: var(--radius-full);
  min-width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0 0.375rem;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  animation: pulse 2s infinite;
}

.notification-wrapper {
  position: relative;
  margin-right: 1.25rem;
  display: flex;
  align-items: center;
}

.notification-icon {
  font-size: 24px;
  color: var(--gray-600);
  cursor: pointer;
  padding: 0.625rem;
  border-radius: var(--radius-full);
  transition: all 0.2s ease;
  position: relative;
}

.notification-icon:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
  color: var(--primary);
  transform: scale(1.05);
}

.notification-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  background: linear-gradient(135deg, #ff6b6b 0%, #ff3040 100%);
  color: white;
  border-radius: var(--radius-full);
  min-width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0 0.375rem;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(17, 24, 39, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  padding: 1.25rem;
  animation: fadeIn 0.2s ease-out;
}

.modal-content {
  background: var(--white);
  border-radius: var(--radius-2xl);
  max-width: 640px;
  max-height: 85vh;
  width: 90%;
  position: relative;
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-close-btn {
  position: absolute;
  top: 1.25rem;
  right: 1.25rem;
  background: var(--gray-100);
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--gray-600);
  z-index: 10;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  transition: all 0.2s ease;
  font-weight: 300;
  line-height: 1;
}

.modal-close-btn:hover {
  background: var(--gray-200);
  color: var(--gray-900);
  transform: rotate(90deg);
}

/* ========== RESPONSIVE DESIGN ========== */

@media (max-width: 1024px) {
  .header {
    padding: 0.625rem 1.5rem;
    height: 60px;
  }

  .header__left {
    min-width: 140px;
  }

  .header__left p {
    font-size: 1.375rem;
  }

  .header__main {
    width: 50%;
  }

  .header__main-right input {
    width: 220px;
  }
}

@media (max-width: 768px) {
  .header {
    padding: 0.5rem 1rem;
    height: 56px;
  }

  .header__left {
    min-width: 100px;
  }

  .header__left p {
    font-size: 1.25rem;
  }

  .header__main {
    width: auto;
    flex: 1;
  }

  .header__main-right {
    margin-left: 0;
  }

  .header__main-right-search {
    margin-left: 0.5rem;
    margin-right: 0.5rem;
  }

  .header__main-right input {
    width: 160px;
    font-size: 0.875rem;
  }

  .header__main-right button {
    min-width: 110px;
    font-size: 0.8125rem;
    padding: 0.5rem 1rem;
  }

  .notification-wrapper {
    margin-right: 0.75rem;
  }

  .messages-wrapper {
    margin-right: 0.75rem;
  }

  .image-post__img {
    width: 36px;
    height: 36px;
  }

  .search-results {
    width: 300px;
    right: 0;
    left: auto;
  }
}

@media (max-width: 480px) {
  .header {
    padding: 0.5rem;
    height: 52px;
  }

  .header__left {
    min-width: 80px;
  }

  .header__left p {
    font-size: 1.125rem;
  }

  .header__main-right-search {
    display: none;
  }

  .header__main-right button {
    min-width: auto;
    padding: 0.5rem 0.875rem;
    font-size: 0.75rem;
  }

  .btn-imageadd {
    margin-left: 0.5rem;
  }

  .notification-wrapper {
    margin-right: 0.5rem;
  }

  .messages-wrapper {
    margin-right: 0.5rem;
  }

  .notification-icon {
    font-size: 22px;
    padding: 0.5rem;
  }

  .messages-icon {
    font-size: 22px;
    padding: 0.5rem;
  }

  .notification-badge,
  .messages-badge {
    min-width: 18px;
    height: 18px;
    font-size: 0.625rem;
  }

  .image-post__img {
    width: 32px;
    height: 32px;
  }

  .modal-content {
    width: 95%;
    max-height: 90vh;
    border-radius: var(--radius-xl);
  }

  .modal-close-btn {
    top: 0.875rem;
    right: 0.875rem;
    width: 32px;
    height: 32px;
    font-size: 1.25rem;
  }
}

@media (max-width: 360px) {
  .header__left p {
    font-size: 1rem;
  }

  .header__main-right button {
    font-size: 0.6875rem;
    padding: 0.4rem 0.75rem;
  }
}
</style>
