<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-container">
      <div class="modal-header">
        <h3>Tin nhắn mới</h3>
        <i class="material-icons close-btn" @click="$emit('close')">close</i>
      </div>

      <div class="modal-search">
        <label>Đến:</label>
        <div class="search-input-wrapper">
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Nhập tên người nhận..."
            @input="searchUsers"
            ref="searchInput"
          />
        </div>
      </div>

      <div class="selected-users" v-if="selectedUsers.length > 0">
        <div 
          v-for="user in selectedUsers" 
          :key="user._id"
          class="selected-user-chip"
        >
          <img 
            v-if="user.profilePicture" 
            :src="user.profilePicture"
            :alt="user.displayName"
          />
          <img 
            v-else 
            src="@/assets/defaultProfile.png" 
            alt="Avatar"
          />
          <span>{{ user.displayName || user.email }}</span>
          <i class="material-icons remove-btn" @click="removeUser(user._id)">close</i>
        </div>
      </div>

      <div class="modal-body" @scroll="handleScroll">
        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <span>Đang tìm kiếm...</span>
        </div>

        <div v-else-if="searchResults.length === 0 && searchQuery" class="empty-state">
          <div class="empty-icon">🔍</div>
          <p>Không tìm thấy người dùng</p>
        </div>

        <div v-else-if="searchQuery" class="users-list">
          <div 
            v-for="user in searchResults" 
            :key="user._id"
            class="user-item"
            :class="{ 'selected': isUserSelected(user._id) }"
            @click="toggleUser(user)"
          >
            <img 
              v-if="user.profilePicture" 
              :src="user.profilePicture"
              :alt="user.displayName"
              class="user-avatar"
            />
            <img 
              v-else 
              src="@/assets/defaultProfile.png" 
              alt="Avatar"
              class="user-avatar"
            />
            <div class="user-info">
              <span class="user-name">{{ user.displayName || user.email }}</span>
              <span class="user-email" v-if="user.displayName">{{ user.email }}</span>
            </div>
            <i v-if="isUserSelected(user._id)" class="material-icons check-icon">check_circle</i>
          </div>
        </div>

        <div v-else class="suggestions">
          <h4>Gợi ý</h4>
          
          <div v-if="loading && suggestedUsers.length === 0" class="loading-skeleton">
            <div class="user-skeleton" v-for="i in 6" :key="'skeleton-' + i">
              <Skeletor circle width="48" height="48" />
              <div class="skeleton-text">
                <Skeletor width="120" height="14" />
                <Skeletor width="80" height="10" style="margin-top: 4px;" />
              </div>
            </div>
          </div>
          
          <div v-else class="users-list">
            <div 
              v-for="user in suggestedUsers" 
              :key="user._id"
              class="user-item"
              @click="toggleUser(user)"
            >
              <img 
                v-if="user.profilePicture" 
                :src="user.profilePicture"
                :alt="user.displayName"
                class="user-avatar"
              />
              <img 
                v-else 
                src="@/assets/defaultProfile.png" 
                alt="Avatar"
                class="user-avatar"
              />
              <div class="user-info">
                <span class="user-name">{{ user.displayName || user.email }}</span>
                <span class="user-email" v-if="user.displayName">{{ user.email }}</span>
              </div>
            </div>
            
            <!-- Loading more -->
            <div v-if="loadingMore" class="loading-more">
              <div class="user-skeleton" v-for="i in 3" :key="'loading-' + i">
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
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" @click="$emit('close')">Hủy</button>
        <button 
          class="btn-create" 
          :disabled="selectedUsers.length === 0"
          @click="createConversation"
        >
          Nhắn tin
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { Skeletor } from 'vue-skeletor';
import MessageAPI from '@/api/messages'

export default {
  name: 'NewMessageModal',
  components: { Skeletor },
  data() {
    return {
      searchQuery: '',
      searchResults: [],
      suggestedUsers: [],
      selectedUsers: [],
      loading: false,
      loadingMore: false,
      searchTimeout: null,
      limit: 20,
      offset: 0,
      hasMore: true
    }
  },
  mounted() {
    this.$refs.searchInput?.focus()
    this.loadSuggestedUsers()
  },
  methods: {
    async searchUsers() {
      if (!this.searchQuery || this.searchQuery.trim().length === 0) {
        this.searchResults = []
        return
      }

      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout)
      }

      this.searchTimeout = setTimeout(async () => {
        this.loading = true
        try {
          const { getAllUsers } = await import('@/api/users')
          const response = await getAllUsers()
          
          if (response.status === 200) {
            const currentUserId = this.$store.state.user?._id
            const query = this.searchQuery.toLowerCase().trim()
            
            this.searchResults = response.data
              .filter(user => {
                // Loại bỏ current user
                if (user._id === currentUserId) return false
                
                const name = (user.displayName || '').toLowerCase()
                const email = (user.email || '').toLowerCase()
                
                return name.includes(query) || email.includes(query)
              })
              .slice(0, 10)
          }
        } catch (error) {
          console.error('Search users error:', error)
        } finally {
          this.loading = false
        }
      }, 300)
    },

    async loadSuggestedUsers() {
      if (this.loading || this.loadingMore || !this.hasMore) return;
      
      this.loading = this.offset === 0;
      this.loadingMore = this.offset > 0;
      
      try {
        const currentUserId = this.$store.state.user?._id
        
        // 1. Lấy danh sách người liên hệ (contacts) với pagination
        const { getSuggestedContacts } = await import('@/api/users')
        const contactsResponse = await getSuggestedContacts(this.limit, this.offset)
        const newContacts = contactsResponse.data.users || []
        
        console.log(`✅ Got ${newContacts.length} contacts from API (offset: ${this.offset})`)
        
        // 2. Lấy danh sách conversations (người đã từng nhắn tin) - chỉ lần đầu
        let conversationUsers = []
        if (this.offset === 0) {
          const conversations = this.$store.state.conversations || []
          conversationUsers = conversations
            .map(conv => conv.participants?.[0])
            .filter(user => user && user._id !== currentUserId)
        }
        
        // 3. Kết hợp và loại bỏ trùng lặp
        const allUsersMap = new Map()
        
        // Thêm existing users vào map
        this.suggestedUsers.forEach(user => {
          allUsersMap.set(user._id, user)
        })
        
        // Thêm conversation users (ưu tiên cao hơn) - chỉ lần đầu
        conversationUsers.forEach(user => {
          if (!allUsersMap.has(user._id)) {
            allUsersMap.set(user._id, { ...user, priority: 1 })
          }
        })
        
        // Thêm contacts
        newContacts.forEach(user => {
          if (!allUsersMap.has(user._id)) {
            allUsersMap.set(user._id, { ...user, priority: 2 })
          }
        })
        
        // Chuyển thành array và sắp xếp
        const sortedUsers = Array.from(allUsersMap.values())
          .sort((a, b) => {
            if (a.priority !== b.priority) {
              return a.priority - b.priority
            }
            const aTime = a.lastSeen ? new Date(a.lastSeen).getTime() : 0
            const bTime = b.lastSeen ? new Date(b.lastSeen).getTime() : 0
            return bTime - aTime
          })
        
        this.suggestedUsers = sortedUsers
        this.offset += newContacts.length
        this.hasMore = contactsResponse.data.hasMore || false
        
        console.log('Suggested users loaded:', this.suggestedUsers.length, 'hasMore:', this.hasMore)
      } catch (error) {
        console.error('Load suggested users error:', error)
      } finally {
        this.loading = false
        this.loadingMore = false
      }
    },
    
    handleScroll(event) {
      const element = event.target
      const scrollTop = element.scrollTop
      const scrollHeight = element.scrollHeight
      const clientHeight = element.clientHeight
      
      // Chỉ load more khi không đang search
      if (scrollTop + clientHeight >= scrollHeight - 100 && !this.searchQuery) {
        console.log('🔄 Loading more suggested users...')
        this.loadSuggestedUsers()
      }
    },

    toggleUser(user) {
      const index = this.selectedUsers.findIndex(u => u._id === user._id)
      
      if (index !== -1) {
        this.selectedUsers.splice(index, 1)
      } else {
        // Chỉ cho phép chọn 1 người (như Facebook)
        this.selectedUsers = [user]
      }
    },

    removeUser(userId) {
      this.selectedUsers = this.selectedUsers.filter(u => u._id !== userId)
    },

    isUserSelected(userId) {
      return this.selectedUsers.some(u => u._id === userId)
    },

    async createConversation() {
      if (this.selectedUsers.length === 0) return

      try {
        const targetUser = this.selectedUsers[0]
        const response = await MessageAPI.createOrGetConversation(targetUser._id)
        
        if (response.status === 200) {
          const conversation = {
            ...response.data,
            participant: targetUser
          }
          
          // Emit event để mở chat popup
          this.$emit('open-chat', conversation)
          this.$emit('close')
        }
      } catch (error) {
        console.error('Create conversation error:', error)
      }
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  backdrop-filter: blur(4px);
}

.modal-container {
  background: white;
  border-radius: 16px;
  width: 500px;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: #1f2937;
}

.close-btn {
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s ease;
  padding: 0.25rem;
  border-radius: 50%;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.modal-search {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-search label {
  font-weight: 600;
  color: #374151;
  flex-shrink: 0;
}

.search-input-wrapper {
  flex: 1;
}

.search-input-wrapper input {
  width: 100%;
  border: none;
  outline: none;
  font-size: 0.9375rem;
  color: #1f2937;
}

.search-input-wrapper input::placeholder {
  color: #9ca3af;
}

.selected-users {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
  max-height: 120px;
  overflow-y: auto;
}

.selected-user-chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.625rem;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border-radius: 20px;
  border: 1px solid rgba(102, 126, 234, 0.3);
}

.selected-user-chip img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.selected-user-chip span {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.remove-btn {
  font-size: 16px;
  cursor: pointer;
  color: #6b7280;
  transition: color 0.2s ease;
}

.remove-btn:hover {
  color: #ef4444;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 0;
  min-height: 300px;
  max-height: 400px;
}

.modal-body::-webkit-scrollbar {
  width: 6px;
}

.modal-body::-webkit-scrollbar-track {
  background: transparent;
}

.modal-body::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: #6b7280;
  gap: 0.75rem;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 3rem;
  opacity: 0.5;
}

.suggestions h4 {
  margin: 0 0 0.75rem 0;
  padding: 0 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.loading-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0 1.25rem;
}

.user-skeleton {
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

.users-list {
  display: flex;
  flex-direction: column;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.75rem 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.user-item:hover {
  background: #f9fafb;
}

.user-item.selected {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.user-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.9375rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  font-size: 0.8125rem;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.check-icon {
  color: #667eea;
  font-size: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid #e5e7eb;
}

.btn-cancel,
.btn-create {
  padding: 0.625rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-cancel {
  background: #f3f4f6;
  color: #374151;
}

.btn-cancel:hover {
  background: #e5e7eb;
}

.btn-create {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 6px -1px rgba(102, 126, 234, 0.3);
}

.btn-create:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px -5px rgba(102, 126, 234, 0.4);
}

.btn-create:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .modal-container {
    width: 95vw;
  }
}
</style>
