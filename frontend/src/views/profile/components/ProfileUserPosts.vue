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
            <div class="post-header">
              <PostDisplayName :id="post.userId" />
              <PostActions 
                :post="post" 
                @edit-post="openEditModal"
                @delete-post="handleDeletePost"
                @click.stop
              />
            </div>
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

    <!-- Edit Post Modal -->
    <PostEditModal
      :show="showEditModal"
      :post="selectedPost"
      @close="closeEditModal"
      @save="handleSavePost"
    />
  </div>
</template>

<script>
import { Skeletor } from "vue-skeletor";
import ProfileImage from "@/components/ProfileImage";
import PostDisplayName from "@/components/PostDisplayName";
import PostActions from "@/components/PostActions.vue";
import PostEditModal from "@/components/PostEditModal.vue";

export default {
  name: "ProfileUserPosts",
  components: {
    Skeletor,
    PostDisplayName,
    ProfileImage,
    PostActions,
    PostEditModal,
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
      showEditModal: false,
      selectedPost: null,
    };
  },
  computed: {
    user() {
      return this.$store.state.user;
    },
    // Theo dõi posts từ store để tự động cập nhật
    storePosts() {
      return this.$store.state.posts;
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
    // Watch posts từ store để cập nhật nếu có bài viết mới
    storePosts: {
      handler() {
        // Chỉ cập nhật nếu đang xem profile của user hiện tại
        const currentUserId = this.$store.state.user?._id;
        if (currentUserId && this.id === currentUserId) {
          this.loadUserPosts();
        }
      },
      immediate: false,
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
    },
    // Post actions methods
    openEditModal(post) {
      this.selectedPost = post;
      this.showEditModal = true;
    },
    closeEditModal() {
      this.showEditModal = false;
      this.selectedPost = null;
    },
    async handleSavePost(updatedPost) {
      try {
        const { editPost } = await import('@/api/posts');
        const currentUserId = this.$store.state.user?._id;
        
        const postData = {
          description: updatedPost.description,
          file: updatedPost.file,
          userId: currentUserId
        };
        
        const response = await editPost(updatedPost._id, postData);
        
        if (response.status === 200) {
          // Update the post in local posts array
          const postIndex = this.posts.findIndex(p => p._id === updatedPost._id);
          if (postIndex !== -1) {
            this.posts.splice(postIndex, 1, response.data.post);
          }
          
          this.closeEditModal();
          
          // Show success message
          console.log('Bài viết đã được cập nhật thành công');
        }
      } catch (error) {
        console.error('Error updating post:', error);
        // Handle error (show error message to user)
      }
    },
    async handleDeletePost(post) {
      try {
        const { deletePost } = await import('@/api/posts');
        const currentUserId = this.$store.state.user?._id;
        
        const response = await deletePost(post._id, currentUserId);
        
        if (response.status === 200) {
          // Remove the post from local posts array
          this.posts = this.posts.filter(p => p._id !== post._id);
          
          // Show success message
          console.log('Bài viết đã được xóa thành công');
        }
      } catch (error) {
        console.error('Error deleting post:', error);
        // Handle error (show error message to user)
      }
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
.post-header { display:flex; align-items:flex-start; justify-content:space-between; width:100%; margin-bottom: -1rem; }
.post-desc { max-width:100%; overflow:hidden; }
.post__content { margin-top:.5rem; font-size:.9rem; white-space:pre-wrap; word-break:break-word; line-height:1.4; transition:all .3s ease;max-width: 95%; }
.post__content--truncated { max-height:120px; overflow:hidden; position:relative; display:-webkit-box; -webkit-line-clamp:5; line-clamp:5; -webkit-box-orient:vertical; }
.post__content--truncated::after { content:""; position:absolute; bottom:0; left:0; width:100%; height:20px; background:linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,1)); pointer-events:none; }
.post__content--expanded { max-height:none !important; overflow:visible !important; display:block !important; }
.read-more-link { color:#007bff; background:transparent; border:none; font-weight:600; font-size:.85rem; margin-top:.5rem; cursor:pointer; padding:0; }
.read-more-link:hover { color:#0056b3; text-decoration:underline; }
.post__image-wrapper { margin-top:.5rem; }
.post__image { width:95%; max-height:350px; object-fit:cover; border-radius:7px; display:block; }
.skeletor { margin-top:1rem; }
</style>
