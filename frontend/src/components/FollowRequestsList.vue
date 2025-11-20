<template>
  <div class="follow-requests">
    <div class="requests-card">
      <div class="requests-header">
        <h2>📬 Yêu cầu theo dõi</h2>
        <span class="requests-count" v-if="requests.length > 0">{{ requests.length }}</span>
      </div>

      <div v-if="loading" class="loading-state">
        <SyncLoader :color="'#667eea'" />
        <span>Đang tải...</span>
      </div>

      <div v-else-if="requests.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <h3>Không có yêu cầu theo dõi</h3>
        <p>Các yêu cầu theo dõi từ người khác sẽ hiển thị ở đây</p>
      </div>

      <div v-else class="requests-list">
        <div 
          v-for="request in requests" 
          :key="request._id" 
          class="request-item"
        >
          <router-link 
            :to="{ name: 'Profile', params: { id: request.fromUser._id } }" 
            class="request-user"
          >
            <img 
              v-if="request.fromUser.profilePicture" 
              :src="request.fromUser.profilePicture" 
              alt="Avatar"
              class="user-avatar"
            />
            <img 
              v-else 
              src="@/assets/defaultProfile.png" 
              alt="Default Avatar"
              class="user-avatar"
            />
            <div class="user-info">
              <div class="user-name">{{ request.fromUser.displayName }}</div>
              <div class="user-email">{{ request.fromUser.email }}</div>
              <div class="request-time">{{ formatTime(request.createdAt) }}</div>
            </div>
          </router-link>

          <div class="request-actions">
            <button 
              class="btn btn-accept"
              @click="acceptRequest(request._id)"
              :disabled="processingRequest === request._id"
            >
              <span v-if="processingRequest !== request._id">Chấp nhận</span>
              <SyncLoader v-else :color="'#fff'" :size="'8px'" />
            </button>
            <button 
              class="btn btn-reject"
              @click="rejectRequest(request._id)"
              :disabled="processingRequest === request._id"
            >
              <span v-if="processingRequest !== request._id">Từ chối</span>
              <SyncLoader v-else :color="'#ef4444'" :size="'8px'" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { createToast } from 'mosha-vue-toastify'
import SyncLoader from 'vue-spinner/src/SyncLoader.vue'
import followRequestsAPI from '@/api/followRequests'

export default {
  name: 'FollowRequestsList',
  components: {
    SyncLoader,
  },
  data() {
    return {
      requests: [],
      loading: true,
      processingRequest: null,
    }
  },
  computed: {
    user() {
      return this.$store.state.user || {}
    },
  },
  async created() {
    await this.loadRequests()
  },
  methods: {
    async loadRequests() {
      this.loading = true
      try {
        const response = await followRequestsAPI.getPendingRequests(this.user._id)
        if (response.status === 200) {
          this.requests = response.data
        }
      } catch (error) {
        console.error('Load requests error:', error)
      } finally {
        this.loading = false
      }
    },

    async acceptRequest(requestId) {
      this.processingRequest = requestId
      try {
        const response = await followRequestsAPI.acceptFollowRequest(requestId, this.user._id)
        
        if (response.status === 200) {
          // Xóa request khỏi danh sách
          this.requests = this.requests.filter(r => r._id !== requestId)
          
          createToast(
            {
              title: 'Đã chấp nhận yêu cầu theo dõi',
            },
            {
              type: 'success',
              showIcon: true,
              timeout: 3000,
            }
          )

          // Cập nhật số lượng followers trong store nếu cần
          await this.$store.dispatch('loadUser')
        }
      } catch (error) {
        console.error('Accept request error:', error)
        createToast(
          {
            title: 'Lỗi',
            description: 'Không thể chấp nhận yêu cầu',
          },
          {
            type: 'danger',
            showIcon: true,
            timeout: 3000,
          }
        )
      } finally {
        this.processingRequest = null
      }
    },

    async rejectRequest(requestId) {
      this.processingRequest = requestId
      try {
        const response = await followRequestsAPI.rejectFollowRequest(requestId, this.user._id)
        
        if (response.status === 200) {
          // Xóa request khỏi danh sách
          this.requests = this.requests.filter(r => r._id !== requestId)
          
          createToast(
            {
              title: 'Đã từ chối yêu cầu theo dõi',
            },
            {
              type: 'info',
              showIcon: true,
              timeout: 3000,
            }
          )
        }
      } catch (error) {
        console.error('Reject request error:', error)
        createToast(
          {
            title: 'Lỗi',
            description: 'Không thể từ chối yêu cầu',
          },
          {
            type: 'danger',
            showIcon: true,
            timeout: 3000,
          }
        )
      } finally {
        this.processingRequest = null
      }
    },

    formatTime(timestamp) {
      const now = new Date()
      const time = new Date(timestamp)
      const diff = Math.floor((now - time) / 1000) // seconds

      if (diff < 60) return 'Vừa xong'
      if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
      if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
      if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`
      return time.toLocaleDateString('vi-VN')
    },
  },
}
</script>

<style scoped>
.follow-requests {
  max-width: 600px;
  margin: 2rem auto;
  padding: 0 1rem;
}

.requests-card {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.requests-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.requests-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.requests-count {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 0;
  gap: 1rem;
  color: #6b7280;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: #6b7280;
  font-size: 0.9375rem;
}

.requests-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.request-item {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%);
  border-radius: 12px;
  border: 1px solid rgba(102, 126, 234, 0.1);
  transition: all 0.2s ease;
}

.request-item:hover {
  border-color: rgba(102, 126, 234, 0.3);
  transform: translateX(4px);
}

.request-user {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  text-decoration: none;
  color: inherit;
}

.user-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.user-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 1rem;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.request-time {
  color: #9ca3af;
  font-size: 0.8125rem;
}

.request-actions {
  display: flex;
  gap: 0.75rem;
  padding-left: 66px; /* Avatar (50px) + gap (1rem = 16px) */
}

.btn {
  padding: 0.625rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-accept {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-accept:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-reject {
  background: white;
  color: #ef4444;
  border: 2px solid #ef4444;
}

.btn-reject:not(:disabled):hover {
  background: #ef4444;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

@media (max-width: 640px) {
  .requests-card {
    padding: 1.5rem;
  }

  .request-actions {
    padding-left: 0;
    width: 100%;
  }

  .btn {
    flex: 1;
  }
}
</style>
