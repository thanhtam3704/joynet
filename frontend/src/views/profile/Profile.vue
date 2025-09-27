<template>
  <div class="profile">
    <TheHeader />
    <div class="profile__content">
      <div class="profile__left-sidebar">
        <SidebarLeft :currentUser="currentUser" />
      </div>
      <div class="profile__container">
        <ProfileDetail :id="id" />
      </div>
      <div class="profile__right-sidebar">
        <SidebarRight :currentUser="currentUser" />
      </div>
    </div>
    <TheFooter />
  </div>
</template>

<script>
import SidebarLeft from "@/components/SidebarLeft";
import SidebarRight from "@/components/SidebarRight";
import TheHeader from "@/components/TheHeader";
import ProfileDetail from "@/views/profile/components/ProfileDetail.vue";
import TheFooter from "@/components/TheFooter";

export default {
  name: "Profile",
  props: ["id"],
  components: {
    SidebarLeft,
    SidebarRight,
    TheHeader,
    ProfileDetail,
    TheFooter,
  },
  computed: {
    currentUser() {
      return this.$store.state.user?._id;
    },
  },
  watch: {
    // Khi route params thay đổi (chuyển từ profile này sang profile khác)
    "$route.params.id": {
      handler(newId, oldId) {
        if (newId !== oldId) {
          // Force re-render component khi ID thay đổi
          this.$nextTick(() => {
            this.$forceUpdate();
          });
        }
      },
      immediate: true,
    },
  },
};
</script>

<style scoped>
.profile__content {
  display: grid;
  grid-template-columns: 3fr 10fr 4fr;
  grid-gap: 3.3rem;
}

.profile__container {
  border-radius: 2rem;
  display: block; /* nội dung tự chảy xuống */
  width: 100%;
  max-width: 900px; /* giới hạn bề ngang nội dung trung tâm */
  margin-top: 5rem; /* tạo khoảng cách dưới header */
  margin-left: auto;
  margin-right: auto;
  padding: 0; /* có thể thêm padding nếu cần */
}

/* Điều chỉnh grid để cột giữa co theo max-width mà vẫn căn giữa */
.profile__content {
  align-items: start;
}

.profile__right-sidebar {
  margin-right: 1rem;
  margin-top: 5rem;
}

.profile__left-sidebar {
  margin-top: 5rem;
}
</style>
