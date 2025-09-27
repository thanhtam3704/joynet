<template>
  <div class="chat-header">
    <div class="chat-header-user">
      <div class="chat-header-avatar">
        <img 
          v-if="conversation.recipientAvatar"
          :src="`http://localhost:3000/uploads/user/${conversation.recipientAvatar}`" 
          alt="Avatar"
        />
        <img 
          v-else
          src="@/assets/defaultProfile.png" 
          alt="Default Avatar"
        />
      </div>
      <div class="chat-header-info">
        <div class="chat-header-name">{{ conversation.recipientName }}</div>
        <div class="chat-header-status">Hoạt động gần đây</div>
      </div>
    </div>
    <div class="chat-header-actions">
      <button class="chat-header-button">
        <i class="material-icons">phone</i>
      </button>
      <button class="chat-header-button">
        <i class="material-icons">videocam</i>
      </button>
      <button class="chat-header-button">
        <i class="material-icons">info</i>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ChatHeader',
  props: {
    conversation: {
      type: Object,
      required: true
    }
  }
};
</script>

<style lang="scss" scoped>
.chat-header {
  height: 60px;
  border-bottom: 1px solid #f8e0e6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background-color: #fef1f6;
}

.chat-header-user {
  display: flex;
  align-items: center;
}

.chat-header-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-right: 12px;
  
  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }
}

.chat-header-info {
  display: flex;
  flex-direction: column;
}

.chat-header-name {
  font-size: 16px;
  font-weight: 600;
}

.chat-header-status {
  font-size: 12px;
  color: #ec407a;
}

.chat-header-actions {
  display: flex;
  gap: 16px;
}

.chat-header-button {
  background: none;
  border: none;
  cursor: pointer;
  color: #e91e63;
  font-size: 24px;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: #f06292;
  }
}


</style>