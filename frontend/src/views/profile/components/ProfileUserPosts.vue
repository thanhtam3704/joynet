<template>
  <div class="profile-posts">
    <!-- Loading skeletons -->
    <Skeletor circle size="50" class="skeletor" v-if="isSkeletorLoading" />
    <Skeletor v-if="isSkeletorLoading" class="skeletor" width="100%" height="20" />
    <Skeletor v-if="isSkeletorLoading" class="skeletor" width="100%" height="300" />

    <!-- Posts -->
    <div v-for="post in posts" :key="post._id" class="profile-post" v-else :data-post-id="post._id">
      <router-link :to="{ name: 'PostDetail', params: { id: post._id } }" class="profile-post__link">
        <div class="post">
          <div class="post__avatar">
            <ProfileImage :id="post.userId" />
          </div>
          <div class="post__content-wrapper">
            <PostDisplayName :id="post.userId" />
            <div class="post-desc">
              <p
                v-if="post.description"
                class="post__content"
                :class="{
                  'post__content--truncated': isPostTruncated(post.description) && !isPostExpanded(post._id),
                  'post__content--expanded': isPostExpanded(post._id),
                }"
              >
                {{ post.description }}
              </p>
              <button
                v-if="isPostTruncated(post.description)"
                @click.prevent.stop="toggleExpandPost(post._id)"
                class="read-more-link"
              >
                {{ isPostExpanded(post._id) ? 'Thu gọn' : 'Xem thêm' }}
              </button>
            </div>
            <div v-if="post.file" class="post__image-wrapper">
              <img :src="`http://localhost:3000/uploads/${post.file}`" class="post__image" />
            </div>
          </div>
        </div>
      </router-link>
    </div>
  </div>
</template>

<script>
import { Skeletor } from "vue-skeletor";
import ProfileImage from "@/components/ProfileImage";
import PostDisplayName from "@/components/PostDisplayName";

export default {
  name: "ProfileUserPosts",
  components: {
    Skeletor,
    PostDisplayName,
    ProfileImage,
  },
  props: ["id"],
  data() {
    return {
      posts: [],
      profilePicture: "",
      userId: "",
      isSkeletorLoading: false,
      currentUser: false,
      expandedPosts: {},
    };
  },
  computed: {
    user() {
      return this.$store.state.user;
    },
  },
  watch: {
    // Watch khi ID thay đổi (chuyển sang profile khác)
    id: {
      handler() {
        this.loadUserPosts();
      },
      immediate: false, // Đã gọi trong created()
    },
  },
  async created() {
    await this.loadUserPosts();
  },
  methods: {
    async loadUserPosts() {
      this.isSkeletorLoading = true;

      try {
  // Đảm bảo loadUser hoàn thành trước
  await this.$store.dispatch("loadUser");
        const { getUserPosts } = await import('@/api/posts');
        const responsePosts = await getUserPosts(this.id);
        if (responsePosts.status === 200) {
          const data = responsePosts.data;
          this.posts = data.sort((p1, p2) => {
            return new Date(p2.createdAt) - new Date(p1.createdAt);
          });
          // Initialize expand state for each post
          const init = {};
          this.posts.forEach(p => { init[p._id] = false; });
          this.expandedPosts = init;
        }

        //is current user - kiểm tra an toàn
        const currentUserId = this.$store.state.user?._id;
        if (currentUserId && this.id === currentUserId) {
          this.currentUser = true;
        } else {
          this.currentUser = false;
        }
      } catch (error) {
  console.error("Load user posts error:", error);
      }

      this.isSkeletorLoading = false;
    },
    isPostTruncated(description) {
      const maxLength = 200;
      return description && description.length > maxLength;
    },
    toggleExpandPost(postId) {
      const current = this.expandedPosts[postId] || false;
      this.expandedPosts = { ...this.expandedPosts, [postId]: !current };
      // Scroll into view when expanding
      if (!current) {
        this.$nextTick(() => {
          try {
            const el = this.$el.querySelector(`[data-post-id="${postId}"]`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } catch (_) {}
        });
      }
    },
    isPostExpanded(postId) {
      return !!this.expandedPosts[postId];
    }
  },
};
</script>

<style scoped>
.profile-posts { width: 800px; min-height: 450px; }
.profile-post { background:#fff; border-radius:1rem; margin-bottom:2rem; transition:.4s; transform:translateY(3px); }
.profile-post:hover { box-shadow: rgb(211,155,155) 3px 3px 6px 0px inset, rgba(255,255,255,.5) -3px -3px 6px 1px inset; transform:translateY(-3px); cursor:pointer; }
.profile-post__link { text-decoration:none; color:inherit; }
.post { display:flex; padding:1.5rem; }
.post__avatar :deep(img) { width:40px; height:40px; border-radius:100%; }
.post__content-wrapper { flex:1; margin-left:1rem; display:flex; flex-direction:column; }
.post-desc { max-width:100%; overflow:hidden; }
.post__content { margin-top:.5rem; font-size:.9rem; white-space:pre-wrap; word-break:break-word; line-height:1.4; transition:all .3s ease; }
.post__content--truncated { max-height:120px; overflow:hidden; position:relative; display:-webkit-box; -webkit-line-clamp:5; line-clamp:5; -webkit-box-orient:vertical; }
.post__content--truncated::after { content:""; position:absolute; bottom:0; left:0; width:100%; height:20px; background:linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,1)); pointer-events:none; }
.post__content--expanded { max-height:none !important; overflow:visible !important; display:block !important; }
.read-more-link { color:#007bff; background:transparent; border:none; font-weight:600; font-size:.85rem; margin-top:.5rem; cursor:pointer; padding:0; }
.read-more-link:hover { color:#0056b3; text-decoration:underline; }
.post__image-wrapper { margin-top:.5rem; }
.post__image { width:95%; max-height:350px; object-fit:cover; border-radius:7px; display:block; }
.skeletor { margin-top:1rem; }
</style>
