<template>
  <div class="profile">
    <div v-if="isSkeletorLoading" class="profile-skeleton">
      <div class="skeleton-header">
        <Skeletor circle width="120" height="120" />
        <div class="skeleton-info">
          <Skeletor width="200" height="24" />
          <Skeletor width="150" height="16" style="margin-top: 8px;" />
          <div class="skeleton-stats">
            <Skeletor width="100" height="14" />
            <Skeletor width="100" height="14" />
          </div>
          <Skeletor width="120" height="36" style="margin-top: 12px; border-radius: 8px;" />
        </div>
      </div>
      <Skeletor width="100%" height="80" style="margin-top: 20px; border-radius: 8px;" />
    </div>
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
              <div class="user-name-wrapper">
                <a class="user-top__name">{{ user.displayName }}</a>
                <span v-if="user.isPrivate && !currentUser" class="private-badge" title="Tài khoản riêng tư">
                  🔒
                </span>
              </div>
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
                    <!-- Nếu tài khoản riêng tư và chưa follow -->
                    <div class="user-top__birth" v-if="user.isPrivate && !isFollowing && !hasPendingRequest">
                      <div class="add-button-wrapper" v-if="!followLoading">
                        <button class="btn btnFollow" id="btnFollow" @click="sendFollowRequest">
                          Gửi yêu cầu
                        </button>
                      </div>
                      <div class="add-button-loader" v-else>
                        <SyncLoader class="follow-loader" :color="color" />
                      </div>
                    </div>
                    <!-- Nếu đã gửi yêu cầu và đang chờ -->
                    <div class="user-top__birth" v-else-if="hasPendingRequest">
                      <div class="add-button-wrapper" v-if="!followLoading">
                        <button class="btn btn-pending" @click="cancelFollowRequest">
                          Đã gửi yêu cầu
                        </button>
                      </div>
                      <div class="add-button-loader" v-else>
                        <SyncLoader class="follow-loader" :color="color" />
                      </div>
                    </div>
                    <!-- Nếu tài khoản công khai và chưa follow -->
                    <div class="user-top__birth" v-else-if="!isFollowing">
                      <div class="add-button-wrapper" v-if="!followLoading">
                        <button class="btn btnFollow" id="btnFollow" @click="followUser">
                          Theo dõi
                        </button>
                      </div>
                      <div class="add-button-loader" v-else>
                        <SyncLoader class="follow-loader" :color="color" />
                      </div>
                    </div>
                    <!-- Nếu đã follow -->
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
      <div class="profile-desc" v-if="user.description || user.hobbies">
        <div v-if="user.description">
          <h5>Giới thiệu về tôi</h5>
          <p class="detail__content">
            {{ user.description }}
          </p>
        </div>
        <div v-if="user.hobbies">
          <h5 class="detail__hobbies">Sở thích của tôi</h5>
          <p class="detail__content">
            {{ user.hobbies }}
          </p>
        </div>
      </div>
      <div class="profile-posts">
        <h3>Bài đăng</h3>
        <ProfileUserPosts 
          ref="profileUserPosts" 
          :id="id" 
          :is-private="user.isPrivate"
          :is-following="isFollowing"
          :is-current-user="currentUser"
          @show-post-detail="$emit('show-post-detail', $event)" 
        />
      </div>
      <ProfileEdit
        @updateUser="updateUser($event)"
        v-if="openEditProfile"
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
      hasPendingRequest: false,
      pendingRequestId: null,
    };
  },
  watch: {
    // Watch khi ID thay đổi (chuyển sang profile khác)
    id: {
      handler() {
        // Đóng modal chỉnh sửa khi chuyển sang profile khác
        this.openEditProfile = false;
        this.loadProfileData();
      },
      immediate: false, // Đã gọi trong created()
    },
    // Watch route để reload khi navigate đến cùng profile (ví dụ: từ notification)
    '$route'(to, from) {
      // Chỉ reload nếu đang ở profile page và params ID giống nhau
      // (nghĩa là click vào notification của cùng user đang xem)
      if (to.name === from.name && to.params.id === from.params.id && to.params.id === this.id) {
        console.log('🔄 Reloading profile data due to route change (same profile)');
        this.loadProfileData();
      }
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
      this.hasPendingRequest = false;
      this.pendingRequestId = null;
      
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
          
          console.log('📊 Profile Data Loaded:', {
            profileUserId: this.id,
            currentUserId: currentUser,
            followers: userData.followers,
            isFollowing: this.isFollowing,
            followersCount: this.followers
          });
          
          // Kiểm tra xem có yêu cầu pending không (nếu là tài khoản riêng tư)
          if (userData.isPrivate && !this.currentUser && !this.isFollowing) {
            await this.checkPendingRequest(currentUser);
          }
        }
      } catch (error) {
  console.error("Load user error:", error);
      }

      this.isSkeletorLoading = false;
    },
    async followUser() {
      this.followLoading = true;

      try {
        const currentUser = this.$store.state.user._id;
        const { followUser } = await import('@/api/users');
        
        // Gửi yêu cầu theo dõi
        const responseFollow = await followUser(this.id, currentUser);
        
        if (responseFollow.status === 200) {
          // Cập nhật UI ngay lập tức
          this.isFollowing = true;
          this.followers++;
          
          // Cập nhật store thông qua action
          await this.$store.dispatch("updateUserFollowing", { 
            action: "follow", 
            targetUserId: this.id 
          });
          
          console.log(`✅ Followed user ${this.id}, isFollowing now:`, this.isFollowing);
        }
      } catch (error) {
        console.error("Follow user error:", error);
        // Hoàn tác UI nếu lỗi
        this.isFollowing = false;
        this.followers--;
      }

      this.followLoading = false;
    },
    
    async unFollowUser() {
      console.log('🔴 Unfollow clicked, current followLoading:', this.followLoading);
      
      if (this.followLoading) {
        console.log('⚠️ Already processing, skipping...');
        return;
      }
      
      this.followLoading = true;

      try {
        const currentUser = this.$store.state.user._id;
        const { unfollowUser, getUser } = await import('@/api/users');
        
        console.log('📤 Sending unfollow request...');
        
        // Gửi yêu cầu bỏ theo dõi
        const responseUnFollow = await unfollowUser(this.id, currentUser);
        
        console.log('📥 Unfollow response:', responseUnFollow.status);
        
        if (responseUnFollow.status === 200) {
          // Đợi 500ms để backend hoàn tất việc xóa record
          console.log('⏳ Waiting 500ms for backend...');
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Reload data từ server để đồng bộ
          console.log('🔄 Reloading user data...');
          const userResponse = await getUser(this.id);
          
          if (userResponse.status === 200) {
            const userData = userResponse.data;
            
            // Cập nhật followers/followings count
            this.followers = userData.followers?.length || 0;
            this.following = userData.followings?.length || 0;
            
            // Kiểm tra đúng: xem currentUser có trong danh sách followers của target user không
            // Hoặc xem target user có trong followings của current user không
            const isCurrentUserInFollowers = userData.followers?.includes(currentUser) || false;
            
            console.log('🔍 Debug unfollow state:', {
              currentUser: currentUser,
              targetUser: this.id,
              targetUserFollowers: userData.followers,
              isCurrentUserInFollowers: isCurrentUserInFollowers
            });
            
            // Nếu current user KHÔNG còn trong followers list của target user
            // thì isFollowing = false
            this.isFollowing = isCurrentUserInFollowers;
            
            console.log(`✅ Unfollowed user ${this.id}, verified from server:`, {
              isFollowing: this.isFollowing,
              followers: this.followers,
              userFollowersList: userData.followers
            });
          }
          
          // Cập nhật store thông qua action
          await this.$store.dispatch("updateUserFollowing", { 
            action: "unfollow", 
            targetUserId: this.id 
          });
          
          // Nếu là tài khoản riêng tư, kiểm tra xem có pending request không
          if (this.user.isPrivate) {
            console.log('🔍 Checking pending request for private account...');
            await this.checkPendingRequest(currentUser);
          }
        }
      } catch (error) {
        console.error("❌ Unfollow user error:", error);
      } finally {
        this.followLoading = false;
        console.log('✅ Unfollow completed, followLoading set to false');
      }
    },
    
    async sendFollowRequest() {
      this.followLoading = true;
      
      try {
        const currentUserId = this.$store.state.user._id;
        const followRequestsAPI = (await import('@/api/followRequests')).default;
        
        console.log('🔄 Sending follow request:', {
          from: currentUserId,
          to: this.id,
          isPrivate: this.user.isPrivate,
          isFollowing: this.isFollowing
        });
        
        const response = await followRequestsAPI.sendFollowRequest(currentUserId, this.id);
        
        if (response.status === 200) {
          this.hasPendingRequest = true;
          this.pendingRequestId = response.data.request._id;
          
          // Hiển thị toast thông báo
          const { createToast } = await import('mosha-vue-toastify');
          createToast('Đã gửi yêu cầu theo dõi', {
            type: 'success',
            position: 'top-right',
            timeout: 3000
          });
        }
      } catch (error) {
        console.error("Send follow request error:", error);
        console.error("Error response:", error.response?.data);
        console.error("Error status:", error.response?.status);
        
        const { createToast } = await import('mosha-vue-toastify');
        const errorMsg = error.response?.data || 'Không thể gửi yêu cầu';
        createToast(errorMsg, {
          type: 'danger',
          position: 'top-right',
          timeout: 3000
        });
      }
      
      this.followLoading = false;
    },
    
    async cancelFollowRequest() {
      if (!this.pendingRequestId) return;
      
      this.followLoading = true;
      
      try {
        const currentUserId = this.$store.state.user._id;
        const followRequestsAPI = (await import('@/api/followRequests')).default;
        
        const response = await followRequestsAPI.cancelFollowRequest(this.pendingRequestId, currentUserId);
        
        if (response.status === 200) {
          this.hasPendingRequest = false;
          this.pendingRequestId = null;
          
          const { createToast } = await import('mosha-vue-toastify');
          createToast('Đã hủy yêu cầu theo dõi', {
            type: 'info',
            position: 'top-right',
            timeout: 3000
          });
        }
      } catch (error) {
        console.error("Cancel follow request error:", error);
        
        const { createToast } = await import('mosha-vue-toastify');
        createToast('Không thể hủy yêu cầu', {
          type: 'danger',
          position: 'top-right',
          timeout: 3000
        });
      }
      
      this.followLoading = false;
    },
    
    async checkPendingRequest(currentUserId) {
      try {
        const followRequestsAPI = (await import('@/api/followRequests')).default;
        
        const response = await followRequestsAPI.checkFollowRequest(currentUserId, this.id);
        
        if (response.status === 200 && response.data.exists) {
          this.hasPendingRequest = true;
          this.pendingRequestId = response.data.request._id;
          console.log('✅ Found pending request:', response.data.request._id);
        } else {
          this.hasPendingRequest = false;
          this.pendingRequestId = null;
          console.log('✅ No pending request found');
        }
      } catch (error) {
        console.error("Check pending request error:", error);
        // Nếu lỗi, set về false để an toàn
        this.hasPendingRequest = false;
        this.pendingRequestId = null;
      }
    },
    
    async startConversation() {
      try {
        console.log('Starting conversation with user:', this.id);
        
        // Import API để tạo conversation
        const MessageAPI = (await import('@/api/messages')).default;
        
        // Tạo hoặc lấy conversation với user này
        const response = await MessageAPI.createOrGetConversation(this.id);
        
        if (response && response.data) {
          const conversationId = response.data._id;
          console.log('Conversation created/found:', conversationId);
          
          // Navigate đến message page với conversation cụ thể
          this.$router.push({
            name: 'MessageDetail',
            params: { id: conversationId }
          });
        } else {
          // Nếu không tạo được conversation, vẫn đi đến messages page
          this.$router.push({ name: 'Messages' });
        }
      } catch (error) {
        console.error("Start conversation error:", error);
        
        // Fallback: đi đến messages page
        this.$router.push({ name: 'Messages' });
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
    updatePostCommentsCount(postId, newCount) {
      // Forward to ProfileUserPosts child component
      this.$refs.profileUserPosts?.updatePostCommentsCount(postId, newCount);
    },
  },
};
</script>

<style scoped>
.profile {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.profile-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  padding: 2rem 0 1rem 0;
  background: var(--white);
  border-radius: var(--radius-2xl);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--gray-100);
  margin-bottom: 1.5rem;
}

.profile__detail {
  width: 100%;
  padding: 1.5rem 2rem;
  box-sizing: border-box;
  text-align: center;
}

.profile-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 140px;
  height: 140px;
  border-radius: var(--radius-full);
  background: var(--white);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
  border: 4px solid var(--white);
  position: relative;
  overflow: hidden;
  margin-bottom: 1rem;
}

.profile-avatar::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: var(--radius-full);
  padding: 2px;
  background: var(--gradient-primary);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.profile-avatar:hover::after {
  opacity: 1;
}

.profile img {
  width: 120px;
  height: 120px;
  border-radius: var(--radius-full);
  object-fit: cover;
  background: var(--gray-50);
}

.detail__user {
  width: 100%;
}

.detail__user-top {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.detail__user a {
  font-weight: 700;
  color: var(--gray-900);
  padding: 0;
}

.user-top__name {
  font-size: 1.75rem;
  font-family: var(--font-display);
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.25rem;
}

.user-top__birth {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
  justify-content: center;
}

.user-top__birth a {
  padding: 0;
  font-weight: 600;
  color: var(--gray-700);
}

.user-top__birth span {
  color: var(--gray-600);
  font-weight: 500;
}

.follower-count, .following-count {
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-lg);
  background: var(--gray-50);
}

.follower-count:hover, .following-count:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  transform: translateY(-2px);
}

.user-follow {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  justify-content: center;
  margin-top: 1rem;
  width: 100%;
}

.user-functions,
.user-edit-profile {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-top: 1rem;
}

.user-function-buttons {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}

.detail__content {
  font-size: 0.9375rem;
  margin-top: 0.75rem;
  line-height: 1.6;
  color: var(--gray-700);
}

.profile-desc {
  display: flex;
  justify-content: flex-start;
  flex-direction: column;
  background: var(--white);
  border-radius: var(--radius-2xl);
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--gray-100);
  margin-bottom: 1.5rem;
}

.profile-desc h5 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--gray-900);
  font-family: var(--font-display);
  margin-bottom: 0.5rem;
}

.detail__hobbies {
  margin-top: 2rem;
}

.profile-posts {
  margin-top: 0;
}

.profile-posts h3 {
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--gray-900);
  font-family: var(--font-display);
  padding: 1.5rem 0 0 0;
}

.btn {
  height: 44px;
  border-radius: var(--radius-lg);
  border: none;
  font-weight: 600;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: var(--font-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 1.5rem;
  margin: 0;
}

.btnFollow,
.edit-profile {
  background: var(--gradient-primary);
  color: var(--white);
  box-shadow: 0 4px 6px -1px rgba(102, 126, 234, 0.3);
  min-width: 120px;
}

.btnFollow:hover,
.edit-profile:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px -5px rgba(102, 126, 234, 0.4);
}

.btn-unfollow {
  min-width: 120px;
  background: var(--white);
  color: var(--error);
  border: 2px solid var(--error);
}

.btn-unfollow:hover {
  background: var(--error);
  color: var(--white);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(239, 68, 68, 0.3);
}

.btn-message {
  min-width: 120px;
  background: var(--white);
  color: var(--primary);
  border: 2px solid var(--primary);
}

.btn-message:hover {
  background: var(--primary);
  color: var(--white);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
}

.follow-loader {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 120px;
  height: 44px;
}

.skeletor {
  margin-bottom: 1rem;
}

/* Custom scrollbar */
.profile::-webkit-scrollbar {
  width: 6px;
  height: 0;
}

.profile::-webkit-scrollbar-track {
  background: transparent;
}

.profile::-webkit-scrollbar-thumb {
  background: var(--gray-300);
  border-radius: var(--radius-full);
}

.profile::-webkit-scrollbar-thumb:hover {
  background: var(--gray-400);
}

/* Responsive */
@media (max-width: 768px) {
  .profile-info {
    padding: 1.5rem 1rem;
    border-radius: var(--radius-xl);
  }

  .profile-avatar {
    width: 120px;
    height: 120px;
  }

  .profile img {
    width: 100px;
    height: 100px;
  }

  .profile__detail {
    padding: 1rem;
  }

  .user-top__name {
    font-size: 1.5rem;
  }

  .user-follow {
    flex-direction: column;
    gap: 0.75rem;
  }

  .follower-count,
  .following-count {
    width: 100%;
    max-width: 300px;
  }

  .user-function-buttons {
    flex-direction: column;
    width: 100%;
    align-items: center;
  }

  .btn {
    width: 100%;
    max-width: 300px;
  }

  .profile-desc {
    padding: 1.5rem 1rem;
    border-radius: var(--radius-xl);
  }

  .profile-desc h5 {
    font-size: 1.125rem;
  }

  .detail__content {
    font-size: 0.875rem;
  }
}

.profile-skeleton {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  border: 1px solid rgba(226, 232, 240, 0.6);
}

.skeleton-header {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.skeleton-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.skeleton-stats {
  display: flex;
  gap: 20px;
  margin-top: 12px;
}

@media (max-width: 480px) {
  .profile-info {
    padding: 1.25rem 0.875rem;
    border-radius: var(--radius-lg);
  }

  .profile-avatar {
    width: 100px;
    height: 100px;
  }

  .profile img {
    width: 85px;
    height: 85px;
  }

  .user-top__name {
    font-size: 1.25rem;
  }

  .user-top__birth {
    font-size: 0.875rem;
  }

  .btn {
    height: 40px;
    font-size: 0.875rem;
  }

  .profile-desc {
    padding: 1.25rem 0.875rem;
    border-radius: var(--radius-lg);
  }

  .profile-desc h5 {
    font-size: 1rem;
  }

  .profile-posts h3 {
    font-size: 1.25rem;
    padding: 1rem 0 0 0;
  }

  .detail__content {
    font-size: 0.8125rem;
  }
}
</style>
