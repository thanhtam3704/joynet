<template>
  <div id="nav">
    <router-view />
    <!-- ✅ Only render ChatPopupsManager if user is logged in -->
    <ChatPopupsManager v-if="isAuthenticated" />
  </div>
</template>

<script>
import socketService from '@/services/socketService'
import ChatPopupsManager from '@/components/ChatPopupsManager.vue'

export default {
  name: 'App',
  components: {
    ChatPopupsManager
  },
  computed: {
    isAuthenticated() {
      // ✅ Chỉ dựa vào store state, không dựa vào localStorage
      // Vì token có thể còn trong localStorage nhưng đã hết hạn hoặc invalid
      return !!this.$store.state.user && !!this.$store.state.user._id
    }
  },
  async mounted() {
    // Only load user if token exists
    const token = localStorage.getItem('token')
    if (token) {
      try {
        await this.$store.dispatch('loadUser')
      } catch (error) {
        console.error('Failed to load user:', error.message)
      }
    }
    
    // Connect to socket server only if user is logged in
    this.connectSocketIfAuthenticated()
  },
  watch: {
    // Watch for route changes to reconnect socket after login
    '$route'() {
      this.connectSocketIfAuthenticated()
    }
  },
  beforeUnmount() {
    // Cleanup listener
    socketService.off('new_notification', this.handleNewNotification)
    
    // Disconnect socket
    socketService.disconnect()
  },
  methods: {
    connectSocketIfAuthenticated() {
      const token = localStorage.getItem('token')
      if (token && !socketService.isConnected) {
        // ✅ Connect socket - listeners sẽ được setup bởi các components
        socketService.connect()
        
        // Setup notification listener
        this.setupNotificationListener()
        
        // ✅ DON'T setup video call listener here - ChatPopupsManager handles it
        // ChatPopupsManager already sets up the listener in its mounted() hook
        // and re-registers it on socket reconnection via 'socket-connected' event
      }
    },
    
    setupNotificationListener() {
      socketService.onNewNotification(this.handleNewNotification)
    },
    handleNewNotification(notification) {
      console.log('📬 [App] Received new notification:', notification)
      
      // Add notification to store
      this.$store.dispatch('addNewNotification', notification)
      
      // Optionally show toast
      if (notification.type) {
        console.log(`🔔 New ${notification.type} notification from ${notification.fromUser?.displayName || 'Unknown'}`)
      }
    }
  }
}
</script>

<style scoped>
#nav {
  width: 100%;
  min-height: 100vh;
}
</style>
