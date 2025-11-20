<template>
  <transition name="modal-fade">
    <div class="modal-overlay" @click="$emit('close')" v-if="show">
      <div class="modal-container" @click.stop>
        <div class="modal-header">
          <h3>Cảm xúc</h3>
          <button class="close-btn" @click="$emit('close')">
            <i class="material-icons">close</i>
          </button>
        </div>
        
        <div class="modal-tabs">
          <button 
            class="tab-btn"
            :class="{ 'active': selectedTab === 'all' }"
            @click="selectedTab = 'all'"
          >
            Tất cả {{ reactions.length }}
          </button>
          <button 
            v-for="emoji in uniqueEmojis" 
            :key="emoji"
            class="tab-btn"
            :class="{ 'active': selectedTab === emoji }"
            @click="selectedTab = emoji"
          >
            {{ emoji }} {{ getEmojiCount(emoji) }}
          </button>
        </div>
        
        <div class="modal-body">
          <div class="reactors-list">
            <div 
              v-for="reactor in filteredReactors" 
              :key="reactor.userId"
              class="reactor-item"
            >
              <img 
                v-if="reactor.userAvatar"
                :src="reactor.userAvatar"
                class="reactor-avatar"
                @error="handleAvatarError"
              />
              <img 
                v-else
                src="@/assets/defaultProfile.png"
                class="reactor-avatar"
              />
              <div class="reactor-info">
                <span class="reactor-name">{{ reactor.userName }}</span>
              </div>
              <span class="reactor-emoji">{{ reactor.emoji }}</span>
            </div>
            
            <div v-if="filteredReactors.length === 0" class="empty-state">
              <p>Chưa có cảm xúc nào</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'MessageReactorsModal',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    reactions: {
      type: Array,
      default: () => []
      // Format: [{ userId, userName, userAvatar, emoji }]
    }
  },
  data() {
    return {
      selectedTab: 'all'
    };
  },
  computed: {
    uniqueEmojis() {
      const emojis = new Set(this.reactions.map(r => r.emoji));
      return Array.from(emojis);
    },
    
    filteredReactors() {
      if (this.selectedTab === 'all') {
        return this.reactions;
      }
      return this.reactions.filter(r => r.emoji === this.selectedTab);
    }
  },
  methods: {
    getEmojiCount(emoji) {
      return this.reactions.filter(r => r.emoji === emoji).length;
    },
    
    handleAvatarError(event) {
      event.target.src = require('@/assets/defaultProfile.png');
    }
  },
  watch: {
    show(newVal) {
      if (newVal) {
        this.selectedTab = 'all';
      }
    }
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
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.2s ease;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.close-btn i {
  font-size: 24px;
}

.modal-tabs {
  padding: 1rem 1.5rem;
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  border-bottom: 1px solid #e2e8f0;
}

.modal-tabs::-webkit-scrollbar {
  height: 4px;
}

.modal-tabs::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 2px;
}

.tab-btn {
  background: #f1f5f9;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tab-btn:hover {
  background: #e2e8f0;
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.5rem;
}

.modal-body::-webkit-scrollbar {
  width: 6px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.reactors-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.reactor-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.reactor-item:hover {
  background: #f8fafc;
}

.reactor-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #e2e8f0;
}

.reactor-info {
  flex: 1;
  min-width: 0;
}

.reactor-name {
  font-weight: 600;
  color: #1e293b;
  font-size: 0.9375rem;
}

.reactor-emoji {
  font-size: 1.5rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #94a3b8;
}

.empty-state p {
  margin: 0;
  font-size: 0.9375rem;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .modal-container {
    width: 95%;
    max-height: 85vh;
  }
  
  .modal-header,
  .modal-tabs,
  .modal-body {
    padding-left: 1rem;
    padding-right: 1rem;
  }
  
  .reactor-item {
    padding: 0.5rem;
  }
}
</style>
