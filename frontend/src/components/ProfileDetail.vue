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
            src="../assets/defaultProfile.png"
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
                <div class="user-top__birth">
                  <a>Người theo dõi:</a>
                  <span>{{ followers }}</span>
                </div>
                <div class="user-top__birth">
                  <a>Đang theo dõi:</a>
                  <span>{{ following }}</span>
                </div>
                <div class="user-functions" v-if="!currentUser">
                  <div class="user-top__birth" v-if="!isFollowing">
                    <div class="add-button-wrapper" v-if="!followLoading">
                      <button class="btn" id="btnFollow" @click="followUser">
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
    </div>
  </div>
</template>

<script>
import ProfileUserPosts from "@/components/ProfileUserPosts";
import ProfileEdit from "@/components/ProfileEdit";
import { Skeletor } from "vue-skeletor";
import SyncLoader from "vue-spinner/src/SyncLoader.vue";

export default {
  name: "ProfileDetail",
  props: ["id"],
  components: { ProfileUserPosts, Skeletor, SyncLoader, ProfileEdit },
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

      try {
        // Đảm bảo fetchUser hoàn thành trước
        await this.$store.dispatch("fetchUser");
        const currentUser = this.$store.state.user?._id;

        const response = await fetch(
          `http://localhost:3000/api/users/${this.id}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          }
        );

        if (response.ok) {
          const userData = await response.json();
          if (currentUser === userData._id) this.currentUser = true;
          this.user = userData;
          this.followers = userData.followers?.length || 0;
          this.following = userData.followings?.length || 0;
          this.isFollowing = currentUser
            ? userData.followers?.includes(currentUser)
            : false;
        }
      } catch (error) {
        console.error("Fetch user error:", error);
      }

      this.isSkeletorLoading = false;
    },
    async followUser() {
      this.followLoading = true;
      this.followers++;

      try {
        const currentUser = this.$store.state.user._id;

        const responseUser = await fetch(
          `http://localhost:3000/api/users/${this.id}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          }
        );

        if (responseUser.ok) {
          const userData = await responseUser.json();
          const profileUser = this.$store.state.user;

          const responseFollow = await fetch(
            `http://localhost:3000/api/users/${this.id}/follow`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({
                userId: currentUser,
              }),
            }
          );

          if (responseFollow.ok) {
            this.isFollowing = !profileUser.followers.includes(currentUser);
            this.following = userData.followings.length;
          }
        }
      } catch (error) {
        console.error("Follow user error:", error);
        this.followers--; // Revert on error
      }

      this.followLoading = false;
    },
    async unFollowUser() {
      this.followLoading = true;
      this.followers--;

      try {
        const currentUser = this.$store.state.user._id;

        const responseUser = await fetch(
          `http://localhost:3000/api/users/${this.id}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          }
        );

        if (responseUser.ok) {
          const userData = await responseUser.json();
          const profileUser = this.$store.state.user;

          const responseUnFollow = await fetch(
            `http://localhost:3000/api/users/${this.id}/unfollow`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({
                userId: currentUser,
              }),
            }
          );

          if (responseUnFollow.ok) {
            this.isFollowing = profileUser.followers.includes(currentUser);
            this.following = userData.followings.length;
          }
        }
      } catch (error) {
        console.error("Unfollow user error:", error);
        this.followers++; // Revert on error
      }

      this.followLoading = false;
    },
    updateUser(user) {
      this.user = user || [];
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
  max-width: 500px; /* Giới hạn kích thước tối đa */
  height: 80px;
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

.btn-unfollow {
  transform: translate(0, 3px);
  transition: 0.4s;
  background-color: var(--red);
  margin-left: 2rem;
}

.btn-unfollow:hover {
  background-color: #e64e49;
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
