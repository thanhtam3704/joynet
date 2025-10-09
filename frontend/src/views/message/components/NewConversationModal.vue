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
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 400px;
  max-height: 500px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f8e0e6;
  
  h3 {
    margin: 0;
    color: #e91e63;
    font-size: 18px;
  }
  
  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #e91e63;
    
    i {
      font-size: 24px;
    }
  }
}

.modal-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.search-box {
  position: relative;
  padding: 16px 20px;
  border-bottom: 1px solid #f8e0e6;
  
  input {
    width: 100%;
    padding: 10px 40px 10px 12px;
    border: 1px solid #f8e0e6;
    border-radius: 20px;
    outline: none;
    background-color: #fff9fb;
    
    &:focus {
      border-color: #f8bbd0;
      background-color: #fef1f6;
    }
  }
  
  i {
    position: absolute;
    right: 32px;
    top: 50%;
    transform: translateY(-50%);
    color: #e91e63;
  }
}

.friends-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: #f8bbd0;
    border-radius: 3px;
  }
}

.friend-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #fff9fb;
  }
}

.friend-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 12px;
  
  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }
}

.friend-info {
  flex: 1;
}

.friend-name {
  font-size: 14px;
  font-weight: 500;
  color: #262626;
  margin-bottom: 2px;
}

.friend-email {
  font-size: 12px;
  color: #8e8e8e;
}

.no-friends {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  color: #e91e63;
  
  p {
    margin: 0;
    font-size: 14px;
  }
}
</style>