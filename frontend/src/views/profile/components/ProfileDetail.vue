<template>
  <div class="profile">
    <Skeletor circle size="50" class="skeletor" v-if="isSkeletorLoading" />
    <Skeletor
      v-if="isSkeletorLoading"
      class="skeletor"
      width="600"
      height="20"
    />
    <Skeletor
      v-if="isSkeletorLoading"
      class="skeletor"
      width="600"
      height="300"
    />
    <div class="profile-all" v-else>
      <div class="profile-info">
        <div class="profile-avatar">
          <img
            class="image-post__img"
            v-if="user.profilePicture"
            :src="`http://localhost:3000/uploads/user/${user.profilePicture}`"
          />
          <img
            v-else
            class="image-post__img"
            src="@/assets/defaultProfile.png"
          />
        </div>
        <div class="profile__detail">
          <div class="detail__user">
            <div class="detail__user-top">
              <a class="user-top__name">{{ user.displayName }}</a>
              <div class="user-top__birth">
                <a v-if="user.birthDate">Ngày sinh:</a>
                <span>{{ user.birthDate }}</span>
              </div>
              <div class="user-follow">
                <div class="user-top__birth follower-count" @click="showFollowersModal = true">
                  <a>Người theo dõi:</a>
                  <span>{{ followers }}</span>
                </div>
                <div class="user-top__birth following-count" @click="showFollowingModal = true">
                  <a>Đang theo dõi:</a>
                  <span>{{ following }}</span>
                </div>
                <div class="user-functions" v-if="!currentUser">
                  <div class="user-function-buttons">
                    <div class="user-top__birth" v-if="!isFollowing">
                      <div class="add-button-wrapper" v-if="!followLoading">
                        <button class="btn btnFollow" id="btnFollow" @click="followUser">
                          Theo dõi
                        </button>
                      </div>
                      <div class="add-button-loader" v-else>
                        <SyncLoader class="follow-loader" :color="color" />
                      </div>
                    </div>
                    <div class="user-top__birth" v-else>
                      <div class="add-button-wrapper" v-if="!followLoading">
                        <button
                          class="btn btn-unfollow"
                          id="btnUnfollow"
                          @click="unFollowUser"
                        >
                          Bỏ theo dõi
                        </button>
                      </div>
                      <div class="add-button-loader" v-else>
                        <SyncLoader class="follow-loader" :color="color" />
                      </div>
                    </div>
                    <button class="btn btn-message" @click="startConversation">
                      Nhắn tin
                    </button>
                  </div>
                </div>
                <div class="user-edit-profile" v-else>
                  <button
                    class="btn edit-profile"
                    @click="openEditProfile = !openEditProfile"
                  >
                    Chỉnh sửa hồ sơ
                  </button>
                </div>
              </div>
            </div>
            <div class="detail__user-bot"></div>
          </div>
        </div>
      </div>
      <div class="profile-desc">
        <h5>Giới thiệu về tôi</h5>
        <p class="detail__content">
          {{ user.description }}
        </p>
        <h5 class="detail__hobbies">Sở thích của tôi</h5>
        <p class="detail__content">
          {{ user.hobbies }}
        </p>
      </div>
      <div class="profile-posts">
        <h3>Bài đăng</h3>
        <ProfileUserPosts :id="id" />
      </div>
      <ProfileEdit
        @updateUser="updateUser($event)"
        v-if="openEditProfile"
        :id="id"
      />
      
      <!-- Modal Người theo dõi -->
      <UserListModal
        v-if="showFollowersModal"
        title="Người theo dõi"
        :userIds="user.followers || []"
        @close="showFollowersModal = false"
        @follow-updated="handleFollowUpdate"
      />
      
      <!-- Modal Đang theo dõi -->
      <UserListModal
        v-if="showFollowingModal"
        title="Đang theo dõi"
        :userIds="user.followings || []"
        @close="showFollowingModal = false"
        @follow-updated="handleFollowUpdate"
      />
    </div>
  </div>
</template>

<script>
import ProfileUserPosts from "@/views/profile/components/ProfileUserPosts.vue";
import ProfileEdit from "@/views/profile/components/ProfileEdit.vue";
import UserListModal from "@/components/UserListModal.vue";
import { Skeletor } from "vue-skeletor";
import SyncLoader from "vue-spinner/src/SyncLoader.vue";

export default {
  name: "ProfileDetail",
  props: ["id"],
  components: { ProfileUserPosts, Skeletor, SyncLoader, ProfileEdit, UserListModal },
  data() {
    return {
      user: [],
      color: "pink",
      followers: 0,
      following: 0,
      isFollowing: false,
      isSkeletorLoading: false,
      followLoading: false,
      currentUser: false,
      openEditProfile: false,
      showFollowersModal: false,
      showFollowingModal: false,
    };
  },
  watch: {
    // Watch khi ID thay đổi (chuyển sang profile khác)
    id: {
      handler() {
        this.loadProfileData();
      },
      immediate: false, // Đã gọi trong created()
    },
  },
  async created() {
    await this.loadProfileData();
  },
  methods: {
    async loadProfileData() {
      this.isSkeletorLoading = true;
      // Reset currentUser status mỗi khi load profile mới
      this.currentUser = false;
      
      try {
  // Đảm bảo loadUser hoàn thành trước
  await this.$store.dispatch("loadUser");
        const currentUser = this.$store.state.user?._id;

          const { getUser } = await import('@/api/users');
          const response = await getUser(this.id);
          if (response.status === 200) {
            const userData = response.data;
          // Kiểm tra xem có phải là profile của chính mình không
          this.currentUser = currentUser === userData._id;
          this.user = userData;
          this.followers = userData.followers?.length || 0;
          this.following = userData.followings?.length || 0;
          this.isFollowing = currentUser
            ? userData.followers?.includes(currentUser)
            : false;
        }
      } catch (error) {
  console.error("Load user error:", error);
      }

      this.isSkeletorLoading = false;
    },
    async followUser() {
      this.followLoading = true;
      this.followers++;

      try {
        const currentUser = this.$store.state.user._id;
        const { followUser } = await import('@/api/users');
        
        // Gửi yêu cầu theo dõi
        const responseFollow = await followUser(this.id, currentUser);
        
        if (responseFollow.status === 200) {
          // Cập nhật UI
          this.isFollowing = true;
          
          // Cập nhật store thông qua action
          await this.$store.dispatch("updateUserFollowing", { 
            action: "follow", 
            targetUserId: this.id 
          });
          
          console.log(`Followed user ${this.id}, new followings:`, 
                     this.$store.state.user?.followings);
        }
      } catch (error) {
        console.error("Follow user error:", error);
        this.followers--; // Hoàn tác nếu lỗi
      }

      this.followLoading = false;
    },
    
    async unFollowUser() {
      this.followLoading = true;
      this.followers--;

      try {
        const currentUser = this.$store.state.user._id;
        const { unfollowUser } = await import('@/api/users');
        
        // Gửi yêu cầu bỏ theo dõi
        const responseUnFollow = await unfollowUser(this.id, currentUser);
        
        if (responseUnFollow.status === 200) {
          // Cập nhật UI
          this.isFollowing = false;
          
          // Cập nhật store thông qua action
          await this.$store.dispatch("updateUserFollowing", { 
            action: "unfollow", 
            targetUserId: this.id 
          });
          
          console.log(`Unfollowed user ${this.id}, new followings:`, 
                     this.$store.state.user?.followings);
        }
      } catch (error) {
        console.error("Unfollow user error:", error);
        this.followers++; // Hoàn tác nếu lỗi
      }

      this.followLoading = false;
    },
    
    async startConversation() {
      try {
        // Create a new conversation with this user
        const conversationId = await this.$store.dispatch('createConversation', this.id);
        
        if (conversationId) {
          // Navigate to the message page with this conversation
          this.$router.push({
            name: 'MessageDetail',
            params: { id: conversationId }
          });
        } else {
          // If creating conversation fails, just go to messages page
          this.$router.push({ name: 'Messages' });
        }
      } catch (error) {
        console.error("Start conversation error:", error);
      }
    },
    updateUser(user) {
      this.user = user || [];
    },
    
    handleFollowUpdate({ userId, following }) {
      console.log(`Follow update: userId=${userId}, following=${following}, profile id=${this.id}`);
      
      // Lấy thông tin người dùng hiện tại
      const currentUserId = this.$store.state.user?._id;
      
      // TRƯỜNG HỢP 1: Nếu đây là profile của người khác và người hiện tại follow/unfollow họ
      if (userId === this.id) {
        console.log(`Case 1: Current user is following/unfollowing this profile`);
        
        // Cập nhật trạng thái UI
        this.isFollowing = following;
        
        // Cập nhật số lượng người theo dõi
        if (following) {
          this.followers++;
        } else {
          this.followers--;
        }
        
        // Cập nhật store thông qua action
        this.$store.dispatch("updateUserFollowing", { 
          action: following ? "follow" : "unfollow", 
          targetUserId: userId 
        });
      }
      
      // TRƯỜNG HỢP 2: Nếu đây là profile của người dùng hiện tại và họ follow/unfollow người khác
      if (currentUserId === this.id) {
        console.log(`Case 2: This is current user's profile and they are following/unfollowing someone else`);
        
        // Cập nhật số lượng đang theo dõi
        if (following) {
          this.following++;
        } else {
          this.following--;
        }
        
        // Cập nhật store thông qua action
        this.$store.dispatch("updateUserFollowing", { 
          action: following ? "follow" : "unfollow", 
          targetUserId: userId 
        });
      }
      
      // Reload profile data để cập nhật danh sách nếu đang ở chế độ modal
      if (this.showFollowersModal || this.showFollowingModal) {
        // Reload profile data sau một khoảng thời gian ngắn để API kịp cập nhật
        setTimeout(() => {
          this.loadProfileData();
        }, 500);
      }
    },
  },
};
</script>

<style scoped>
.profile {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow-x: hidden; /* Ngăn thanh cuộn ngang */
}

.profile-info {
  display: flex;
  align-items: center;
  position: relative;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden; /* Ngăn tràn */
}

.profile__detail {
  position: absolute;
  display: flex;
  justify-content: flex-start;
  background-color: white;
  border-radius: 0.3rem;
  margin-bottom: 2rem;
  padding: 1rem;
  width: calc(100% - 180px); /* Thay đổi từ kích thước cố định sang tương đối */
  max-width: 800px; /* Giới hạn kích thước tối đa */
  height: 110px;
  left: 7.8rem;
  top: 1.2rem;
}

.profile-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 150px;
  height: 150px;
  border-radius: 100%;
  background-color: white;
  z-index: 1;
}

.profile img {
  width: 108px;
  height: 108px;
  border-radius: 100%;
  background-color: white;
}

.detail__user a {
  font-weight: bold;
  padding-left: 1.5rem;
}

.user-top__name {
  font-size: 1.2rem;
}

.user-top__birth {
  margin-top: 0.25rem;
}

.user-top__birth span {
  margin-left: 0.5rem;
}

.follower-count, .following-count {
  cursor: pointer;
  transition: opacity 0.2s;
}

.follower-count:hover, .following-count:hover {
  opacity: 0.8;
}

.user-follow {
  display: flex;
}

.detail__content {
  font-size: 0.75rem;
  margin-top: 0.5em;
}

.profile-desc {
  display: flex;
  justify-content: flex-start;
  flex-direction: column;
  background-color: white;
  border-radius: 0.3rem;
  margin-top: 1rem;
  padding: 1rem;
}

.detail__hobbies {
  margin-top: 1rem;
}

.profile-posts {
  margin-top: 2rem;
}

.profile-posts h3 {
  margin-bottom: 1rem;
}

.btn {
  transform: translate(0, 4px);
  transition: 0.4s;
  background-color: var(--green);
  margin-left: 2rem;
}

.btn:hover {
  background-color: #6dc271;
  transition: 0.4s;
  box-shadow: 0px 15px 15px -5px rgba(0, 0, 0, 0.2);
  transform: translate(0, -3px);
}

.edit-profile {
  width: 150px;
  margin-bottom: 3rem;
}
.btnFollow {
  width: 100px;
}

.btn-unfollow {
  width: 120px;
  transform: translate(0, 3px);
  transition: 0.4s;
  background-color: var(--red);
  margin-left: 2rem;
}

.btn-unfollow:hover {
  width: 120px;
  background-color: #e64e49;
  transition: 0.4s;
  box-shadow: 0px 15px 15px -5px rgba(0, 0, 0, 0.2);
  transform: translate(0, -3px);
}

.user-function-buttons {
  display: flex;
  align-items: center;
}

.btn-message {
  width: 100px;
  transform: translate(0, 4px);
  transition: 0.4s;
  background-color: #0095f6;
  margin-left: 1rem;
  color: white;
}

.btn-message:hover {
  width: 100px;
  background-color: #1877f2;
  transition: 0.4s;
  box-shadow: 0px 15px 15px -5px rgba(0, 0, 0, 0.2);
  transform: translate(0, -3px);
}

.follow-loader {
  margin-left: 3rem;
}

/* Tùy chỉnh thanh cuộn */
.profile::-webkit-scrollbar {
  width: 6px;
  height: 0; /* Ẩn thanh cuộn ngang */
}

.profile::-webkit-scrollbar-track {
  background: transparent;
}

.profile::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
}

.profile::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.3);
}

/* Media queries cho màn hình nhỏ */
@media (max-width: 768px) {
  .profile-info {
    flex-direction: column;
  }

  .profile__detail {
    position: relative;
    left: 0;
    top: 0;
    width: 100%;
    max-width: 100%;
    margin-top: 1rem;
    height: auto;
  }

  .user-follow {
    flex-direction: column;
  }

  .btn {
    margin-left: 0;
    margin-top: 0.5rem;
  }
}
</style>
