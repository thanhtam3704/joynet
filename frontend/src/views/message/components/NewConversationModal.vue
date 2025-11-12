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
            placeholder="Tìm kiếm bạn bè..."
            @input="filterFriends"
          />
          <i class="material-icons">search</i>
        </div>
        
        <div class="friends-list">
          <div 
            v-for="friend in filteredFriends" 
            :key="friend && friend._id ? friend._id : Math.random()"
            class="friend-item"
            @click="selectFriend(friend)"
          >
            <div class="friend-avatar">
              <img 
                v-if="friend && friend.profilePicture"
                :src="friend && friend.profilePicture ? `http://localhost:3000/uploads/user/${friend.profilePicture}` : ''" 
                alt="Avatar"
              />
              <img 
                v-else
                src="@/assets/defaultProfile.png" 
                alt="Default Avatar"
              />
            </div>
            <div class="friend-info">
              <div class="friend-name">{{ friend && friend.displayName || 'Unknown' }}</div>
              <div class="friend-email">{{ friend && friend.email || '' }}</div>
            </div>
          </div>
          
          <div v-if="filteredFriends.length === 0" class="no-friends">
            <p v-if="friends.length === 0">Bạn chưa có bạn bè nào</p>
            <p v-else>Không tìm thấy bạn bè phù hợp</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NewConversationModal',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    friends: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      searchQuery: '',
      filteredFriends: []
    };
  },
  watch: {
    friends: {
      immediate: true,
      handler() {
        this.filteredFriends = this.friends;
      }
    }
  },
  methods: {
    closeModal() {
      this.$emit('close');
      this.searchQuery = '';
    },
    
    filterFriends() {
      if (!this.searchQuery) {
        this.filteredFriends = this.friends;
        return;
      }
      
      const query = this.searchQuery.toLowerCase();
      this.filteredFriends = (this.friends || []).filter(friend => {
        if (!friend) return false;
        const displayName = friend.displayName || '';
        const email = friend.email || '';
        return displayName.toLowerCase().includes(query) ||
               email.toLowerCase().includes(query);
      });
    },
    
    selectFriend(friend) {
      if (friend && friend._id) {
        this.$emit('select-friend', friend._id);
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