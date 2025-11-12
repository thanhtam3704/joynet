<template>
  <teleport to="body">
    <div class="modal-overlay" @click.self="closeModal">
      <div class="modal-container">
        <div class="modal-header">
          <h2>Tạo nhóm chat mới</h2>
          <button class="close-btn" @click="closeModal">×</button>
        </div>

        <div class="modal-body">
          <!-- Group Name Input -->
          <div class="form-group">
            <label>Tên nhóm *</label>
            <input 
              type="text" 
              v-model="groupName" 
              placeholder="Nhập tên nhóm..."
              maxlength="100"
              @keypress.enter="createGroup"
            />
            <span class="char-count">{{ groupName.length }}/100</span>
          </div>

          <!-- Search Friends -->
          <div class="form-group">
            <label>Thêm thành viên (tối thiểu 2 người)</label>
            <div class="search-box">
              <i class="material-icons">search</i>
              <input 
                type="text" 
                v-model="searchQuery" 
                placeholder="Tìm kiếm bạn bè..."
              />
            </div>
          </div>

          <!-- Selected Members -->
          <div v-if="selectedMembers.length > 0" class="selected-members">
            <div class="selected-label">
              Đã chọn ({{ selectedMembers.length }})
            </div>
            <div class="selected-chips">
              <div 
                v-for="member in selectedMembers" 
                :key="member._id"
                class="member-chip"
              >
                <img 
                  :src="member.profilePicture ? `http://localhost:3000/uploads/user/${member.profilePicture}` : require('@/assets/defaultProfile.png')" 
                  :alt="member.displayName"
                />
                <span>{{ member.displayName || member.email }}</span>
                <i class="material-icons" @click="removeMember(member._id)">close</i>
              </div>
            </div>
          </div>

          <!-- Friends List -->
          <div class="friends-list">
            <div v-if="loading" class="loading">
              <div class="spinner"></div>
              <span>Đang tải danh sách bạn bè...</span>
            </div>

            <div v-else-if="friends.length === 0" class="empty-state">
              <i class="material-icons">people_outline</i>
              <p>Chưa có bạn bè nào</p>
              <p class="empty-hint">Hãy theo dõi (follow) người dùng khác trước để tạo nhóm chat</p>
            </div>

            <div v-else-if="filteredFriends.length === 0 && searchQuery" class="empty-state">
              <i class="material-icons">search_off</i>
              <p>Không tìm thấy "{{ searchQuery }}"</p>
            </div>

            <div v-else class="friends-scroll">
              <div 
                v-for="friend in filteredFriends" 
                :key="friend._id"
                class="friend-item"
                :class="{ 'selected': isSelected(friend._id) }"
                @click="toggleMember(friend)"
              >
                <img 
                  :src="friend.profilePicture ? `http://localhost:3000/uploads/user/${friend.profilePicture}` : require('@/assets/defaultProfile.png')" 
                  :alt="friend.displayName"
                />
                <div class="friend-info">
                  <span class="friend-name">{{ friend.displayName || friend.email }}</span>
                  <span class="friend-email">{{ friend.email }}</span>
                </div>
                <i class="material-icons check-icon">
                  {{ isSelected(friend._id) ? 'check_circle' : 'radio_button_unchecked' }}
                </i>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" @click="closeModal">Hủy</button>
          <button 
            class="btn-create" 
            @click="createGroup"
            :disabled="!canCreate"
          >
            Tạo nhóm
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script>
import MessageAPI from '@/api/messages';
import GroupMessageAPI from '@/api/groupMessages';

export default {
  name: 'CreateGroupModal',
  data() {
    return {
      groupName: '',
      searchQuery: '',
      friends: [],
      selectedMembers: [],
      loading: false
    };
  },
  computed: {
    filteredFriends() {
      if (!this.searchQuery.trim()) {
        return this.friends;
      }
      const query = this.searchQuery.toLowerCase();
      return this.friends.filter(friend => {
        const name = (friend.displayName || '').toLowerCase();
        const email = (friend.email || '').toLowerCase();
        return name.includes(query) || email.includes(query);
      });
    },
    canCreate() {
      return this.groupName.trim().length > 0 && this.selectedMembers.length >= 2;
    }
  },
  methods: {
    async loadFriends() {
      this.loading = true;
      try {
        console.log('🔍 Loading friends...');
        const response = await MessageAPI.getFriends();
        console.log('📥 Friends response:', response);
        console.log('📥 Friends data:', response.data);
        
        if (response.status === 200) {
          this.friends = response.data || [];
          console.log('✅ Friends loaded:', this.friends.length, 'friends');
        }
      } catch (error) {
        console.error('❌ Load friends error:', error);
        console.error('Error response:', error.response);
      } finally {
        this.loading = false;
      }
    },
    
    toggleMember(friend) {
      const index = this.selectedMembers.findIndex(m => m._id === friend._id);
      if (index !== -1) {
        this.selectedMembers.splice(index, 1);
      } else {
        this.selectedMembers.push(friend);
      }
    },
    
    removeMember(memberId) {
      const index = this.selectedMembers.findIndex(m => m._id === memberId);
      if (index !== -1) {
        this.selectedMembers.splice(index, 1);
      }
    },
    
    isSelected(memberId) {
      return this.selectedMembers.some(m => m._id === memberId);
    },
    
    async createGroup() {
      if (!this.canCreate) {
        return;
      }

      try {
        const memberIds = this.selectedMembers.map(m => m._id);
        const response = await GroupMessageAPI.createGroup(this.groupName, memberIds);
        
        if (response.status === 201) {
          this.$emit('group-created', response.data);
          this.$store.dispatch('loadConversations'); // Reload conversations
          this.closeModal();
        }
      } catch (error) {
        console.error('Create group error:', error);
        alert('Không thể tạo nhóm. Vui lòng thử lại!');
      }
    },
    
    closeModal() {
      this.$emit('close');
    }
  },
  mounted() {
    this.loadFriends();
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.modal-container {
  background: white;
  border-radius: 20px;
  width: 90%;
  max-width: 500px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid var(--gray-200);
}

.modal-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--gray-900);
  margin: 0;
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  border: none;
  background: var(--gray-100);
  color: var(--gray-600);
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--gray-200);
  color: var(--gray-900);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: var(--gray-700);
  font-size: 0.875rem;
}

.form-group input {
  padding: 0.75rem 1rem;
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-lg);
  font-size: 0.9375rem;
  transition: all 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary);
}

.char-count {
  font-size: 0.75rem;
  color: var(--gray-500);
  text-align: right;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-box i {
  position: absolute;
  left: 1rem;
  color: var(--gray-400);
}

.search-box input {
  padding-left: 3rem !important;
}

.selected-members {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  border-radius: var(--radius-lg);
  padding: 1rem;
}

.selected-label {
  font-weight: 600;
  color: var(--primary);
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
}

.selected-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.member-chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: white;
  border: 2px solid var(--primary);
  border-radius: var(--radius-full);
  padding: 0.375rem 0.75rem 0.375rem 0.375rem;
}

.member-chip img {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  object-fit: cover;
}

.member-chip span {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--primary);
}

.member-chip i {
  font-size: 18px;
  color: var(--primary);
  cursor: pointer;
  transition: all 0.2s;
}

.member-chip i:hover {
  color: var(--error);
}

.friends-list {
  flex: 1;
  min-height: 300px;
  max-height: 400px;
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.loading, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  gap: 1rem;
  color: var(--gray-500);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--gray-200);
  border-top-color: var(--primary);
  border-radius: var(--radius-full);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state i {
  font-size: 3rem;
  opacity: 0.3;
}

.empty-hint {
  font-size: 0.8125rem;
  color: var(--gray-500);
  margin-top: 0.5rem;
}

.friends-scroll {
  overflow-y: auto;
  max-height: 400px;
}

.friend-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 1px solid var(--gray-100);
}

.friend-item:hover {
  background: var(--gray-50);
}

.friend-item.selected {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
}

.friend-item img {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  object-fit: cover;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.friend-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.friend-name {
  font-weight: 600;
  color: var(--gray-900);
  font-size: 0.9375rem;
}

.friend-email {
  font-size: 0.8125rem;
  color: var(--gray-500);
}

.check-icon {
  color: var(--gray-300);
  transition: all 0.2s;
}

.friend-item.selected .check-icon {
  color: var(--primary);
}

.modal-footer {
  display: flex;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid var(--gray-200);
}

.btn-cancel, .btn-create {
  flex: 1;
  padding: 0.875rem 1.5rem;
  border-radius: var(--radius-lg);
  font-weight: 600;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-cancel {
  background: var(--gray-100);
  color: var(--gray-700);
}

.btn-cancel:hover {
  background: var(--gray-200);
}

.btn-create {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-create:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.btn-create:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
