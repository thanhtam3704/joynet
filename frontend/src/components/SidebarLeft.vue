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
        <!-- Settings - chưa có route, tạm thời disable -->
        <div class="not-on-page disabled">
          <span class="material-icons w3-xxlarge nav-icon-not">settings</span>
          <span class="nav-icon">Settings</span>
        </div>
      </div>
    </nav>
  </div>
</template>

<script>
export default {
  name: "SidebarLeft",
  props: ["currentUser"],
  computed: {
    unreadCount() {
      return this.$store.state.unreadCount || 0;
    }
  },
  mounted() {
    // Load conversations to check for unread messages
    this.$store.dispatch("loadConversations");
  }
};
</script>

<style scoped>
.left-sidebar {
  
  display: flex;
  flex-direction: row;
  width: 16%;
  height: 650px;
  margin-left: 1rem;
  margin-top: 5rem;
  position: fixed;
  z-index: 1;
  top: 0;
  left: 0;
  overflow-x: hidden;
}

.left-sidebar__menu {
  display: flex;
  flex-direction: column;
  padding: 1rem 1rem 0rem 1rem;
  /*    top   right  bottom  left */
  width: 100%;
}

.left-sidebar__menu h4 {
  margin-left: 0.5rem;
  font-weight: bold;
  color: #818588;
}

.left-sidebar__nav {
  display: flex;
  flex-direction: column;
  margin-top: 1rem;
}

.on-page {
  opacity: 1;
  background-color: var(--light);
  width: 100%;
  border-radius: 0.5rem;
  padding: 0.3rem 0.25rem;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 1rem;
  box-shadow: rgba(50, 50, 93, 0.25) 0px 13px 27px -5px,
    rgba(0, 0, 0, 0.3) 0px 8px 16px -8px;
}

.not-on-page {
  opacity: 0.7;
  background-color: none;
  color: rgb(92, 92, 92);
  width: 100%;
  border-radius: 0.5rem;
  padding: 0.3rem 0.25rem;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 1rem;
  transition: 0.3s;
}

.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.nav-icon {
  margin-left: 1rem;
  font-weight:bold;
}

.nav-icon-not {
  color: rgb(92, 92, 92);
}

.unread-badge {
  background-color: #ff3b30;
  color: white;
  border-radius: 50%;
  min-width: 18px;
  height: 18px;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  margin-right: 10px;
}
</style>
