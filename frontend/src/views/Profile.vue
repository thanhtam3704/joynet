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
import ProfileDetail from "@/components/ProfileDetail";
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
  position: sticky;
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 800px;
  margin-top: 5rem;
}

.profile__right-sidebar {
  margin-right: 1rem;
  margin-top: 5rem;
}

.profile__left-sidebar {
  margin-top: 5rem;
}
</style>
