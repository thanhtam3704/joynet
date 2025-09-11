<template>
  <header>
    <div class="header">
      <div class="header__left">
        <img class="header__logo" src="../assets/logo.png" />
        <p>Joynet</p>
      </div>
      <div class="header__main">
        <div class="header__main-right">
          <div class="header__main-right-search">
            <input type="text" placeholder="Tìm kiếm" />
            <i class="material-icons">search</i>
          </div>

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
      <div class="header__user">
        <!--<label class="header__user-username"
          >Xin chào, {{ user.displayName }}</label
        >-->
        <img
          v-if="user.profilePicture"
          class="image-post__img"
          :src="`http://localhost:3000/uploads/user/${user.profilePicture}`"
        />
        <img
          v-else
          class="image-post__img"
          src="../assets/defaultProfile.png"
        />
        <button @click="logout" class="btn btn-logout">Đăng xuất</button>
      </div>
    </div>

    <AddImagePost v-if="openAddImagePost" :id="currentUser" />
  </header>
</template>

<script>
import SyncLoader from "vue-spinner/src/SyncLoader.vue";
import AddImagePost from "@/components/AddImagePost";

export default {
  name: "TheHeader",
  components: {
    SyncLoader,
    AddImagePost,
  },
  props: ["currentUser"],
  data() {
    return {
      posts: [],
      openAddImagePost: false,
      openAddTextPost: false,
      profilePicture: "",
    };
  },
  computed: {
    user() {
      return this.$store.state.user;
    },
  },
  methods: {
    logout() {
      localStorage.clear();
      this.$router.push("/login");
    },
  },
  async mounted() {
    this.$store.dispatch("fetchUser");
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
  width: 95%;
  height: 65px;
  background-color: #fffaf9;
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
  font-size: 1.5rem;
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
  width: 60%;
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
  background-color: white;
  margin-right: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  margin-left: 2.3rem;
}

.header__main-right input {
  height: 30px;
  border-radius: 5px;
  padding-left: 5px;
}

.header__main-right i {
  height: 30px;
  border-radius: 7px;
}

.header__main-right button {
  width: 120px;
  font-weight: 600;
  font-size: 0.75em;
}

.header__user {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  width: 20%;
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
  background-color: var(--purple);
  margin-top: 0.7rem;
}

.btn-imageadd:hover {
  background-color: #5863c8;
  transition: 0.4s;
  box-shadow: 0px 15px 15px -5px rgba(0, 0, 0, 0.2);
  transform: translate(0, -3px);
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
</style>
