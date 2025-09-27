<template>
  <a-popover
    trigger="hover"
    placement="top"
    overlayClassName="hover-user-list-popover"
    v-model:open="open"
    @openChange="onOpenChange"
    :getPopupContainer="popupContainer"
  >
    <template #content>
      <div class="hover-list">
        <div v-if="loading" class="hover-loading">Đang tải...</div>
        <ul v-else class="hover-ul">
          <li v-for="u in items" :key="u._id" class="hover-li">
            <span class="hover-name">{{ u.displayName || u.email || 'Người dùng' }}</span>
          </li>
          <li v-if="hasMore" class="hover-more">và {{ remaining }} người khác</li>
          <li v-if="!items.length && !loading" class="hover-empty">Chưa có dữ liệu</li>
        </ul>
      </div>
    </template>
    <slot />
  </a-popover>
</template>

<script>
export default {
  name: 'HoverUserList',
  components: {},
  props: {
    postId: { type: String, required: true },
    type: { type: String, required: true }, // 'likes' | 'comments'
    limit: { type: Number, default: 10 },
    refreshKey: { type: [Number, String], default: 0 },
    // Optional: CSS selector to force container (e.g., '.post-detail')
    containerSelector: { type: String, default: '' },
  },
  data() {
    return {
      open: false,
      loading: false,
      loaded: false,
      items: [],
      hasMore: false,
      remaining: 0,
    };
  },
  methods: {
    onOpenChange(visible) {
      this.open = visible;
      if (visible) this.loadIfNeeded();
    },
    popupContainer(triggerNode) {
      if (this.containerSelector) {
        const el = document.querySelector(this.containerSelector);
        if (el) return el;
      }
      return document.body;
    },
    reset() {
      this.loaded = false;
      this.items = [];
      this.hasMore = false;
      this.remaining = 0;
    },
    async loadIfNeeded() {
      if (this.loaded || this.loading) return;
      this.loading = true;
      try {
        if (this.type === 'likes') {
          const { getLikes } = await import('@/api/posts');
          const res = await getLikes(this.postId);
          const likedUsers = Array.isArray(res?.data?.likedUsers) ? res.data.likedUsers : [];
          this.items = likedUsers.slice(0, this.limit);
          this.hasMore = likedUsers.length > this.items.length;
          this.remaining = Math.max(0, likedUsers.length - this.items.length);
          this.loaded = true;
        } else if (this.type === 'comments') {
          const { getPostComments } = await import('@/api/posts');
          const res = await getPostComments(this.postId);
          const comments = Array.isArray(res?.data) ? res.data : (res?.data?.comments || []);
          const userIds = [...new Set(comments.map(c => c.userId).filter(Boolean))];

          const { getUser } = await import('@/api/users');
          const ids = userIds.slice(0, this.limit);
          const users = await Promise.all(
            ids.map(id => getUser(id).then(r => r.data).catch(() => ({ _id: id })))
          );

          this.items = users;
          this.hasMore = userIds.length > ids.length;
          this.remaining = Math.max(0, userIds.length - ids.length);
          this.loaded = true;
        }
      } catch (e) {
        console.error('HoverUserList load error:', e);
        this.items = [];
      } finally {
        this.loading = false;
      }
    },
  },
  watch: {
    postId() { this.reset(); },
    type() { this.reset(); },
    refreshKey() { this.reset(); },
  },
};
</script>

<style scoped>
.hover-ul { list-style: none; padding: 0; margin: 0; max-width: 260px; }
.hover-li { display: flex; align-items: center; padding: 4px 0; }
.hover-name { font-size: 13px; color: #111; }
.hover-loading, .hover-empty, .hover-more { font-size: 12px; color: #666; }
</style>

<style>
/* Facebook-like popover styling for the overlay root */
.hover-user-list-popover .ant-popover-inner {
  padding: 8px 10px;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08);
}

.hover-user-list-popover {
  z-index: 4000; /* Above modal and page content */
}

.hover-user-list-popover .hover-ul {
  min-width: 180px;
  max-width: 280px;
  padding: 4px 0;
}

.hover-user-list-popover .hover-li {
  padding: 6px 8px;
  border-radius: 8px;
  cursor: default;
  transition: background-color 0.15s ease-in-out;
}

.hover-user-list-popover .hover-li:hover {
  background: #f2f3f5; /* FB hover background */
}

.hover-user-list-popover .hover-name {
  font-size: 13px;
  color: #050505;
  font-weight: 500; /* slightly bold like FB */
}

.hover-user-list-popover .hover-loading,
.hover-user-list-popover .hover-empty,
.hover-user-list-popover .hover-more {
  font-size: 12px;
  color: #65676b; /* FB secondary text */
  padding: 6px 8px;
}

.hover-user-list-popover .ant-popover-arrow::after {
  background: #fff;
}
</style>