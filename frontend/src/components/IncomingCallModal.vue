<template>
  <teleport to="body">
    <div v-if="isVisible" class="incoming-call-overlay" @click.self="handleOverlayClick">
      <div class="incoming-call-modal">
        <button class="close-btn" @click="reject">&times;</button>
        
        <div class="call-header">
          <h2>Cuộc gọi đến</h2>
        </div>
        
        <div class="caller-info">
          <img 
            :src="callerAvatar || require('@/assets/defaultProfile.png')" 
            :alt="callerName" 
            class="caller-avatar"
            @error="handleImageError"
          >
          <h3 class="caller-name">{{ callerName }} đang gọi cho bạn</h3>
          <p class="call-type">
            <span class="lock-icon">🔒</span>
            {{ isGroupCall ? 'Cuộc gọi video nhóm' : 'Được mã hóa đầu cuối' }}
          </p>
        </div>
        
        <div class="call-actions">
          <button class="reject-btn" @click="reject">
            <span class="btn-icon">✕</span>
            <span class="btn-label">Từ chối</span>
          </button>
          <button class="accept-btn" @click="accept">
            <span class="btn-icon">📞</span>
            <span class="btn-label">Chấp nhận</span>
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script>
export default {
  name: 'IncomingCallModal',
  emits: ['accept', 'reject'],
  props: {
    callerName: {
      type: String,
      default: 'Unknown Caller'
    },
    callerAvatar: {
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
      isVisible: false,
      callTimeout: null
    }
  },
  methods: {
    show() {
      console.log('🔔 [IncomingCallModal] Showing modal');
      this.isVisible = true;
      
      // Set timeout 45 seconds - silently dismiss if not answered (caller will create missed call message)
      this.callTimeout = setTimeout(() => {
        console.log('⏱️ [IncomingCallModal] Call timeout - silently dismissing after 45s');
        this.hide(); // Just hide, don't emit reject to avoid duplicate messages
      }, 45000);
    },
    hide() {
      console.log('🔕 [IncomingCallModal] Hiding modal');
      this.isVisible = false;
      
      // Clear timeout
      if (this.callTimeout) {
        clearTimeout(this.callTimeout);
        this.callTimeout = null;
      }
    },
    accept() {
      console.log('✅ [IncomingCallModal] Accept clicked');
      this.$emit('accept');
      this.hide();
    },
    reject() {
      console.log('❌ [IncomingCallModal] Reject clicked');
      this.$emit('reject');
      this.hide();
    },
    handleOverlayClick() {
      console.log('👆 [IncomingCallModal] Overlay clicked - silently dismissing');
      // Just hide modal without emitting reject
      // Caller's timeout will create the "missed call" message
      this.hide();
    },
    handleImageError(e) {
      console.log('⚠️ [IncomingCallModal] Avatar load error, using fallback');
      e.target.src = require('@/assets/defaultProfile.png');
    }
  }
}
</script>

<style scoped>
.incoming-call-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999999;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.incoming-call-modal {
  background: white;
  border-radius: 20px;
  padding: 30px;
  width: 90%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.close-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  background: #f0f0f0;
  border: none;
  border-radius: 50%;
  width: 35px;
  height: 35px;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #e0e0e0;
  color: #333;
}

.call-header {
  text-align: center;
  margin-bottom: 25px;
}

.call-header h2 {
  font-size: 20px;
  color: #333;
  margin: 0;
  font-weight: 600;
}

.caller-info {
  text-align: center;
  margin-bottom: 30px;
}

.caller-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  margin: 0 auto 20px;
  display: block;
  border: 4px solid #f0f0f0;
}

.caller-name {
  font-size: 22px;
  font-weight: 600;
  color: #1c1e21;
  margin: 0 0 10px 0;
}

.call-type {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  color: #65676b;
  margin: 0;
}

.lock-icon {
  font-size: 16px;
}

.call-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 25px;
}

.reject-btn,
.accept-btn {
  flex: 1;
  max-width: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 15px 20px;
  border: none;
  border-radius: 50px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.reject-btn {
  background: #e4e6eb;
  color: #050505;
}

.reject-btn:hover {
  background: #d8dadf;
}

.accept-btn {
  background: #0084ff;
  color: white;
}

.accept-btn:hover {
  background: #0073e6;
  transform: scale(1.02);
}

.btn-icon {
  font-size: 24px;
  width: 45px;
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
}

.reject-btn .btn-icon {
  background: rgba(0, 0, 0, 0.05);
}

.btn-label {
  font-size: 14px;
}

/* Responsive */
@media (max-width: 480px) {
  .incoming-call-modal {
    padding: 25px;
    max-width: 340px;
  }
  
  .caller-avatar {
    width: 80px;
    height: 80px;
  }
  
  .caller-name {
    font-size: 20px;
  }
  
  .call-actions {
    gap: 10px;
  }
  
  .reject-btn,
  .accept-btn {
    padding: 12px 15px;
    max-width: 130px;
  }
}
</style>
