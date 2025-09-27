<template>
  <header>
    <div class="header">
      <div class="header__left">
        <img class="header__logo" src="../assets/logo.png" />
        <p>Joynet</p>
      </div>
      <div class="header__main">
        <div class="header__main-right">
          <div class="header__main-right-search" ref="searchContainer">
            <input 
              type="text" 
              placeholder="Tìm kiếm người dùng" 
              v-model="searchQuery"
              @focus="showSearchResults = true"
              @input="handleSearchInput"
              @keydown.down.prevent="navigateSearchResults('down')"
              @keydown.up.prevent="navigateSearchResults('up')"
              @keydown.enter.prevent="selectSearchResult(selectedIndex)"
              @click.stop
            />
            <i class="material-icons" @click="handleSearch">search</i>
            
            <!-- User Search Results Dropdown -->
            <div class="search-results" v-show="showSearchResults && searchResults.length > 0" @click.stop>
              <div 
                v-for="(user, index) in searchResults" 
                :key="user._id"
                class="search-result-item"
                :class="{ 'selected': selectedIndex === index }"
                @click="goToUserProfile(user._id)"
                @mouseover="selectedIndex = index"
              >
                <div class="search-user-avatar">
                  <img 
                    v-if="user.profilePicture" 
                    :src="`http://localhost:3000/uploads/user/${user.profilePicture}`" 
                    alt="User avatar"
                  />
                  <img 
                    v-else
                    src="@/assets/defaultProfile.png" 
                    alt="Default avatar"
                  />
                </div>
                <div class="search-user-info">
                  <span class="search-user-name">{{ user.displayName || user.email }}</span>
                </div>
              </div>
              <div class="search-loading" v-if="isSearching">
                Đang tìm kiếm...
              </div>
              <div class="no-results" v-if="!isSearching && searchQuery && searchResults.length === 0">
                Không tìm thấy người dùng
              </div>
            </div>
          </div>

          <div class="header-actions">
            <button
              @click="
                (openAddImagePost = !openAddImagePost), (openAddTextPost = false)
              "
              class="btn btn-imageadd"
            >
              Đăng bài viết
            </button>
          </div>
        </div>
      </div>
      <div class="header__user">
        <!-- Notification Icon -->
        <div class="notification-wrapper">
          <i class="material-icons notification-icon" @click="toggleNotifications">
            notifications
          </i>
          <span v-if="unreadCount > 0" class="notification-badge">{{ unreadCount }}</span>
          
          <!-- Notification Dropdown -->
          <NotificationList 
            :isVisible="showNotifications" 
            @close="showNotifications = false"
          />
        </div>

        <!-- <label class="header__user-username"
          > {{ user.displayName }}</label
        >     -->
    <a-dropdown>
    <a class="ant-dropdown-link" @click.prevent>
      <img
          v-if="user.profilePicture"
          class="image-post__img"
          :src="`http://localhost:3000/uploads/user/${user.profilePicture}`"
        />
        <img
          v-else
          class="image-post__img"
          src="@/assets/defaultProfile.png"
        />
      <DownOutlined />
    </a>
    <template #overlay>
      <a-menu>
        <router-link
          v-if="currentUser"
          :to="{
            name: 'Profile',
            params: {
              id: currentUser,
            },
          }"
        >
        <a-menu-item class ="menu-item">
          <a  href="javascript:;">Trang cá nhân</a>
        </a-menu-item>
         </router-link>
        <a-menu-item>
          <a @click="logout" href="javascript:;">Đăng xuất</a>
        </a-menu-item>
        
      </a-menu>
    </template>
  </a-dropdown>
        
      </div>
    </div>

  <AddPost v-if="openAddImagePost" :id="currentUser" />
  </header>
</template>

<script>
import SyncLoader from "vue-spinner/src/SyncLoader.vue";
import AddPost from "@/components/AddPost.vue";
import NotificationList from "@/views/notification/components/NotificationList.vue";

export default {
  name: "TheHeader",
  components: {
    SyncLoader,
    AddPost,
    NotificationList,
  },
  props: ["currentUser"],
  data() {
    return {
      posts: [],
      openAddImagePost: false,
      openAddTextPost: false,
      profilePicture: "",
      searchQuery: "",
      searchResults: [],
      isSearching: false,
      showSearchResults: false,
      selectedIndex: -1,
      searchTimeout: null,
      showNotifications: false,
    };
  },
  computed: {
    user() {
      return this.$store.state.user;
    },
    unreadCount() {
      return this.$store.getters.notificationUnreadCount;
    }
  },
  methods: {
    logout() {
      localStorage.clear();
      this.$router.push("/login");
    },
    
    handleSearchInput() {
      // Clear any existing timeout
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }
      
      // Set a new timeout to avoid making too many requests while typing
      this.searchTimeout = setTimeout(() => {
        this.handleSearch();
      }, 300);
    },
    
    async handleSearch() {
      if (!this.searchQuery) {
        this.searchResults = [];
        return;
      }
      
      this.isSearching = true;
      
      try {
        const { searchUsers, getAllUsers } = await import('@/api/users');
        const response = await getAllUsers();
        
        // Filter users by searchQuery (since we don't have a backend search endpoint yet)
        if (response.status === 200) {
          const allUsers = response.data;
          this.searchResults = allUsers.filter(user => {
            const displayName = user.displayName || '';
            const email = user.email || '';
            const searchLower = this.searchQuery.toLowerCase();
            return displayName.toLowerCase().includes(searchLower) || 
                   email.toLowerCase().includes(searchLower);
          }).slice(0, 10); // Limit to 10 results
        }
      } catch (error) {
        console.error('Error searching users:', error);
        this.searchResults = [];
      } finally {
        this.isSearching = false;
      }
    },
    
    navigateSearchResults(direction) {
      if (this.searchResults.length === 0) return;
      
      if (direction === 'down') {
        if (this.selectedIndex < this.searchResults.length - 1) {
          this.selectedIndex++;
        } else {
          this.selectedIndex = 0; // Loop back to the first item
        }
      } else if (direction === 'up') {
        if (this.selectedIndex > 0) {
          this.selectedIndex--;
        } else {
          this.selectedIndex = this.searchResults.length - 1; // Loop to the last item
        }
      }
    },
    
    selectSearchResult(index) {
      if (index >= 0 && index < this.searchResults.length) {
        const selectedUser = this.searchResults[index];
        this.goToUserProfile(selectedUser._id);
      }
    },
    
    goToUserProfile(userId) {
      this.showSearchResults = false;
      this.$router.push({
        name: 'Profile',
        params: { id: userId }
      });
    },
    
    toggleNotifications() {
      console.log('Toggle notifications called, current state:', this.showNotifications);
      this.showNotifications = !this.showNotifications;
      console.log('New state:', this.showNotifications);
      
      if (this.showNotifications) {
        console.log('Loading notifications...');
        this.$store.dispatch('loadNotifications').then(() => {
          console.log('Notifications loaded successfully');
        }).catch(error => {
          console.error('Error loading notifications:', error);
        });
      }
    },

    handleClickOutside(event) {
      // Check if click is outside the search container
      if (this.$refs.searchContainer && !this.$refs.searchContainer.contains(event.target)) {
        this.showSearchResults = false;
      }
    },
  },
  async mounted() {
    this.$store.dispatch("loadUser");
    
    // Load notification unread count
    this.$store.dispatch("loadNotificationUnreadCount");
    
    // Add event listener to handle clicks outside the search container
    document.addEventListener('click', this.handleClickOutside);
  },
  
  beforeUnmount() {
    // Remove event listener when component is destroyed
    document.removeEventListener('click', this.handleClickOutside);
  },
};
</script>

<style lang="scss" scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1.5rem;
  position: fixed;
  z-index: 9999;
  width: 100%;
  height: 58px;
  background-color: #FFFFFF;
  border-bottom: 1px solid #ddd;
}

.header__left {
  display: flex;
  align-items: center;
  gap: 0.5rem; /* Thêm khoảng cách 0.5rem giữa các phần tử */
  min-width: 160px; /* Đặt chiều rộng tối thiểu thay vì % */
}

.header__logo {
  width: 50px; /* Giảm kích thước logo xuống một chút */
  height: 50px;
  object-fit: contain;
}

.header__left p {
  font-family: "Montserrat", "Segoe UI", "Arial", "Helvetica Neue", sans-serif;
  font-weight: 900;
  font-size: 1.5em;
  background: linear-gradient(90deg, #fe7b77 0%, #fea94f 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.header__left i {
  margin-left: auto;
  right: 0;
  border-bottom: 2px solid var(--pink);
}

.header__main {
  width: 54%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header__main-right {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin-top: 0.7rem;

}

.header__main-right-search {
  background-color: #F0F2F5;
  margin-right: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  margin-left: 2.3rem;
  position: relative;
}

.header__main-right input {
  background-color: #F0F2F5;
  width: 250px;
  height: 30px;
  border-radius: 5px;
  padding-left: 5px;
}

.header__main-right i {
  height: 30px;
  border-radius: 7px;
  cursor: pointer;
}

/* Search Results Dropdown Styles */
.search-results {
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  width: 100%;
  background-color: #FFFFFF;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  max-height: 350px;
  overflow-y: auto;
  padding: 8px 0;
}

.search-result-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.search-result-item:hover,
.search-result-item.selected {
  background-color: #F0F2F5;
}

.search-user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 12px;
  flex-shrink: 0;
}

.search-user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.search-user-info {
  display: flex;
  flex-direction: column;
}

.search-user-name {
  font-weight: 500;
  color: #050505;
  font-size: 14px;
}

.search-loading,
.no-results {
  padding: 12px;
  color: #65676B;
  text-align: center;
  font-size: 14px;
}

.header__main-right button {
  width: 120px;
  font-weight: 600;
  font-size: 0.9em;
}

.header__user {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  width: 20%;
  margin-right: 2em;
}

.header__user-username {
  font-weight: bold;
  font-size: 0.9em;
  margin-right: 0.5em;
}

.header__user-image {
  width: 40px;
  height: 40px;
  border-radius: 100%;
}

.btn {
  margin-left: 1rem;
}

.btn-imageadd {
  transform: translate(0, 3px);
  transition: 0.4s;
  background-color: #FBDFDA;
  margin-top: 0.7rem;
  color: black;
  
}

.btn-imageadd:hover {
  background-color: #FBDFDA;
  transition: 0.4s;
  box-shadow: 0px 15px 15px -5px rgba(0, 0, 0, 0.2);
  transform: translate(0, -3px);
  color: black;
}

.header-actions {
  display: flex;
  align-items: center;
}

.btn-logout {
  transform: translate(0, 3px);
  transition: 0.4s;
  background-color: var(--red);
  min-width: 100px;
  min-height: 30px;
  margin-top: 0.7rem;
}

.btn-logout:hover {
  background-color: #e64e49;
  transition: 0.4s;
  box-shadow: 0px 15px 15px -5px rgba(0, 0, 0, 0.2);
  transform: translate(0, -3px);
}

.image-post__img {
  width: 40px;
  height: 40px;
  border-radius: 100%;
}

:deep(.ant-menu-item) {
  background-color: #FBDFDA !important;
  border-radius: 6px;
}
:deep(.ant-menu-item:hover) {
  background-color: #f7bfb9 !important;
}

/* Notification Styles */
.notification-wrapper {
  position: relative;
  margin-right: 1rem;
  display: flex;
  align-items: center;
}

.notification-icon {
  font-size: 24px;
  color: #65676B;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: background-color 0.2s ease;
}

.notification-icon:hover {
  background-color: #F0F2F5;
}

.notification-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  background-color: #FF3040;
  color: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: bold;
}
</style>
