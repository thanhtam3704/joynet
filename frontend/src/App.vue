<template>
  <div id="nav">
    <router-view />
  </div>
</template>

<script>
import socketService from '@/services/socketService'

export default {
  name: 'App',
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
        socketService.connect()
        this.setupNotificationListener()
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
