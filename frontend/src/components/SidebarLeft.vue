<template>
  <div class="left-sidebar">
    <nav class="left-sidebar__menu">
      <h4>Menu</h4>
      <div class="left-sidebar__nav">
        <router-link to="/home">
          <div v-if="$route.name === 'Home'" class="on-page">
            <span class="material-icons w3-xxlarge">home</span>
            <span class="nav-icon">Trang chủ</span>
          </div>
          <div v-else class="not-on-page">
            <span class="material-icons w3-xxlarge nav-icon-not">home</span>
            <span class="nav-icon">Trang chủ</span>
          </div>
        </router-link>
        <router-link
          v-if="currentUser"
          :to="{
            name: 'Profile',
            params: {
              id: currentUser,
            },
          }"
        >
          <div v-if="$route.name === 'Profile'" class="on-page">
            <span class="material-icons w3-xxlarge">account_circle</span>
            <span class="nav-icon">Trang cá nhân</span>
          </div>
          <div v-else class="not-on-page">
            <span class="material-icons w3-xxlarge nav-icon-not"
              >account_circle</span
            >
            <span class="nav-icon">Trang cá nhân</span>
          </div>
        </router-link>
        <div v-else class="not-on-page">
          <span class="material-icons w3-xxlarge nav-icon-not"
            >account_circle</span
          >
          <span class="nav-icon">Trang cá nhân</span>
        </div>
        <!-- Messages -->
        <router-link to="/messages">
          <div v-if="$route.name === 'Messages' || $route.name === 'MessageDetail'" class="on-page">
            <span class="material-icons w3-xxlarge">message</span>
            <span class="nav-icon">Tin nhắn</span>
            <span v-if="unreadCount > 0" class="unread-badge">{{ unreadCount }}</span>
          </div>
          <div v-else class="not-on-page">
            <span class="material-icons w3-xxlarge nav-icon-not">message</span>
            <span class="nav-icon">Tin nhắn</span>
            <span v-if="unreadCount > 0" class="unread-badge">{{ unreadCount }}</span>
          </div>
        </router-link>
        
        <!-- Settings -->
        <router-link to="/settings">
          <div v-if="$route.name === 'Settings'" class="on-page">
            <span class="material-icons w3-xxlarge">settings</span>
            <span class="nav-icon">Cài đặt</span>
          </div>
          <div v-else class="not-on-page">
            <span class="material-icons w3-xxlarge nav-icon-not">settings</span>
            <span class="nav-icon">Cài đặt</span>
          </div>
        </router-link>
      </div>
    </nav>
  </div>
</template>

<script>
import socketService from '@/services/socketService'
import { mapGetters } from 'vuex'

export default {
  name: "SidebarLeft",
  props: ["currentUser"],
  computed: {
    ...mapGetters({
      storeUnreadCount: 'unreadCount'
    }),
    unreadCount() {
      // Ưu tiên sử dụng Vuex store để đồng bộ với TheHeader
      return this.storeUnreadCount;
    }
  },
  methods: {
    setupSocketListener() {
      // Listen for new messages in active conversation
      socketService.onNewMessage(async (data) => {
        console.log('📬 [SidebarLeft] New message in conversation:', data)
        await this.$store.dispatch('loadConversations')
      })
      
      // Listen for new message notifications (for unread count)
      socketService.onNewMessageNotification(async (data) => {
        console.log('🔔 [SidebarLeft] New message notification received:', data)
        await this.$store.dispatch('loadConversations')
      })
      
      // Listen for conversation updates (mark as read, etc)
      socketService.onConversationUpdated(async () => {
        console.log('🔄 [SidebarLeft] Conversation updated')
        await this.$store.dispatch('loadConversations')
      })
    }
  },
  async mounted() {
    // Only load if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }
    
    // Load conversations từ Vuex store
    await this.$store.dispatch('loadConversations')
    
    // Setup socket listener for real-time updates
    this.setupSocketListener()
  },
  beforeUnmount() {
    // Clean up socket listeners
    socketService.off('newMessage')
    socketService.off('conversationUpdate')
  }
};
</script>

<style scoped>
.left-sidebar {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: fit-content;
}

.left-sidebar__menu {
  display: flex;
  flex-direction: column;
  padding: 1.25rem 1rem;
  width: 100%;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-2xl);
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.left-sidebar__menu h4 {
  margin-left: 0.625rem;
  font-weight: 700;
  font-size: 0.875rem;
  color: var(--gray-600);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
}

.left-sidebar__nav {
  display: flex;
  flex-direction: column;
  margin-top: 0.5rem;
  gap: 0.375rem;
}

.on-page {
  opacity: 1;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.12) 100%);
  border: 2px solid rgba(102, 126, 234, 0.3);
  width: 100%;
  border-radius: var(--radius-xl);
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 0;
  box-shadow: 0 4px 6px -1px rgba(102, 126, 234, 0.15);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.on-page::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.on-page .material-icons {
  color: var(--primary);
  font-weight: 600;
}

.on-page .nav-icon {
  color: var(--primary);
  font-weight: 700;
}

.not-on-page {
  opacity: 0.8;
  background: transparent;
  color: var(--gray-600);
  width: 100%;
  border-radius: var(--radius-xl);
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid transparent;
}

.not-on-page:hover {
  opacity: 1;
  background: var(--gray-50);
  border-color: var(--gray-200);
  transform: translateX(4px);
}

.not-on-page:hover .material-icons,
.not-on-page:hover .nav-icon {
  color: var(--gray-900);
}

.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.nav-icon {
  margin-left: 0.875rem;
  font-weight: 600;
  font-size: 0.9375rem;
  transition: color 0.2s ease;
}

.nav-icon-not {
  color: var(--gray-600);
  transition: color 0.2s ease;
}

.unread-badge {
  background: linear-gradient(135deg, #ff6b6b 0%, #ff3040 100%);
  color: white;
  border-radius: var(--radius-full);
  min-width: 20px;
  height: 20px;
  font-size: 0.6875rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  margin-right: 0.25rem;
  padding: 0 0.375rem;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(255, 48, 64, 0.3);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

/* ========== RESPONSIVE DESIGN ========== */

/* Tablet Large - 1024px and below */
@media (max-width: 1024px) {
  .left-sidebar {
    width: 18%;
    height: auto;
    min-height: 500px;
  }

  .left-sidebar__menu h4 {
    font-size: 0.95em;
  }

  .nav-icon {
    font-size: 0.9em;
  }
}

/* Tablet - 768px and below */
@media (max-width: 768px) {
  .left-sidebar {
    display: none; /* Ẩn sidebar trên tablet và mobile */
  }
}

/* Alternative: Mobile-friendly sidebar (uncomment if you want to keep it) */
/*
@media (max-width: 768px) {
  .left-sidebar {
    width: 60px;
    background: white;
    border-right: 1px solid #e0e0e0;
  }

  .left-sidebar__menu {
    padding: 0.5rem;
  }

  .left-sidebar__menu h4 {
    display: none;
  }

  .nav-icon {
    display: none;
  }

  .on-page,
  .not-on-page {
    justify-content: center;
    padding: 0.5rem;
  }

  .unread-badge {
    position: absolute;
    top: 5px;
    right: 5px;
    margin: 0;
  }
}
*/
</style>
