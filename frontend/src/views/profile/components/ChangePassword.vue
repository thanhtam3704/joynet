<template>
  <div class="change-password-container">
    <!-- <div class="section-header">
      <h2>Đổi mật khẩu</h2>
      <p>Cập nhật mật khẩu của bạn để bảo mật tài khoản</p>
    </div> -->
    
    <form class="change-password-form" @submit.prevent="handleChangePassword">
      <div class="password-fields">
        <label class="form-field">
          <span class="field-label">Mật khẩu hiện tại</span>
          <div class="password-input-wrapper">
            <input 
              :type="showCurrentPassword ? 'text' : 'password'" 
              v-model.trim="currentPassword" 
              class="form-input" 
              placeholder="Nhập mật khẩu hiện tại"
              autocomplete="current-password"
            />
            <button 
              type="button" 
              class="toggle-password-btn" 
              @click="showCurrentPassword = !showCurrentPassword"
              :aria-label="showCurrentPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
            >
              <span class="material-icons">{{ showCurrentPassword ? 'visibility_off' : 'visibility' }}</span>
            </button>
          </div>
        </label>
        
        <label class="form-field">
          <span class="field-label">Mật khẩu mới</span>
          <div class="password-input-wrapper">
            <input 
              :type="showNewPassword ? 'text' : 'password'" 
              v-model.trim="newPassword" 
              class="form-input" 
              placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
              autocomplete="new-password"
            />
            <button 
              type="button" 
              class="toggle-password-btn" 
              @click="showNewPassword = !showNewPassword"
              :aria-label="showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
            >
              <span class="material-icons">{{ showNewPassword ? 'visibility_off' : 'visibility' }}</span>
            </button>
          </div>
        </label>
        
        <label class="form-field">
          <span class="field-label">Xác nhận mật khẩu mới</span>
          <div class="password-input-wrapper">
            <input 
              :type="showConfirmPassword ? 'text' : 'password'" 
              v-model.trim="confirmPassword" 
              class="form-input" 
              placeholder="Nhập lại mật khẩu mới"
              autocomplete="new-password"
            />
            <button 
              type="button" 
              class="toggle-password-btn" 
              @click="showConfirmPassword = !showConfirmPassword"
              :aria-label="showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
            >
              <span class="material-icons">{{ showConfirmPassword ? 'visibility_off' : 'visibility' }}</span>
            </button>
          </div>
        </label>
      </div>
      
      <div v-if="errorMessage" class="error-message">
        <span class="material-icons">error</span>
        <span>{{ errorMessage }}</span>
      </div>
      
      <div v-if="successMessage" class="success-message">
        <span class="material-icons">check_circle</span>
        <span>{{ successMessage }}</span>
      </div>
      
      <div class="form-actions">
        <button type="submit" class="btn-primary" :disabled="isLoading || !canSubmit">
          <span v-if="!isLoading">Đổi mật khẩu</span>
          <sync-loader v-else :color="'#fff'" size="8" />
        </button>
      </div>
    </form>
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
      isLoading: false,
      errorMessage: "",
      successMessage: "",
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
    async handleChangePassword() {
      this.errorMessage = "";
      this.successMessage = "";

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
          this.successMessage = response.data.message || "Đổi mật khẩu thành công!";
          
          createToast(
            {
              title: this.successMessage,
            },
            {
              type: "success",
              showIcon: true,
              timeout: 3000
            }
          );
          
          // Reset form
          this.currentPassword = "";
          this.newPassword = "";
          this.confirmPassword = "";
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
};
</script>

<style lang="scss" scoped>
.change-password-container {
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

.change-password-form {
  background: #fafafa;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #efefef;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.password-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  font-size: 13px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 2px;
}

.password-input-wrapper {
  position: relative;
  background: white;
  border-radius: 10px;
  border: 1px solid #efefef;
  transition: all 0.2s ease;
}

.password-input-wrapper:focus-within {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-input {
  width: 100%;
  padding: 12px 48px 12px 16px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  color: #262626;
  background: transparent;
  transition: all 0.2s ease;
}

.form-input::placeholder {
  color: #8e8e8e;
}

.form-input:focus {
  outline: none;
}

.toggle-password-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8e8e8e;
  transition: color 0.2s ease;
}

.toggle-password-btn:hover {
  color: #667eea;
}

.toggle-password-btn .material-icons {
  font-size: 20px;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: white;
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 10px;
  color: #dc2626;
  font-size: 13px;
  font-weight: 500;
}

.error-message .material-icons {
  font-size: 20px;
  color: #dc2626;
}

.success-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: white;
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 10px;
  color: #16a34a;
  font-size: 13px;
  font-weight: 500;
}

.success-message .material-icons {
  font-size: 20px;
  color: #16a34a;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
}

.btn-primary {
  padding: 12px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  min-width: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-primary:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.btn-primary:not(:disabled):active {
  transform: translateY(0);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
  .change-password-container {
    max-width: 100%;
  }
  
  .change-password-form {
    padding: 20px;
  }
  
  .form-input {
    font-size: 14px;
  }
  
  .btn-primary {
    width: 100%;
  }
}
</style>
