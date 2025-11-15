import { Commit, createStore } from "vuex";
import * as authApi from "@/api/auth";
import * as postsApi from "@/api/posts";
import MessageAPI from "@/api/messages";

export default createStore({
  state: {
    user: {},
    posts: [],
    postsPage: 1,
    postsHasMore: true,
    postsLoading: false,
    isUserLoaded: false, // Thêm flag để tránh load user nhiều lần
    usersById: {}, // Cache user theo id để tránh N+1 requests
    // Message related state
    conversations: [],
    activeConversation: null,
    messages: [],
    unreadCount: 0,
    messageLoading: false,
    // Notification related state
    notifications: {
      list: [],
      unreadCount: 0,
      loading: false,
      hasMore: true,
      currentPage: 1
    }
  },
  getters: {
    // Message related getters
    activeConversation: state => state.activeConversation,
    conversationById: state => id => state.conversations.find(c => c._id === id),
    unreadCount: state => state.unreadCount,
    sortedConversations: state => {
      return [...state.conversations].sort((a, b) => {
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
      });
    },
    // Notification related getters
    recentNotifications: state => {
      return state.notifications.list; // Lấy tất cả notifications cho dropdown (hỗ trợ load more)
    },
    notificationUnreadCount: state => state.notifications.unreadCount,
    allNotifications: state => state.notifications.list,
    notificationsLoading: state => state.notifications.loading
  },
  actions: {
    async loadUser({ commit, state }) {
  // Nếu user đã được load rồi thì không load lại
      if (state.isUserLoaded && state.user?._id) {
        return;
      }

      try {
        const response = await authApi.getCurrentUser();
        if (response.status === 200) {
          commit("SET_USER", response.data.user);
          commit("SET_USER_LOADED", true);
        }
      } catch (error) {
        console.error("Load user error:", error);
      }
    },
    async loadPosts({ commit, dispatch, state }, { page = 1, append = false } = {}) {
      try {
        commit('SET_POSTS_LOADING', true);
        
        // Đảm bảo user đã được load trước
        if (!state.isUserLoaded) {
          await dispatch("loadUser");
        }

        const currentUser = state.user?._id;
        if (!currentUser) {
          console.error("No current user found");
          commit('SET_POSTS_LOADING', false);
          return;
        }

        const responsePosts = await postsApi.getTimeline(currentUser, page, 6);
        if (responsePosts.status === 200) {
          const data = responsePosts.data;
          const posts = data.posts || [];

          // Enrich each post with like status/count via like-status endpoint
          const enriched = await Promise.all(
            posts.map(async (p) => {
              try {
                const res = await postsApi.getReactionStatus(p._id, currentUser);
                if (res.status === 200) {
                  return {
                    ...p,
                    userReaction: res.data?.userReaction || null,
                    reactionsCount: res.data?.reactionsCount || {},
                    isLiked: !!res.data?.userReaction,
                    likesCount:
                      typeof res.data?.likesCount === "number"
                        ? res.data.likesCount
                        : p.likesCount || 0,
                  };
                }
              } catch (_) {
                // ignore and fallback
              }
              return {
                ...p,
                userReaction: null,
                reactionsCount: {},
                isLiked: Array.isArray(p.likes)
                  ? p.likes.includes(currentUser)
                  : false,
                likesCount: typeof p.likesCount === "number" ? p.likesCount : 0,
              };
            })
          );

          if (append) {
            commit("APPEND_POSTS", enriched);
          } else {
            commit("SET_POSTS", enriched);
          }
          
          commit("SET_POSTS_PAGE", page);
          commit("SET_POSTS_HAS_MORE", data.hasMore || false);
        }
      } catch (error) {
        console.error("Load posts error:", error);
      } finally {
        commit('SET_POSTS_LOADING', false);
      }
    },
    async addPost({ commit, dispatch }, { post, formData = null }) {
      try {
        // Tạo post trước
        const postResponse = await postsApi.createPost(post);

        let uploadSuccess = true;

        // Chỉ upload file nếu có formData
        if (formData) {
          const uploadResponse = await postsApi.uploadPostFile(formData);
          uploadSuccess = uploadResponse.status === 200;
        }

        if (postResponse.status === 200 && uploadSuccess) {
          // Thay vì ADD_POST với dữ liệu cũ, load lại posts để có dữ liệu đầy đủ
          await dispatch("loadPosts");
          return { success: true, post: postResponse.data };
        }
      } catch (error) {
        console.error("Add post error:", error);
        throw error;
      }
    },
    async editPost({ commit }, { postId, updatedPost }) {
      try {
        const response = await postsApi.editPost(postId, updatedPost);
        if (response.status === 200) {
          commit("UPDATE_POST", {
            postId,
            updatedData: response.data.post
          });
          return response;
        }
      } catch (error) {
        console.error("Edit post error:", error);
        throw error;
      }
    },
    async deletePost({ commit }, { postId, userId }) {
      try {
        const response = await postsApi.deletePost(postId, userId);
        if (response.status === 200) {
          commit("DELETE_POST", postId);
          return response;
        }
      } catch (error) {
        console.error("Delete post error:", error);
        throw error;
      }
    },
    async refreshToken() {
      try {
        const response = await authApi.refreshToken();
        if (response.status === 200) {
          localStorage.setItem("token", response.data.refreshToken);
          return response.data;
        }
        throw new Error("Refresh token failed");
      } catch (error) {
        console.error("Refresh token error:", error);
        throw error;
      }
    },

    // Message related actions
    async loadConversations({ commit, dispatch, state }) {
      commit('SET_MESSAGE_LOADING', true);
      try {
        // Ensure user is loaded
        if (!state.isUserLoaded) {
          await dispatch('loadUser');
        }

        const response = await MessageAPI.getConversations();
        if (response.status === 200) {
          const conversations = response.data || [];
          commit('SET_CONVERSATIONS', conversations);
          
          // Calculate unread count
          const unreadCount = conversations.reduce((count, conv) => count + (conv.unread || 0), 0);
          commit('SET_UNREAD_COUNT', unreadCount);
        }
      } catch (error) {
        console.error('Load conversations error:', error);
      } finally {
        commit('SET_MESSAGE_LOADING', false);
      }
    },
    
    async loadMessages({ commit }, conversationId) {
      commit('SET_MESSAGE_LOADING', true);
      try {
        const response = await MessageAPI.getMessages(conversationId);
        if (response.status === 200) {
          commit('SET_MESSAGES', response.data || []);
          commit('SET_ACTIVE_CONVERSATION', conversationId);
          
          // Mark messages as read
          await MessageAPI.markAsRead(conversationId);
          commit('MARK_CONVERSATION_READ', conversationId);
        }
      } catch (error) {
        console.error('Load messages error:', error);
      } finally {
        commit('SET_MESSAGE_LOADING', false);
      }
    },
    
    async sendMessage({ commit, state }, { conversationId, content, file }) {
      try {
        const response = await MessageAPI.sendMessage(conversationId, { content, file });
        if (response.status === 200) {
          const newMessage = response.data;
          commit('ADD_MESSAGE', newMessage);
          commit('UPDATE_CONVERSATION_LAST_MESSAGE', {
            conversationId,
            message: content,
            timestamp: new Date()
          });
        }
        return response;
      } catch (error) {
        console.error('Send message error:', error);
        throw error;
      }
    },
    
    async createConversation({ commit, dispatch }, recipientId) {
      try {
        const response = await MessageAPI.createOrGetConversation(recipientId);
        if (response.status === 200) {
          const conversation = response.data;
          commit('ADD_CONVERSATION', conversation);
          return conversation._id;
        }
        return null;
      } catch (error) {
        console.error('Create conversation error:', error);
        return null;
      }
    },
    
    // Action xử lý theo dõi và bỏ theo dõi người dùng
    async updateUserFollowing({ commit, state }, { action, targetUserId }) {
      if (!state.user || !state.user._id) {
        console.error("No user logged in");
        return;
      }
      
      try {
        if (action === "follow") {
          // Thêm userId vào mảng followings nếu chưa có
          commit("UPDATE_USER_FOLLOWINGS", { action: "add", targetUserId });
        } else if (action === "unfollow") {
          // Xóa userId khỏi mảng followings nếu có
          commit("UPDATE_USER_FOLLOWINGS", { action: "remove", targetUserId });
        }
      } catch (error) {
        console.error("Update user following error:", error);
      }
    },

    // Notification related actions
    async loadNotifications({ commit, dispatch, state }, { page = 1, limit = 20 } = {}) {
      commit('SET_NOTIFICATIONS_LOADING', true);
      try {
        const { getNotifications } = await import('@/api/notifications');
        const response = await getNotifications(page, limit);
        
        if (response.status === 200) {
          const notifications = response.data.notifications || [];
          const hasMore = response.data.hasMore || false;
          
          if (page === 1) {
            // Reset notifications khi load trang đầu
            commit('SET_NOTIFICATIONS', notifications);
          } else {
            // Append notifications khi load more
            commit('ADD_NOTIFICATIONS', notifications);
          }
          
          commit('SET_NOTIFICATIONS_PAGE', page);
          commit('SET_NOTIFICATIONS_HAS_MORE', hasMore);
          
          // Cập nhật số lượng thông báo chưa đọc
          await dispatch('loadNotificationUnreadCount');
        }
      } catch (error) {
        console.error('Load notifications error:', error);
      } finally {
        commit('SET_NOTIFICATIONS_LOADING', false);
      }
    },
    
    async loadNotificationUnreadCount({ commit }) {
      try {
        const { getUnreadCount } = await import('@/api/notifications');
        const response = await getUnreadCount();
        
        if (response.status === 200) {
          commit('SET_NOTIFICATION_UNREAD_COUNT', response.data.count || 0);
        }
      } catch (error) {
        console.error('Load notification unread count error:', error);
      }
    },
    
    async markNotificationAsRead({ commit }, notificationId) {
      try {
        const { markAsRead } = await import('@/api/notifications');
        const response = await markAsRead(notificationId);
        
        if (response.status === 200) {
          commit('MARK_NOTIFICATION_READ', notificationId);
        }
      } catch (error) {
        console.error('Mark notification as read error:', error);
        throw error;
      }
    },
    
    async markAllNotificationsAsRead({ commit, dispatch }) {
      try {
        const { markAllAsRead } = await import('@/api/notifications');
        const response = await markAllAsRead();
        
        if (response.status === 200) {
          commit('MARK_ALL_NOTIFICATIONS_READ');
          await dispatch('loadNotificationUnreadCount');
        }
      } catch (error) {
        console.error('Mark all notifications as read error:', error);
        throw error;
      }
    },
    
    async addNewNotification({ commit }, notification) {
      commit('ADD_NEW_NOTIFICATION', notification);
      commit('INCREMENT_NOTIFICATION_UNREAD_COUNT');
    },
    
    // Action để cập nhật avatar user
    async updateUserAvatar({ commit, dispatch }, { userId, profilePicture }) {
      commit('UPDATE_USER_AVATAR', { userId, profilePicture });
      
      // Reload current user nếu cập nhật avatar của chính mình
      const currentUser = this.state.user;
      if (currentUser && currentUser._id === userId) {
        await dispatch('loadUser');
      }
    },
    
    // Action để reload timeline (gọi từ logo click)
    async reloadTimeline({ dispatch }) {
      console.log('🔄 Reloading timeline from store...');
      try {
        // Reset về trang 1 và load lại posts
        await dispatch('loadPosts', { page: 1, append: false });
      } catch (error) {
        console.error('Reload timeline error:', error);
      }
    }
  },
  mutations: {
    SET_USER(state, user) {
      state.user = user;
    },
    SET_USER_LOADED(state, isLoaded) {
      state.isUserLoaded = isLoaded;
    },
    // ✅ Add clearUser mutation
    clearUser(state) {
      state.user = {};
      state.isUserLoaded = false;
      state.conversations = [];
      state.messages = [];
      state.unreadCount = 0;
      state.notifications = {
        list: [],
        unreadCount: 0,
        loading: false,
        hasMore: true,
        currentPage: 1
      };
    },
    CACHE_USER(state, user) {
      if (user && user._id) {
        state.usersById = { ...state.usersById, [user._id]: user };
      }
    },
    SET_POSTS(state, posts) {
      state.posts = posts;
    },
    APPEND_POSTS(state, posts) {
      state.posts = [...state.posts, ...posts];
    },
    SET_POSTS_PAGE(state, page) {
      state.postsPage = page;
    },
    SET_POSTS_HAS_MORE(state, hasMore) {
      state.postsHasMore = hasMore;
    },
    SET_POSTS_LOADING(state, loading) {
      state.postsLoading = loading;
    },
    ADD_POST(state, post) {
      // Thêm bài viết mới vào đầu danh sách (hiển thị mới nhất trước)
      state.posts.unshift(post);
    },
    UPDATE_POST_LIKE(state, { postId, isLiked, likesCount, userReaction, reactionsCount }) {
      const idx = state.posts.findIndex((p) => p._id === postId);
      if (idx !== -1) {
        // Create completely new object to trigger reactivity
        const updatedPost = {
          ...state.posts[idx],
          isLiked,
          userReaction: userReaction || null,
          reactionsCount: { ...(reactionsCount || {}) }, // Deep clone
          likesCount:
            typeof likesCount === "number"
              ? likesCount
              : state.posts[idx].likesCount || 0,
        };
        
        // Replace the entire array to ensure Vue 3 tracks the change
        state.posts = [
          ...state.posts.slice(0, idx),
          updatedPost,
          ...state.posts.slice(idx + 1)
        ];
        
        console.log('Store UPDATE_POST_LIKE:', {
          postId,
          updatedPost,
          reactionsCount: updatedPost.reactionsCount
        });
      }
    },
    UPDATE_POST(state, { postId, updatedData }) {
      const idx = state.posts.findIndex((p) => p._id === postId);
      if (idx !== -1) {
        state.posts[idx] = {
          ...state.posts[idx],
          ...updatedData,
        };
      }
    },
    DELETE_POST(state, postId) {
      const idx = state.posts.findIndex((p) => p._id === postId);
      if (idx !== -1) {
        state.posts.splice(idx, 1);
      }
    },
    UPDATE_USER_AVATAR(state, { userId, profilePicture }) {
      // Cập nhật avatar trong user state nếu là current user
      if (state.user && state.user._id === userId) {
        state.user.profilePicture = profilePicture;
      }
      
      // Cập nhật avatar trong cache usersById
      if (state.usersById[userId]) {
        state.usersById[userId].profilePicture = profilePicture;
      }
    },
    
    // Message related mutations
    SET_MESSAGE_LOADING(state, isLoading) {
      state.messageLoading = isLoading;
    },
    SET_CONVERSATIONS(state, conversations) {
      state.conversations = conversations;
    },
    ADD_CONVERSATION(state, conversation) {
      const existing = state.conversations.findIndex(c => c._id === conversation._id);
      if (existing !== -1) {
        state.conversations.splice(existing, 1, conversation);
      } else {
        state.conversations.push(conversation);
      }
    },
    SET_ACTIVE_CONVERSATION(state, conversationId) {
      state.activeConversation = conversationId;
    },
    SET_MESSAGES(state, messages) {
      state.messages = messages;
    },
    ADD_MESSAGE(state, message) {
      state.messages.push(message);
    },
    MARK_CONVERSATION_READ(state, conversationId) {
      const conversation = state.conversations.find(c => c._id === conversationId);
      if (conversation) {
        const oldUnread = conversation.unread || 0;
        conversation.unread = 0;
        state.unreadCount = Math.max(0, state.unreadCount - oldUnread);
      }
    },
    SET_UNREAD_COUNT(state, count) {
      state.unreadCount = count;
    },
    UPDATE_CONVERSATION_LAST_MESSAGE(state, { conversationId, message, timestamp }) {
      const conversation = state.conversations.find(c => c._id === conversationId);
      if (conversation) {
        conversation.lastMessage = message;
        conversation.lastMessageTime = timestamp;
      }
    },
    
    // Mutation để cập nhật mảng followings của user
    UPDATE_USER_FOLLOWINGS(state, { action, targetUserId }) {
      if (!state.user) return;
      
      // Đảm bảo mảng followings tồn tại
      if (!state.user.followings) {
        state.user.followings = [];
      }
      
      if (action === "add") {
        // Thêm targetUserId vào mảng followings nếu chưa tồn tại
        if (!state.user.followings.includes(targetUserId)) {
          state.user.followings.push(targetUserId);
        }
      } else if (action === "remove") {
        // Xóa targetUserId khỏi mảng followings
        const index = state.user.followings.indexOf(targetUserId);
        if (index !== -1) {
          state.user.followings.splice(index, 1);
        }
      }
    },

    // Notification related mutations
    SET_NOTIFICATIONS_LOADING(state, loading) {
      state.notifications.loading = loading;
    },
    
    SET_NOTIFICATIONS(state, notifications) {
      state.notifications.list = notifications;
    },
    
    ADD_NOTIFICATIONS(state, notifications) {
      state.notifications.list.push(...notifications);
    },
    
    SET_NOTIFICATIONS_PAGE(state, page) {
      state.notifications.currentPage = page;
    },
    
    SET_NOTIFICATIONS_HAS_MORE(state, hasMore) {
      state.notifications.hasMore = hasMore;
    },
    
    SET_NOTIFICATION_UNREAD_COUNT(state, count) {
      state.notifications.unreadCount = count;
    },
    
    MARK_NOTIFICATION_READ(state, notificationId) {
      const notification = state.notifications.list.find(n => n._id === notificationId);
      if (notification && !notification.isRead) {
        notification.isRead = true;
        state.notifications.unreadCount = Math.max(0, state.notifications.unreadCount - 1);
      }
    },
    
    MARK_ALL_NOTIFICATIONS_READ(state) {
      state.notifications.list.forEach(notification => {
        notification.isRead = true;
      });
      state.notifications.unreadCount = 0;
    },
    
    ADD_NEW_NOTIFICATION(state, notification) {
      state.notifications.list.unshift(notification);
    },
    
    INCREMENT_NOTIFICATION_UNREAD_COUNT(state) {
      state.notifications.unreadCount += 1;
    }
  },
});
