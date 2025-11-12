<template>
  <div class="privacy-settings">
    <!-- <div class="section-header">
      <h2>Quyền riêng tư</h2>
      <p>Quản lý ai có thể xem nội dung và theo dõi bạn</p>
    </div> -->

    <div class="privacy-card">
      <div class="privacy-option">
        <div class="option-info">
          <div class="option-icon" :class="{ private: user.isPrivate }">
            {{ user.isPrivate ? '🔒' : '🌍' }}
          </div>
          <div class="option-content">
            <h3>{{ user.isPrivate ? 'Tài khoản riêng tư' : 'Tài khoản công khai' }}</h3>
            <p v-if="user.isPrivate">
              Chỉ người bạn chấp nhận mới có thể theo dõi và xem bài đăng của bạn
            </p>
            <p v-else>
              Ai cũng có thể theo dõi và xem bài đăng của bạn
            </p>
          </div>
        </div>

        <label class="toggle-switch">
          <input 
            type="checkbox" 
            :checked="user.isPrivate" 
            @change="togglePrivacy"
            :disabled="loading"
          />
          <span class="slider"></span>
        </label>
      </div>

      <div class="privacy-info" v-if="user.isPrivate">
        <div class="info-item">
          <span class="info-icon">✓</span>
          <span>Người khác phải gửi yêu cầu theo dõi</span>
        </div>
        <div class="info-item">
          <span class="info-icon">✓</span>
          <span>Bạn có thể chấp nhận hoặc từ chối yêu cầu</span>
        </div>
        <div class="info-item">
          <span class="info-icon">✓</span>
          <span>Chỉ người theo dõi mới xem được bài đăng</span>
        </div>
        
        <!-- Follow Requests Button -->
        <div class="follow-requests-link">
          <button @click="showFollowRequestsModal = true" class="requests-btn">
            <span class="material-icons">group_add</span>
            <span>Quản lý yêu cầu theo dõi</span>
            <span v-if="pendingRequestsCount > 0" class="requests-badge">
              {{ pendingRequestsCount }}
            </span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Follow Requests Modal -->
    <FollowRequestsModal
      v-if="showFollowRequestsModal"
      @close="showFollowRequestsModal = false"
      @request-updated="loadPendingRequestsCount"
    />
  </div>
</template>

<script>
import { createToast } from 'mosha-vue-toastify'
import followRequestsAPI from '@/api/followRequests'
import FollowRequestsModal from '@/components/FollowRequestsModal.vue'

export default {
  name: 'PrivacySettings',
  components: {
    FollowRequestsModal,
  },
  data() {
    return {
      loading: false,
      pendingRequestsCount: 0,
      showFollowRequestsModal: false,
    }
  },
  computed: {
    user() {
      return this.$store.state.user || {}
    },
  },
  async mounted() {
    // Load pending requests count nếu tài khoản riêng tư
    if (this.user.isPrivate) {
      await this.loadPendingRequestsCount()
    }
  },
  watch: {
    'user.isPrivate': {
      handler(newVal) {
        if (newVal) {
          this.loadPendingRequestsCount()
        } else {
          this.pendingRequestsCount = 0
        }
      }
    }
  },
  methods: {
    async loadPendingRequestsCount() {
      try {
        const response = await followRequestsAPI.getPendingRequests(this.user._id)
        if (response.status === 200) {
          this.pendingRequestsCount = response.data.length
        }
      } catch (error) {
        console.error('Load pending requests count error:', error)
      }
    },
    async togglePrivacy(event) {
      const isPrivate = event.target.checked
      this.loading = true

      try {
        const response = await followRequestsAPI.updatePrivacy(this.user._id, isPrivate)

        if (response.status === 200) {
          // Cập nhật store
          this.$store.commit('SET_USER', {
            ...this.user,
            isPrivate,
          })

          createToast(
            {
              title: isPrivate
                ? 'Đã chuyển sang tài khoản riêng tư'
                : 'Đã chuyển sang tài khoản công khai',
              description: isPrivate
                ? 'Bây giờ người khác cần gửi yêu cầu để theo dõi bạn'
                : 'Bây giờ ai cũng có thể theo dõi bạn',
            },
            {
              type: 'success',
              showIcon: true,
              timeout: 3000,
            }
          )
          
          // Reload pending requests count nếu chuyển sang private
          if (isPrivate) {
            await this.loadPendingRequestsCount()
          } else {
            this.pendingRequestsCount = 0
          }
        }
      } catch (error) {
        console.error('Toggle privacy error:', error)
        // Revert checkbox nếu có lỗi
        event.target.checked = !isPrivate
        createToast(
          {
            title: 'Lỗi',
            description: 'Không thể cập nhật cài đặt quyền riêng tư',
          },
          {
            type: 'danger',
            showIcon: true,
            timeout: 3000,
          }
        )
      } finally {
        this.loading = false
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.privacy-settings {
  max-width: 700px;
}

// .section-header {
//   margin-bottom: 24px;
// }

// .section-header h2 {
//   font-size: 20px;
//   font-weight: 600;
//   color: #262626;
//   margin-bottom: 6px;
// }

// .section-header p {
//   font-size: 14px;
//   color: #8e8e8e;
//   margin: 0;
// }

.privacy-card {
  background: #fafafa;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #efefef;
}

.privacy-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background: white;
  border-radius: 12px;
  margin-bottom: 16px;
  border: 1px solid #efefef;
  transition: all 0.2s ease;
}

.privacy-option:hover {
  border-color: #dbdbdb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.option-info {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.option-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.option-icon.private {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(239, 68, 68, 0.1) 100%);
}

.option-content h3 {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 4px;
}

.option-content p {
  font-size: 13px;
  color: #8e8e8e;
  margin: 0;
  line-height: 1.4;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 56px;
  height: 30px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #dbdbdb;
  transition: 0.3s;
  border-radius: 30px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

input:checked + .slider {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

input:checked + .slider:before {
  transform: translateX(26px);
}

input:disabled + .slider {
  opacity: 0.5;
  cursor: not-allowed;
}

.privacy-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #262626;
  padding: 12px 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #efefef;
}

.info-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #667eea;
  font-weight: 700;
  flex-shrink: 0;
}

.follow-requests-link {
  margin-top: 8px;
}

.requests-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  position: relative;
  width: 100%;
}

.requests-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.requests-btn .material-icons {
  font-size: 20px;
}

.requests-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: linear-gradient(135deg, #ff6b6b 0%, #ff3040 100%);
  color: white;
  border-radius: 50%;
  min-width: 24px;
  height: 24px;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(255, 48, 64, 0.4);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.material-icons {
  font-family: 'Material Icons';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
}

@media (max-width: 640px) {
  .privacy-card {
    padding: 16px;
  }

  .privacy-option {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .option-info {
    width: 100%;
  }
  
  .option-icon {
    width: 48px;
    height: 48px;
    font-size: 24px;
  }
  
  .toggle-switch {
    align-self: flex-end;
  }
}
</style>
