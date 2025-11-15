<template>
  <Teleport to="body">
    <div v-if="isVisible" class="calling-modal-overlay" @click="cancelCall">
      <div class="calling-modal" @click.stop>
        <!-- Avatar -->
        <div class="calling-avatar">
          <img 
            v-if="recipientAvatar" 
            :src="`http://localhost:3000/uploads/user/${recipientAvatar}`" 
            alt="Avatar"
          />
          <div v-else class="default-avatar">
            <i class="material-icons">{{ isGroupCall ? 'groups' : 'person' }}</i>
          </div>
        </div>

        <!-- Recipient Name -->
        <h2 class="recipient-name">{{ recipientName || 'Người dùng' }}</h2>
        
        <!-- Status -->
        <p class="calling-status">Đang gọi...</p>

        <!-- Animated Calling Rings -->
        <div class="calling-rings">
          <div class="ring ring-1"></div>
          <div class="ring ring-2"></div>
          <div class="ring ring-3"></div>
        </div>

        <!-- Cancel Button -->
        <button @click="cancelCall" class="cancel-call-btn">
          <i class="material-icons">call_end</i>
          <span>Hủy cuộc gọi</span>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script>
export default {
  name: 'CallingModal',
  emits: ['cancel'],
  props: {
    recipientName: {
      type: String,
      default: ''
    },
    recipientAvatar: {
      type: String,
      default: ''
    },
    isGroupCall: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      isVisible: false
    };
  },
  methods: {
    show() {
      this.isVisible = true;
    },
    hide() {
      this.isVisible = false;
    },
    cancelCall() {
      this.$emit('cancel');
      this.hide();
    }
  }
};
</script>

<style scoped>
.calling-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(10px);
}

.calling-modal {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 3rem 2rem;
  text-align: center;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.calling-avatar {
  width: 120px;
  height: 120px;
  margin: 0 auto 1.5rem;
  border-radius: 50%;
  overflow: hidden;
  position: relative;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
  border: 3px solid rgba(102, 126, 234, 0.3);
}

.calling-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.default-avatar {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.default-avatar .material-icons {
  font-size: 60px;
  color: white;
}

.recipient-name {
  font-size: 1.75rem;
  font-weight: 700;
  color: white;
  margin: 0 0 0.5rem;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.calling-status {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 2rem;
  font-weight: 500;
}

/* Animated Calling Rings */
.calling-rings {
  position: relative;
  width: 100px;
  height: 100px;
  margin: 2rem auto;
}

.ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  border: 3px solid rgba(102, 126, 234, 0.6);
  border-radius: 50%;
  animation: pulse 2s ease-out infinite;
}

.ring-1 {
  animation-delay: 0s;
}

.ring-2 {
  animation-delay: 0.6s;
}

.ring-3 {
  animation-delay: 1.2s;
}

@keyframes pulse {
  0% {
    transform: translate(-50%, -50%) scale(0.5);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(2);
    opacity: 0;
  }
}

/* Cancel Button */
.cancel-call-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 2rem;
  background: linear-gradient(135deg, #ff4757, #e84118);
  border: none;
  border-radius: 30px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 20px rgba(255, 71, 87, 0.4);
  margin-top: 1rem;
}

.cancel-call-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(255, 71, 87, 0.5);
  background: linear-gradient(135deg, #ff6b81, #ff4757);
}

.cancel-call-btn:active {
  transform: translateY(0);
}

.cancel-call-btn .material-icons {
  font-size: 20px;
}

/* Responsive */
@media (max-width: 480px) {
  .calling-modal {
    padding: 2rem 1.5rem;
  }

  .calling-avatar {
    width: 100px;
    height: 100px;
  }

  .recipient-name {
    font-size: 1.5rem;
  }

  .calling-status {
    font-size: 0.9rem;
  }
}
</style>
