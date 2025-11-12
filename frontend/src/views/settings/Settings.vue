<template>
  <div class="settings-page">
    <TheHeader />
    
    <div class="settings-content">
      <!-- Left Sidebar Navigation -->
      <div class="settings-left-sidebar">
        <SidebarLeft :currentUser="user._id" />
      </div>
      
      <!-- Main Content Area -->
      <div class="settings-main-area">       
        <!-- Content Area -->
        <div class="settings-content-area">
          <!-- Privacy Settings -->
          <div v-if="activeTab === 'privacy'" class="settings-panel">
            <div class="panel-header">
              <h2 class="panel-title">Quyền riêng tư</h2>
              <p class="panel-subtitle">Quản lý ai có thể xem nội dung và theo dõi bạn</p>
            </div>
            <div class="panel-body">
              <PrivacySettings />
            </div>
          </div>
          
          <!-- Password Change -->
          <div v-if="activeTab === 'password'" class="settings-panel">
            <div class="panel-header">
              <h2 class="panel-title">Đổi mật khẩu</h2>
              <p class="panel-subtitle">Cập nhật mật khẩu của bạn để bảo mật tài khoản</p>
            </div>
            <div class="panel-body">
              <ChangePassword />
            </div>
          </div>
        </div>
      </div>
      
      <!-- Right Menu -->
      <div class="settings-right-menu">
        <!-- Settings Header -->
        <div class="settings-header">
          <h1 class="settings-title">Cài đặt</h1>
        </div>
        <nav class="settings-nav">
          <button 
            :class="['nav-item', { active: activeTab === 'privacy' }]"
            @click="activeTab = 'privacy'"
          >
            <span class="nav-icon">🔒</span>
            <span class="nav-text">Quyền riêng tư</span>
          </button>
          
          <button 
            :class="['nav-item', { active: activeTab === 'password' }]"
            @click="activeTab = 'password'"
          >
            <span class="nav-icon">🔑</span>
            <span class="nav-text">Đổi mật khẩu</span>
          </button>
        </nav>
      </div>
    </div>
  </div>
</template>

<script>
import TheHeader from '@/components/TheHeader.vue';
import SidebarLeft from '@/components/SidebarLeft.vue';
import PrivacySettings from '@/components/PrivacySettings.vue';
import ChangePassword from '@/views/profile/components/ChangePassword.vue';

export default {
  name: 'Settings',
  components: {
    TheHeader,
    SidebarLeft,
    PrivacySettings,
    ChangePassword
  },
  computed: {
    user() {
      return this.$store.state.user || {};
    }
  },
  data() {
    return {
      activeTab: 'privacy' // Default tab
    };
  },
  mounted() {
    // Kiểm tra query parameter để set tab
    if (this.$route.query.tab) {
      this.activeTab = this.$route.query.tab;
    }
  },
  watch: {
    // Update URL when tab changes
    activeTab(newTab) {
      this.$router.replace({ 
        name: 'Settings', 
        query: { tab: newTab } 
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.settings-page {
  min-height: 100vh;
  background: #E8ECF4;
}

.settings-content {
  display: grid;
  grid-template-columns: 280px 1fr 320px;
  grid-gap: 2rem;
  padding: 0 2rem;
  padding-top: 5.5rem;
  padding-bottom: 40px;
  max-width: 1600px;
  margin: 0 auto;
}

.settings-left-sidebar {
  margin-top: 0;
  animation: fadeIn 0.5s ease-out 0.15s both;
}

.settings-main-area {
  margin-top: 0;
  animation: fadeIn 0.5s ease-out 0.2s both;
}

.settings-header {
  background: transparent;
  border: none;
  padding: 0 0 20px 0;
  margin-bottom: 16px;
  box-shadow: none;
  border-bottom: none;
}

.settings-title {
  margin-left: 0.625rem;
  font-weight: 700;
  font-size: 0.875rem;
  color: var(--gray-600);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0;
}

.settings-content-area {
  min-height: 500px;
}

.settings-panel {
  background: var(--white);
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: var(--radius-2xl);
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  animation: slideIn 0.4s ease-out;
}

.panel-header {
  padding: 24px 32px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.5);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.02) 0%, rgba(118, 75, 162, 0.02) 100%);
}

.panel-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--gray-900);
  margin: 0 0 6px 0;
  letter-spacing: -0.01em;
}

.panel-subtitle {
  font-size: 14px;
  color: var(--gray-600);
  margin: 0;
  line-height: 1.5;
}

.panel-body {
  padding: 28px 32px;
  
  @media (max-width: 640px) {
    padding: 24px 20px;
  }
}

.settings-right-menu {
  position: sticky;
  top: 100px;
  height: fit-content;
  background: var(--white);
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: var(--radius-2xl);
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  margin-top: 0;
  animation: fadeIn 0.5s ease-out 0.25s both;
}

.settings-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border: 2px solid transparent;
  background: transparent;
  border-radius: var(--radius-xl);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  color: var(--gray-700);
  font-size: 15px;
  font-weight: 500;
  position: relative;
  overflow: visible;
  margin-bottom: 8px;
  width: 100%;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    transition: width 0.3s ease;
    border-radius: var(--radius-xl) 0 0 var(--radius-xl);
  }
  
  .nav-icon {
    font-size: 22px;
    position: relative;
    z-index: 1;
    transition: transform 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
  }
  
  .nav-text {
    position: relative;
    z-index: 1;
    transition: color 0.3s ease;
    flex: 1;
  }
  
  &:hover:not(.active) {
    background: rgba(102, 126, 234, 0.05);
    border-color: rgba(102, 126, 234, 0.1);
    transform: translateX(4px);
    
    .nav-icon {
      transform: scale(1.1);
    }
  }
  
  &.active {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
    border-color: rgba(102, 126, 234, 0.4);
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
    
    &::before {
      width: 4px;
    }
    
    .nav-icon {
      transform: scale(1.15);
      filter: drop-shadow(0 2px 4px rgba(102, 126, 234, 0.3));
    }
    
    .nav-text {
      color: #667eea;
      font-weight: 600;
    }
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ========== RESPONSIVE DESIGN ========== */

/* Large Desktop - 1440px and above */
@media (min-width: 1440px) {
  .settings-content {
    grid-template-columns: 300px 1fr 340px;
    max-width: 1800px;
  }
}

/* Desktop - 1200px to 1439px */
@media (max-width: 1439px) {
  .settings-content {
    grid-template-columns: 280px 1fr 320px;
  }
}

/* Tablet Large - 1024px and below */
@media (max-width: 1024px) {
  .settings-content {
    grid-template-columns: 240px 1fr 280px;
    grid-gap: 1.5rem;
    padding: 0 1.5rem;
    padding-top: 5rem;
  }

  .settings-main-area,
  .settings-left-sidebar,
  .settings-right-menu {
    margin-top: 0;
  }
  
  .settings-header {
    padding: 0 0 20px 0;
  }
  
  .settings-title {
    font-size: 26px;
  }
  
  .panel-header {
    padding: 20px 28px;
  }
  
  .panel-body {
    padding: 24px 28px;
  }
}

/* Tablet - 768px and below */
@media (max-width: 768px) {
  .settings-content {
    grid-template-columns: 1fr;
    padding: 0 1rem;
    padding-top: 4rem;
  }

  .settings-left-sidebar {
    display: none;
  }

  .settings-main-area {
    margin-top: 0;
  }
  
  .settings-right-menu {
    order: -1;
    margin-bottom: 20px;
    margin-top: 0;
  }
  
  .settings-nav {
    flex-direction: row;
    gap: 12px;
  }
  
  .nav-item {
    flex: 1;
    justify-content: center;
    padding: 14px 16px;
    margin-bottom: 0;
    
    &:hover {
      transform: translateY(-2px);
    }
    
    &::before {
      width: 0;
      height: 0;
      top: auto;
      bottom: 0;
      left: 0;
      right: 0;
      border-radius: 0;
    }
    
    &.active::before {
      width: 100%;
      height: 4px;
      border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    }
  }
  
  .settings-header {
    padding: 0 0 16px 0;
  }
  
  .settings-title {
    font-size: 24px;
  }
}

/* Mobile - 480px and below */
@media (max-width: 480px) {
  .settings-content {
    padding: 3.5rem 0.75rem 1rem;
  }
  
  .settings-main-area {
    margin-top: 0;
  }
  
  .settings-right-menu {
    margin-top: 0;
    padding: 12px;
  }
  
  .settings-header {
    padding: 0 0 14px 0;
  }
  
  .settings-title {
    font-size: 22px;
  }
  
  .panel-header {
    padding: 18px 20px;
  }
  
  .panel-title {
    font-size: 18px;
  }
  
  .panel-subtitle {
    font-size: 13px;
  }
  
  .panel-body {
    padding: 20px 20px;
  }
}
</style>
