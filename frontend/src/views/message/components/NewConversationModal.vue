<template>
  <div class="new-conversation-modal" v-if="show" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Tin nhắn mới</h3>
        <button @click="closeModal" class="close-btn">
          <i class="material-icons">close</i>
        </button>
      </div>
      
      <div class="modal-body">
        <div class="search-box">
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Tìm kiếm người liên hệ..."
            @input="handleSearch"
            ref="searchInput"
          />
          <i class="material-icons">search</i>
        </div>
        
        <div class="friends-list" @scroll="handleScroll" ref="friendsList">
          <!-- Loading initial -->
          <div v-if="loading && suggestedUsers.length === 0" class="loading-skeleton">
            <div class="friend-skeleton" v-for="i in 6" :key="'skeleton-' + i">
              <Skeletor circle width="48" height="48" />
              <div class="skeleton-text">
                <Skeletor width="120" height="14" />
                <Skeletor width="80" height="10" style="margin-top: 4px;" />
              </div>
            </div>
          </div>
          
          <!-- Search results -->
          <template v-else-if="searchQuery">
            <div v-if="searchResults.length === 0" class="no-friends">
              <p>Không tìm thấy người dùng</p>
            </div>
            <div 
              v-else
              v-for="user in searchResults" 
              :key="user._id"
              class="friend-item"
              @click="selectFriend(user)"
            >
              <div class="friend-avatar">
                <img 
                  v-if="user.profilePicture"
                  :src="user.profilePicture" 
                  alt="Avatar"
                />
                <img 
                  v-else
                  src="@/assets/defaultProfile.png" 
                  alt="Default Avatar"
                />
              </div>
              <div class="friend-info">
                <div class="friend-name">{{ user.displayName || user.email }}</div>
                <div class="friend-email">{{ user.email }}</div>
              </div>
            </div>
          </template>
          
          <!-- Suggested users -->
          <template v-else>
            <div 
              v-for="user in suggestedUsers" 
              :key="user._id"
              class="friend-item"
              @click="selectFriend(user)"
            >
              <div class="friend-avatar">
                <img 
                  v-if="user.profilePicture"
                  :src="user.profilePicture" 
                  alt="Avatar"
                />
                <img 
                  v-else
                  src="@/assets/defaultProfile.png" 
                  alt="Default Avatar"
                />
              </div>
              <div class="friend-info">
                <div class="friend-name">{{ user.displayName || user.email }}</div>
                <div class="friend-email" v-if="user.displayName">{{ user.email }}</div>
              </div>
            </div>
            
            <!-- Loading more -->
            <div v-if="loadingMore" class="loading-more">
              <div class="friend-skeleton" v-for="i in 3" :key="'loading-' + i">
                <Skeletor circle width="48" height="48" />
                <div class="skeleton-text">
                  <Skeletor width="120" height="14" />
                </div>
              </div>
            </div>
            
            <!-- End indicator -->
            <div v-else-if="!hasMore && suggestedUsers.length > 0" class="no-more">
              <span>Đã hiển thị tất cả</span>
            </div>
            
            <!-- Empty state -->
            <div v-if="!loading && suggestedUsers.length === 0" class="no-friends">
              <p>Chưa có người liên hệ nào</p>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Skeletor } from 'vue-skeletor';

export default {
  name: 'NewConversationModal',
  components: { Skeletor },
  props: {
    show: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      searchQuery: '',
      searchResults: [],
      suggestedUsers: [],
      loading: false,
      loadingMore: false,
      searchTimeout: null,
      limit: 20,
      offset: 0,
      hasMore: true
    };
  },
  watch: {
    show(newVal) {
      if (newVal) {
        this.resetAndLoad();
        this.$nextTick(() => {
          this.$refs.searchInput?.focus();
        });
      }
    }
  },
  methods: {
    resetAndLoad() {
      this.searchQuery = '';
      this.searchResults = [];
      this.suggestedUsers = [];
      this.offset = 0;
      this.hasMore = true;
      this.loadSuggestedUsers();
    },
    
    closeModal() {
      this.$emit('close');
      this.searchQuery = '';
    },
    
    handleSearch() {
      if (!this.searchQuery || this.searchQuery.trim().length === 0) {
        this.searchResults = [];
        return;
      }

      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }

      this.searchTimeout = setTimeout(async () => {
        this.loading = true;
        try {
          const { getAllUsers } = await import('@/api/users');
          const response = await getAllUsers();
          
          if (response.status === 200) {
            const currentUserId = this.$store.state.user?._id;
            const query = this.searchQuery.toLowerCase().trim();
            
            this.searchResults = response.data
              .filter(user => {
                if (user._id === currentUserId) return false;
                
                const name = (user.displayName || '').toLowerCase();
                const email = (user.email || '').toLowerCase();
                
                return name.includes(query) || email.includes(query);
              })
              .slice(0, 10);
          }
        } catch (error) {
          console.error('Search users error:', error);
        } finally {
          this.loading = false;
        }
      }, 300);
    },
    
    async loadSuggestedUsers() {
      if (this.loading || this.loadingMore || !this.hasMore) return;
      
      this.loading = this.offset === 0;
      this.loadingMore = this.offset > 0;
      
      try {
        const currentUserId = this.$store.state.user?._id;
        
        // Lấy danh sách người liên hệ với pagination
        const { getSuggestedContacts } = await import('@/api/users');
        const contactsResponse = await getSuggestedContacts(this.limit, this.offset);
        const newContacts = contactsResponse.data.users || [];
        
        console.log(`✅ Got ${newContacts.length} contacts from API (offset: ${this.offset})`);
        
        // Lấy conversations - chỉ lần đầu
        let conversationUsers = [];
        if (this.offset === 0) {
          const conversations = this.$store.state.conversations || [];
          conversationUsers = conversations
            .map(conv => conv.participants?.[0])
            .filter(user => user && user._id !== currentUserId);
        }
        
        // Kết hợp và loại bỏ trùng lặp
        const allUsersMap = new Map();
        
        // Thêm existing users
        this.suggestedUsers.forEach(user => {
          allUsersMap.set(user._id, user);
        });
        
        // Thêm conversation users (ưu tiên cao hơn)
        conversationUsers.forEach(user => {
          if (!allUsersMap.has(user._id)) {
            allUsersMap.set(user._id, { ...user, priority: 1 });
          }
        });
        
        // Thêm contacts
        newContacts.forEach(user => {
          if (!allUsersMap.has(user._id)) {
            allUsersMap.set(user._id, { ...user, priority: 2 });
          }
        });
        
        // Sắp xếp
        const sortedUsers = Array.from(allUsersMap.values())
          .sort((a, b) => {
            if (a.priority !== b.priority) {
              return a.priority - b.priority;
            }
            const aTime = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
            const bTime = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
            return bTime - aTime;
          });
        
        this.suggestedUsers = sortedUsers;
        this.offset += newContacts.length;
        this.hasMore = contactsResponse.data.hasMore || false;
        
        console.log('Suggested users loaded:', this.suggestedUsers.length, 'hasMore:', this.hasMore);
      } catch (error) {
        console.error('Load suggested users error:', error);
      } finally {
        this.loading = false;
        this.loadingMore = false;
      }
    },
    
    handleScroll(event) {
      const element = event.target;
      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight;
      const clientHeight = element.clientHeight;
      
      // Load more khi scroll gần đến cuối và không đang search
      if (scrollTop + clientHeight >= scrollHeight - 100 && !this.searchQuery) {
        console.log('🔄 Loading more suggested users...');
        this.loadSuggestedUsers();
      }
    },
    
    selectFriend(user) {
      if (user && user._id) {
        this.$emit('select-friend', user._id);
      }
      this.closeModal();
    }
  }
};
</script>

<style lang="scss" scoped>
.new-conversation-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(17, 24, 39, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  animation: fadeIn 0.2s ease;
}

.modal-content {
  background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%);
  border-radius: 16px;
  width: 100%;
  max-width: 440px;
  max-height: 600px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25),
              0 0 0 1px rgba(226, 232, 240, 0.6);
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%);
  
  h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  
  .close-btn {
    background: #f1f5f9;
    border: none;
    cursor: pointer;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    
    i {
      font-size: 24px;
      color: #64748b;
    }
    
    &:hover {
      background: #e2e8f0;
      transform: rotate(90deg);
      
      i {
        color: #475569;
      }
    }
  }
}

.modal-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: white;
}

.search-box {
  position: relative;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(226, 232, 240, 0.5);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.02) 0%, rgba(118, 75, 162, 0.02) 100%);
  
  input {
    width: 100%;
    padding: 0.75rem 2.75rem 0.75rem 1rem;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    outline: none;
    background-color: white;
    font-size: 0.9375rem;
    transition: all 0.2s ease;
    
    &:focus {
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    
    &::placeholder {
      color: #94a3b8;
    }
  }
  
  i {
    position: absolute;
    right: 2rem;
    top: 50%;
    transform: translateY(-50%);
    color: #667eea;
    font-size: 20px;
  }
}

.friends-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #5568d3 0%, #63428b 100%);
  }
}

.friend-item {
  display: flex;
  align-items: center;
  padding: 0.875rem 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid rgba(226, 232, 240, 0.3);
  
  &:hover {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
    transform: translateX(4px);
  }
  
  &:last-child {
    border-bottom: none;
  }
}

.friend-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  margin-right: 14px;
  border: 2px solid rgba(102, 126, 234, 0.1);
  transition: border-color 0.2s ease;
  flex-shrink: 0;
  
  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }
  
  .friend-item:hover & {
    border-color: rgba(102, 126, 234, 0.3);
  }
}

.friend-info {
  flex: 1;
  min-width: 0;
}

.friend-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.friend-email {
  font-size: 0.8125rem;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.no-friends {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 180px;
  color: #94a3b8;
  
  p {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 500;
  }
}

.loading-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
}

.friend-skeleton {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.75rem 0;
}

.skeleton-text {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.loading-more {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0 1.25rem;
}

.no-more {
  text-align: center;
  padding: 1rem;
  color: #9ca3af;
  font-size: 0.75rem;
  font-style: italic;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(30px) scale(0.95);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

/* Responsive */
@media (max-width: 480px) {
  .modal-content {
    max-width: 100%;
    border-radius: 12px;
    max-height: 85vh;
  }
  
  .modal-header {
    padding: 1rem 1.25rem;
    
    h3 {
      font-size: 1.125rem;
    }
  }
  
  .search-box {
    padding: 0.875rem 1rem;
    
    input {
      font-size: 0.875rem;
      padding: 0.625rem 2.5rem 0.625rem 0.875rem;
    }
    
    i {
      right: 1.5rem;
      font-size: 18px;
    }
  }
  
  .friend-item {
    padding: 0.75rem 1rem;
  }
  
  .friend-avatar {
    width: 44px;
    height: 44px;
    margin-right: 12px;
  }
}
</style>