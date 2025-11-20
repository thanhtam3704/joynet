<template>
<Teleport to="body">
  <div v-if="openEditProfile" class="pe-overlay" @click.self="closeModal">
    <div class="pe-modal" role="dialog" aria-modal="true" aria-labelledby="pe-title">
      <div class="pe-header">
        <h2 id="pe-title">Chỉnh sửa trang cá nhân</h2>
        <button class="pe-close" @click="closeModal" aria-label="Đóng">&times;</button>
      </div>
      <form class="pe-body" @submit.prevent="editProfile">
        <div v-if="isLoadingUserData" class="pe-loading">
          <sync-loader :color="color" size="10" />
          <span>Đang tải thông tin...</span>
        </div>
        <div class="pe-section pe-avatar-section">
          <div class="pe-avatar-wrapper">
            <img 
              v-if="previewAvatar"
              :src="previewAvatar" 
              class="pe-avatar" 
              alt="Avatar preview"
            />
            <img 
              v-else-if="user.profilePicture"
              :src="user.profilePicture || require('@/assets/defaultProfile.png')" 
              class="pe-avatar" 
              alt="Current avatar"
              @error="handleImageError"
            />
            <img 
              v-else
              src="@/assets/defaultProfile.png" 
              class="pe-avatar" 
              alt="Default avatar"
            />
            <div class="pe-avatar-actions">
              <button type="button" class="pe-btn-secondary" @click="triggerAvatar">Đổi ảnh đại diện</button>
              <input ref="file" type="file" class="hidden-input" accept="image/*" @change="onFileChange" />
            </div>
          </div>
        </div>
        <div class="pe-section">
          <label class="pe-field">
            <span class="pe-field__label">Tên hiển thị</span>
            <input type="text" v-model.trim="displayName" class="pe-input" maxlength="80" />
          </label>
          <label class="pe-field">
            <span class="pe-field__label">Giới thiệu bản thân</span>
            <textarea v-model.trim="description" class="pe-textarea" rows="3" maxlength="300" />
            <div class="pe-counter">{{ description.length }}/300</div>
          </label>
          <label class="pe-field">
            <span class="pe-field__label">Sở thích</span>
            <input type="text" v-model.trim="hobbies" class="pe-input" maxlength="120" />
          </label>
          <label class="pe-field inline">
            <span class="pe-field__label">Ngày sinh</span>
            <input type="date" v-model="birthDate" class="pe-input date" />
          </label>
        </div>
        <div v-if="fillError" class="pe-error">Vui lòng điền đầy đủ các trường bắt buộc.</div>
        <div class="pe-footer">
          <button type="button" class="pe-btn pe-btn-ghost" @click="closeModal">Hủy</button>
          <button type="submit" class="pe-btn pe-btn-primary" :disabled="isLoading || !canSave">
            <span v-if="!isLoading">Lưu thay đổi</span>
            <sync-loader v-else :color="color" size="8" />
          </button>
        </div>
      </form>
    </div>
  </div>
</Teleport>
</template>

<script>
import SyncLoader from "vue-spinner/src/SyncLoader.vue";
import { createToast } from "mosha-vue-toastify";

export default {
  name: "ProfileEdit",
  components: {
    SyncLoader,
  },
  data() {
    return {
      displayName: "",
      description: "",
      birthDate: "",
      hobbies: "",
      openEditProfile: true,
      isLoading: false,
      isLoadingUserData: false,
      fillError: false,
      color: "pink",
      editingSuccess: "",
      file: null,
      previewAvatar: "",
      savedScrollY: 0,
    };
  },
  computed: {
    user() {
      // Chỉ cho phép chỉnh sửa thông tin của chính mình (current user)
      return this.$store.state.user || {};
    },

    initials() {
      return (this.displayName || this.user?.displayName || "?")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0,2)
        .map(p=>p[0].toUpperCase())
        .join("");
    },
    canSave() {
      return !!this.displayName && !!this.description && !!this.birthDate && !!this.hobbies;
    }
  },
  async mounted() {
    await this.loadUserData();
  },
  async created() {
    // Load dữ liệu ngay khi component được tạo
    await this.loadUserData();
  },
  methods: {
    async loadUserData() {
      console.log('Loading current user data for edit');
      this.isLoadingUserData = true;
      try {
        // Chỉ load thông tin của current user
        await this.$store.dispatch("loadUser");
        await this.$nextTick();
        
        const user = this.$store.state.user || {};
        this.displayName = user.displayName || '';
        this.description = user.description || '';
        this.birthDate = user.birthDate || '';
        this.hobbies = user.hobbies || '';
        
        console.log('Loaded current user data:', user);
      } catch (error) {
        console.error('Error loading user data:', error);
        
        // Fallback: thử load từ store
        const user = this.$store.state.user || {};
        this.displayName = user.displayName || '';
        this.description = user.description || '';
        this.birthDate = user.birthDate || '';
        this.hobbies = user.hobbies || '';
      } finally {
        this.isLoadingUserData = false;
      }
    },
    handleImageError(event) {
      console.log('Image load error, using default profile');
      event.target.src = require('@/assets/defaultProfile.png');
    },
    triggerAvatar() { this.$refs.file && this.$refs.file.click(); },
    onFileChange() {
      const file = this.$refs.file.files[0];
      this.file = file;
      if (file) {
        const reader = new FileReader();
        reader.onload = e => { this.previewAvatar = e.target.result; };
        reader.readAsDataURL(file);
      }
    },
    closeModal() { this.openEditProfile = false; },
    lockScroll() {
      if (typeof window === 'undefined') return;
      this.savedScrollY = window.scrollY || 0;
      const body = document.body;
      if (body.dataset.modalLocked) return; // prevent duplicate
      body.dataset.modalLocked = 'true';
      body.style.position = 'fixed';
      body.style.top = `-${this.savedScrollY}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
      body.style.overflow = 'hidden';
    },
    unlockScroll() {
      if (typeof window === 'undefined') return;
      const body = document.body;
      if (!body.dataset.modalLocked) return;
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.width = '';
      body.style.overflow = '';
      delete body.dataset.modalLocked;
      window.scrollTo(0, this.savedScrollY || 0);
    },
    async editProfile() {
      // Chỉ cho phép chỉnh sửa thông tin của chính mình
      const currentUserId = this.$store.state.user?._id;
      
      if (!currentUserId) {
        console.error('No current user found');
        return;
      }

      if (!this.displayName || !this.description || !this.birthDate || !this.hobbies) {
        this.fillError = true;
        return;
      }

      this.isLoading = true;

      try {
        const axios = (await import('@/utils/axios')).default;
        
        let avatarUrl = null;
        
        // Upload ảnh lên Cloudinary trước nếu có file mới
        if (this.file) {
          const formData = new FormData();
          formData.append("file", this.file);
          
          const uploadResponse = await axios.post('/auth/upload', formData, {
            withCredentials: true,
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          
          if (uploadResponse.data && uploadResponse.data.url) {
            avatarUrl = uploadResponse.data.url; // Cloudinary URL
          }
        }
        
        // Chuẩn bị dữ liệu để cập nhật
        const updateData = {
          displayName: this.displayName,
          description: this.description,
          birthDate: this.birthDate,
          hobbies: this.hobbies,
        };
        
        // Thêm Cloudinary URL nếu có
        if (avatarUrl) {
          updateData.profilePicture = avatarUrl;
        }
        
        const responseUser = await axios.put(`/users/${currentUserId}/edit`, updateData, {
          withCredentials: true,
        });

        if (responseUser.status === 200) {
          const getUser = await axios.get(`/users/${currentUserId}`, {
            withCredentials: true,
          });

          if (getUser.status === 200) {
            const userData = getUser.data;
            
            // Nếu response không có profilePicture nhưng user có ảnh, preserve nó
            if (!userData.profilePicture && this.user.profilePicture) {
              userData.profilePicture = this.user.profilePicture;
            }
            
            this.$emit("updateUser", userData);
            
            // Cập nhật store với thông tin mới
            this.$store.commit("SET_USER", userData);
            
            // Cập nhật avatar trong store nếu có thay đổi file ảnh
            if (avatarUrl && userData.profilePicture) {
              await this.$store.dispatch("updateUserAvatar", {
                userId: currentUserId,
                profilePicture: userData.profilePicture
              });
            }
            
            this.openEditProfile = false;
            this.editingSuccess = "Your profile was successfully edited!";
            createToast(
              {
                title: this.editingSuccess,
              },
              {
                type: "success",
                showIcon: true,
              }
            );
          }
        }
      } catch (error) {
        console.error("Edit profile error:", error);
        this.editingSuccess = "";
      } finally {
        this.isLoading = false;
      }
    },
  },
  watch: {
    openEditProfile(val) {
      if (val) {
        this.$nextTick(() => this.lockScroll());
        // Khi modal mở, reload data để đảm bảo có thông tin mới nhất
        this.loadUserData();
      } else {
        this.unlockScroll();
      }
    },
    // Theo dõi thay đổi trong store user (current user)
    user: {
      handler(newUser) {
        if (newUser && Object.keys(newUser).length > 0) {
          this.displayName = newUser.displayName || '';
          this.description = newUser.description || '';
          this.birthDate = newUser.birthDate || '';
          this.hobbies = newUser.hobbies || '';
        }
      },
      deep: true,
      immediate: false
    }
  },
  mounted() {
    if (this.openEditProfile) this.lockScroll();
  },
  beforeUnmount() {
    this.unlockScroll();
  }
};
</script>

<style lang="scss" scoped>
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to { 
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.pe-overlay { 
  position: fixed; 
  inset: 0; 
  background: rgba(17, 24, 39, 0.8);
  backdrop-filter: blur(8px);
  display: flex; 
  align-items: center; 
  justify-content: center; 
  padding: 100px 24px 70px; 
  z-index: 999999; 
  overflow: hidden;
  animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.pe-modal { 
  width: 100%; 
  max-width: 680px; 
  background: #ffffff;
  border-radius: 18px;
  box-shadow: 
    0 25px 50px -12px rgba(102, 126, 234, 0.25),
    0 0 0 1px rgba(102, 126, 234, 0.1);
  display: flex; 
  flex-direction: column; 
  max-height: calc(100vh - 120px);
  animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  overflow: hidden;
}

.pe-header { 
  position: relative; 
  padding: 1.5rem 4rem 1.5rem 1.5rem;
  border-bottom: 1px solid rgba(102, 126, 234, 0.1);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
}

.pe-header h2 { 
  font-size: 1.375rem;
  font-weight: 700;
  margin: 0;
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
}

.pe-close { 
  position: absolute; 
  right: 1.25rem;
  top: 50%; 
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(102, 126, 234, 0.08);
  border-radius: 50%;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #667eea;
  font-weight: 300;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.pe-close:hover { 
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  transform: translateY(-50%) rotate(90deg) scale(1.05);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}
.pe-body { 
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 2rem 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(102, 126, 234, 0.3) transparent;
}

.pe-body::-webkit-scrollbar {
  width: 6px;
}

.pe-body::-webkit-scrollbar-track {
  background: transparent;
}

.pe-body::-webkit-scrollbar-thumb {
  background: rgba(102, 126, 234, 0.3);
  border-radius: 10px;
}

.pe-body::-webkit-scrollbar-thumb:hover {
  background: rgba(102, 126, 234, 0.5);
}

.pe-section { 
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.pe-avatar-section { 
  border-bottom: 1px solid rgba(102, 126, 234, 0.1);
  padding-bottom: 1.5rem;
}

.pe-avatar-wrapper { 
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.pe-avatar { 
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border: 4px solid transparent;
  background-clip: padding-box;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2);
  font-size: 0;
  transition: all 0.3s ease;
  position: relative;
}

.pe-avatar::before {
  content: '';
  position: absolute;
  inset: -4px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  z-index: -1;
}

.pe-avatar:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
}

.pe-avatar.placeholder { 
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.75rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.pe-avatar-actions { 
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.hidden-input { 
  display: none;
}
.pe-field { 
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  position: relative;
}

.pe-field.inline { 
  max-width: 300px;
}

.pe-field__label { 
  font-size: 0.875rem;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.01em;
}

.pe-input, .pe-textarea { 
  width: 100%;
  border: 2px solid rgba(102, 126, 234, 0.15);
  border-radius: 12px;
  background: rgba(102, 126, 234, 0.02);
  padding: 0.875rem 1rem;
  font-size: 0.9375rem;
  font-family: inherit;
  resize: vertical;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: #1f2937;
}

.pe-input:focus, .pe-textarea:focus { 
  outline: none;
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
  transform: translateY(-1px);
}

.pe-textarea { 
  min-height: 90px;
  line-height: 1.5;
}

.pe-counter { 
  position: absolute;
  right: 0.75rem;
  bottom: 0.75rem;
  font-size: 0.75rem;
  color: #667eea;
  background: white;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-weight: 500;
}
.pe-footer { 
  display: flex;
  justify-content: flex-end;
  gap: 0.875rem;
  padding: 1.25rem 2rem;
  border-top: 1px solid rgba(102, 126, 234, 0.1);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%);
}

.pe-btn { 
  border: none;
  border-radius: 12px;
  padding: 0.75rem 1.75rem;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: -0.01em;
  min-width: 120px;
  height: 44px;
}

.pe-btn-primary { 
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  position: relative;
  overflow: hidden;
}

.pe-btn-primary::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.pe-btn-primary:disabled { 
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
}

.pe-btn-primary:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(102, 126, 234, 0.4);
}

.pe-btn-primary:not(:disabled):hover::before {
  opacity: 1;
}

.pe-btn-ghost { 
  background: white;
  color: #667eea;
  border: 2px solid rgba(102, 126, 234, 0.2);
}

.pe-btn-ghost:hover { 
  background: rgba(102, 126, 234, 0.05);
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.pe-btn-secondary { 
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  color: #667eea;
  border: none;
  padding: 0.625rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.pe-btn-secondary:hover { 
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.25);
}

.pe-error { 
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.08) 100%);
  color: #ef4444;
  border: 2px solid rgba(239, 68, 68, 0.2);
  padding: 0.875rem 1rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pe-error::before {
  content: '⚠️';
  font-size: 1.125rem;
}

.pe-loading { 
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: center;
  padding: 2rem;
  color: #667eea;
  font-size: 0.9375rem;
  font-weight: 500;
}
@media (max-width: 720px) { .pe-modal { max-width:100%; max-height:calc(100vh - 40px); } .pe-header { padding:14px 48px 10px; } .pe-body { padding:16px 20px 24px; } .pe-overlay { padding:0 12px; } }

@media (max-width: 480px) {
  .pe-modal {
    border-radius: 14px;
  }

  .pe-header {
    padding: 1rem 3rem 1rem 1rem;
  }

  .pe-header h2 {
    font-size: 1.2rem;
  }

  .pe-close {
    width: 36px;
    height: 36px;
    right: 1rem;
  }

  .pe-body {
    padding: 1rem 1.25rem 1.25rem;
    gap: 1.25rem;
  }

  .pe-section {
    gap: 1rem;
  }

  .pe-avatar {
    width: 64px;
    height: 64px;
  }

  .pe-avatar-actions {
    gap: 0.5rem;
  }

  .pe-btn-secondary {
    font-size: 0.8125rem;
    padding: 0.5rem 1rem;
  }

  .pe-field__label {
    font-size: 0.8125rem;
  }

  .pe-input,
  .pe-textarea {
    padding: 0.75rem 0.875rem;
    font-size: 0.875rem;
  }

  .pe-counter {
    font-size: 0.6875rem;
  }

  .pe-btn {
    font-size: 0.875rem;
    padding: 0.625rem 1.5rem;
    min-width: 100px;
    height: 40px;
  }

  .pe-error {
    font-size: 0.8125rem;
    padding: 0.75rem 0.875rem;
  }
  
  .pe-footer {
    padding: 1rem 1.25rem;
    gap: 0.75rem;
  }
}
</style>
