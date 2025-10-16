<template>
  <div v-if="openChangePassword" class="cp-overlay" @click.self="closeModal">
    <div class="cp-modal" role="dialog" aria-modal="true" aria-labelledby="cp-title">
      <div class="cp-header">
        <h2 id="cp-title">Đổi mật khẩu</h2>
        <button class="cp-close" @click="closeModal" aria-label="Đóng">&times;</button>
      </div>
      <form class="cp-body" @submit.prevent="handleChangePassword">
        <div class="cp-section">
          <label class="cp-field">
            <span class="cp-field__label">Mật khẩu hiện tại</span>
            <div class="cp-password-wrapper">
              <input 
                :type="showCurrentPassword ? 'text' : 'password'" 
                v-model.trim="currentPassword" 
                class="cp-input" 
                placeholder="Nhập mật khẩu hiện tại"
                autocomplete="current-password"
              />
              <button 
                type="button" 
                class="cp-toggle-password" 
                @click="showCurrentPassword = !showCurrentPassword"
                :aria-label="showCurrentPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
              >
                {{ showCurrentPassword ? '👁️' : '👁️‍🗨️' }}
              </button>
            </div>
          </label>
          
          <label class="cp-field">
            <span class="cp-field__label">Mật khẩu mới</span>
            <div class="cp-password-wrapper">
              <input 
                :type="showNewPassword ? 'text' : 'password'" 
                v-model.trim="newPassword" 
                class="cp-input" 
                placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                autocomplete="new-password"
              />
              <button 
                type="button" 
                class="cp-toggle-password" 
                @click="showNewPassword = !showNewPassword"
                :aria-label="showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
              >
                {{ showNewPassword ? '👁️' : '👁️‍🗨️' }}
              </button>
            </div>
          </label>
          
          <label class="cp-field">
            <span class="cp-field__label">Xác nhận mật khẩu mới</span>
            <div class="cp-password-wrapper">
              <input 
                :type="showConfirmPassword ? 'text' : 'password'" 
                v-model.trim="confirmPassword" 
                class="cp-input" 
                placeholder="Nhập lại mật khẩu mới"
                autocomplete="new-password"
              />
              <button 
                type="button" 
                class="cp-toggle-password" 
                @click="showConfirmPassword = !showConfirmPassword"
                :aria-label="showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
              >
                {{ showConfirmPassword ? '👁️' : '👁️‍🗨️' }}
              </button>
            </div>
          </label>
        </div>
        
        <div v-if="errorMessage" class="cp-error">{{ errorMessage }}</div>
        
        <div class="cp-footer">
          <button type="button" class="cp-btn cp-btn-ghost" @click="closeModal">Hủy</button>
          <button type="submit" class="cp-btn cp-btn-primary" :disabled="isLoading || !canSubmit">
            <span v-if="!isLoading">Đổi mật khẩu</span>
            <sync-loader v-else :color="'#fff'" size="8" />
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import SyncLoader from "vue-spinner/src/SyncLoader.vue";
import { createToast } from "mosha-vue-toastify";
import { changePassword } from "@/api/users";

export default {
  name: "ChangePassword",
  components: {
    SyncLoader,
  },
  data() {
    return {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      showCurrentPassword: false,
      showNewPassword: false,
      showConfirmPassword: false,
      openChangePassword: true,
      isLoading: false,
      errorMessage: "",
    };
  },
  computed: {
    canSubmit() {
      return (
        this.currentPassword.length >= 6 &&
        this.newPassword.length >= 6 &&
        this.confirmPassword.length >= 6 &&
        this.newPassword === this.confirmPassword
      );
    },
  },
  methods: {
    closeModal() {
      this.openChangePassword = false;
      this.$emit("close");
    },
    
    async handleChangePassword() {
      this.errorMessage = "";

      // Validate
      if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
        this.errorMessage = "Vui lòng điền đầy đủ thông tin";
        return;
      }

      if (this.newPassword.length < 6) {
        this.errorMessage = "Mật khẩu mới phải có ít nhất 6 ký tự";
        return;
      }

      if (this.newPassword !== this.confirmPassword) {
        this.errorMessage = "Mật khẩu xác nhận không khớp";
        return;
      }

      if (this.currentPassword === this.newPassword) {
        this.errorMessage = "Mật khẩu mới phải khác mật khẩu hiện tại";
        return;
      }

      this.isLoading = true;

      try {
        const userId = this.$store.state.user?._id;
        
        if (!userId) {
          this.errorMessage = "Không tìm thấy thông tin người dùng";
          return;
        }

        const response = await changePassword(
          userId,
          this.currentPassword,
          this.newPassword
        );

        if (response.status === 200) {
          createToast(
            {
              title: response.data.message || "Đổi mật khẩu thành công!",
            },
            {
              type: "success",
              showIcon: true,
            }
          );
          
          this.closeModal();
        }
      } catch (error) {
        console.error("Change password error:", error);
        this.errorMessage = 
          error.response?.data?.error || 
          "Đã có lỗi xảy ra. Vui lòng thử lại!";
      } finally {
        this.isLoading = false;
      }
    },
  },
  watch: {
    openChangePassword(val) {
      if (!val) {
        this.$emit("close");
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.cp-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 100px 24px 70px;
  z-index: 2000;
  overflow: hidden;
}

.cp-modal {
  width: 100%;
  max-width: 500px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 120px);
}

.cp-header {
  position: relative;
  padding: 16px 56px 12px 56px;
  border-bottom: 1px solid #eee;
  text-align: center;
}

.cp-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.cp-close {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border: none;
  background: #f0f2f5;
  border-radius: 50%;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cp-close:hover {
  background: #e4e6eb;
}

.cp-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 32px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.cp-section {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.cp-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
}

.cp-field__label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #555;
}

.cp-password-wrapper {
  position: relative;
}

.cp-input {
  width: 100%;
  border: 1px solid #ced0d4;
  border-radius: 8px;
  background: #f5f6f7;
  padding: 10px 40px 10px 12px;
  font-size: 0.9rem;
  font-family: inherit;
  transition: border-color 0.15s, background 0.15s;
}

.cp-input:focus {
  outline: none;
  border-color: #1877f2;
  background: #fff;
  box-shadow: 0 0 0 2px rgba(24, 119, 242, 0.15);
}

.cp-toggle-password {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  font-size: 18px;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.cp-toggle-password:hover {
  opacity: 1;
}

.cp-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid #eee;
}

.cp-btn {
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.cp-btn-primary {
  background: #1877f2;
  color: #fff;
  min-width: 120px;
  justify-content: center;
}

.cp-btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cp-btn-primary:not(:disabled):hover {
  background: #166fe5;
}

.cp-btn-ghost {
  background: #e4e6eb;
  color: #111;
}

.cp-btn-ghost:hover {
  background: #d8dadf;
}

.cp-error {
  background: #ffe5e5;
  color: #b80000;
  border: 1px solid #ffb3b3;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
}

@media (max-width: 720px) {
  .cp-modal {
    max-width: 100%;
    max-height: calc(100vh - 40px);
  }
  
  .cp-header {
    padding: 14px 48px 10px;
  }
  
  .cp-body {
    padding: 16px 20px 24px;
  }
  
  .cp-overlay {
    padding: 0 12px;
  }
}
</style>
