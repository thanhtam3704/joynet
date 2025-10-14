<template>
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
              :src="`http://localhost:3000/uploads/user/${user.profilePicture}`" 
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
  props: ["id"],
  computed: {
    user() {
      // Nếu có ID truyền vào, lấy từ cache usersById
      if (this.id) {
        return this.$store.state.usersById?.[this.id] || {};
      }
      // Nếu không có ID, lấy current user
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
      console.log('Loading user data for ID:', this.id);
      this.isLoadingUserData = true;
      try {
        // Nếu có ID truyền vào, load thông tin của user đó
        if (this.id) {
          const axios = (await import('@/utils/axios')).default;
          const response = await axios.get(`/users/${this.id}`, { withCredentials: true });
          
          if (response.status === 200 && response.data) {
            const user = response.data;
            
            // Cache user data trong store
            this.$store.commit('CACHE_USER', user);
            
            this.displayName = user.displayName || '';
            this.description = user.description || '';
            this.birthDate = user.birthDate || '';
            this.hobbies = user.hobbies || '';
            
            console.log('Loaded user data for ID:', this.id, user);
            return;
          }
        }
        
        // Fallback: load current user nếu không có ID hoặc load thất bại
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
        
        // Fallback cuối cùng: thử load từ store
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
      const currentUser = this.id;

      const formData = new FormData();
      formData.append("file", this.file);

      if (!this.displayName || !this.description || !this.birthDate || !this.hobbies) {
        this.fillError = true;
      } else {
        this.isLoading = true;


        try {
          const axios = (await import('@/utils/axios')).default;
          
          // Chuẩn bị dữ liệu để cập nhật
          const updateData = {
            displayName: this.displayName,
            description: this.description,
            birthDate: this.birthDate,
            hobbies: this.hobbies,
          };
          
          // Chỉ thêm profilePicture nếu có file mới
          if (this.file) {
            updateData.profilePicture = this.file.name;
            console.log('Updating with new profile picture:', this.file.name);
          } else {
            console.log('No new profile picture, keeping existing avatar');
          }
          
          const responseUser = await axios.put(`/users/${currentUser}/edit`, updateData, {
            withCredentials: true,
          });

          if (responseUser.status === 200) {
            // Chỉ upload file nếu có file mới
            if (this.file) {
              await axios.post('/auth/upload', formData, {
                withCredentials: true,
                headers: { 'Content-Type': 'multipart/form-data' },
              });
            }

            const getUser = await axios.get(`/users/${currentUser}`, {
              withCredentials: true,
            });

            if (getUser.status === 200) {
              const userData = getUser.data;
              
              // Nếu response không có profilePicture nhưng user có ảnh, preserve nó
              if (!userData.profilePicture && this.user.profilePicture) {
                userData.profilePicture = this.user.profilePicture;
                console.log('Preserved profilePicture:', userData.profilePicture);
              }
              
              this.$emit("updateUser", userData);
              
              // Cập nhật cache trong store
              this.$store.commit('CACHE_USER', userData);
              
              // Cập nhật avatar trong store nếu có thay đổi file ảnh
              if (this.file && userData.profilePicture) {
                await this.$store.dispatch("updateUserAvatar", {
                  userId: currentUser,
                  profilePicture: userData.profilePicture
                });
              } else {
                // Nếu không thay đổi avatar, chỉ cập nhật current user nếu cần
                const currentUserId = this.$store.state.user?._id;
                if (currentUser === currentUserId) {
                  this.$store.commit("SET_USER", userData);
                }
              }
              
              this.openEditProfile = false; // Đóng modal sau khi lưu thành công
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
        }

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
    // Theo dõi thay đổi của prop id
    id: {
      handler(newId) {
        if (newId) {
          this.loadUserData();
        }
      },
      immediate: false
    },
    // Theo dõi thay đổi trong store user (chỉ cho current user)
    user: {
      handler(newUser) {
        // Chỉ cập nhật nếu đang edit current user (không có ID hoặc ID trùng với current user)
        const currentUserId = this.$store.state.user?._id;
        if (newUser && Object.keys(newUser).length > 0 && (!this.id || this.id === currentUserId)) {
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
.pe-overlay { position:fixed; inset:0; background:rgba(0,0,0,.55); display:flex; align-items:center; justify-content:center; padding:100px 24px 70px; z-index:2000; overflow:hidden; }
.pe-modal { width:100%; max-width:680px; background:#fff; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,.2); display:flex; flex-direction:column; max-height:calc(100vh - 120px); }
.pe-header { position:relative; padding:16px 56px 12px 56px; border-bottom:1px solid #eee; text-align:center; }
.pe-header h2 { font-size:1.25rem; font-weight:600; margin:0; }
.pe-close { position:absolute; left:16px; top:50%; transform:translateY(-50%); width:36px; height:36px; border:none; background:#f0f2f5; border-radius:50%; font-size:24px; line-height:1; cursor:pointer; display:flex; align-items:center; justify-content:center; }
.pe-close:hover { background:#e4e6eb; }
.pe-body { flex:1; overflow-y:auto; padding:16px 32px 24px; display:flex; flex-direction:column; gap:20px; }
.pe-section { display:flex; flex-direction:column; gap:18px; }
.pe-avatar-section { border-bottom:1px solid #f1f2f5; padding-bottom:20px; }
.pe-avatar-wrapper { display:flex; align-items:center; gap:20px; }
.pe-avatar { width:40px; height:40px; border-radius:100%; object-fit:cover; background:#f0f2f5; border:2px solid #fff; box-shadow:0 0 0 1px #ccc; font-size:0; }
.pe-avatar.placeholder { display:flex; align-items:center; justify-content:center; font-weight:600; font-size:14px; color:#555; }
.pe-avatar-wrapper { display:flex; align-items:center; gap:12px; }
.pe-avatar-actions { display:flex; flex-direction:column; gap:8px; }
.hidden-input { display:none; }
.pe-field { display:flex; flex-direction:column; gap:6px; position:relative; }
.pe-field.inline { max-width:240px; }
.pe-field__label { font-size:.85rem; font-weight:600; color:#555; }
.pe-input, .pe-textarea { width:100%; border:1px solid #ced0d4; border-radius:8px; background:#f5f6f7; padding:10px 12px; font-size:.9rem; font-family:inherit; resize:vertical; transition:border-color .15s, background .15s; }
.pe-input:focus, .pe-textarea:focus { outline:none; border-color:#1877f2; background:#fff; box-shadow:0 0 0 2px rgba(24,119,242,.15); }
.pe-textarea { min-height:80px; line-height:1.4; }
.pe-counter { position:absolute; right:8px; bottom:6px; font-size:.65rem; color:#888; }
.pe-footer { display:flex; justify-content:flex-end; gap:12px; padding-top:8px; border-top:1px solid #eee; }
.pe-btn { border:none; border-radius:6px; padding:8px 16px; font-size:.85rem; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px; }
.pe-btn-primary { background:#1877f2; color:#fff; }
.pe-btn-primary:disabled { opacity:.6; cursor:not-allowed; }
.pe-btn-primary:not(:disabled):hover { background:#166fe5; }
.pe-btn-ghost { background:#e4e6eb; color:#111; }
.pe-btn-ghost:hover { background:#d8dadf; }
.pe-btn-secondary { background:#e4e6eb; color:#111; border:none; padding:6px 12px; font-size:.75rem; font-weight:600; border-radius:6px; cursor:pointer; }
.pe-btn-secondary:hover { background:#d8dadf; }
.pe-error { background:#ffe5e5; color:#b80000; border:1px solid #ffb3b3; padding:8px 12px; border-radius:6px; font-size:.75rem; font-weight:500; }
.pe-loading { display:flex; align-items:center; gap:12px; justify-content:center; padding:20px; color:#666; font-size:.9rem; }
@media (max-width: 720px) { .pe-modal { max-width:100%; max-height:calc(100vh - 40px); } .pe-header { padding:14px 48px 10px; } .pe-body { padding:16px 20px 24px; } .pe-overlay { padding:0 12px; } }
</style>
