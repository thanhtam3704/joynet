<template>
  <article class="forgot-password">
    <div class="card card--accent">
      <div class="logo-row">
        <img class="card__logo" src="../../assets/logo.png" />
        <span class="joynet-logo-text">Joynet</span>
      </div>

      <!-- Step 1: Nhập Email -->
      <div v-if="step === 1" class="step-content">
        <h2 class="card__text">Quên mật khẩu?</h2>
        <p class="card__desc">Nhập email của bạn để nhận mã xác thực</p>
        
        <label class="input">
          <input
            class="input__field"
            type="email"
            placeholder=" "
            v-model="email"
            :class="{ 'input-error': emailError }"
            @keyup.enter="sendOTP"
          />
          <span class="input__label">E-mail</span>
        </label>

        <p class="warn" v-if="emailError">{{ emailError }}</p>

        <div class="button-group-single">
          <button 
            class="btn-primary" 
            @click="sendOTP"
            :disabled="loading"
          >
            <span v-if="!loading">Gửi mã xác thực</span>
            <SyncLoader v-else class="btn-loader" :color="'#fff'" :size="'8px'" />
          </button>
          <router-link to="/login">
            <button class="btn-secondary">Quay lại đăng nhập</button>
          </router-link>
        </div>
      </div>

      <!-- Step 2: Nhập OTP -->
      <div v-else-if="step === 2" class="step-content">
        <h2 class="card__text">Nhập mã xác thực</h2>
        <p class="card__desc">
          Mã xác thực đã được gửi đến <strong>{{ maskedEmail }}</strong>
        </p>

        <div class="otp-input-group">
          <input
            v-for="(digit, index) in otp"
            :key="index"
            :ref="el => otpRefs[index] = el"
            type="text"
            maxlength="1"
            class="otp-input"
            v-model="otp[index]"
            @input="handleOTPInput(index)"
            @keydown="handleOTPKeydown($event, index)"
            @paste="handleOTPPaste"
          />
        </div>

        <p class="warn" v-if="otpError">{{ otpError }}</p>

        <div class="resend-row">
          <p class="resend-text">Không nhận được mã?</p>
          <button 
            class="resend-btn" 
            @click="resendOTP"
            :disabled="resendTimer > 0"
          >
            {{ resendTimer > 0 ? `Gửi lại (${resendTimer}s)` : 'Gửi lại' }}
          </button>
        </div>

        <div class="button-group-single">
          <button 
            class="btn-primary" 
            @click="verifyOTP"
            :disabled="loading || otp.join('').length !== 6"
          >
            <span v-if="!loading">Xác thực</span>
            <SyncLoader v-else class="btn-loader" :color="'#fff'" :size="'8px'" />
          </button>
          <button class="btn-secondary" @click="step = 1">Quay lại</button>
        </div>
      </div>

      <!-- Step 3: Nhập mật khẩu mới -->
      <div v-else-if="step === 3" class="step-content">
        <h2 class="card__text">Đặt mật khẩu mới</h2>
        <p class="card__desc">Nhập mật khẩu mới cho tài khoản của bạn</p>

        <label class="input password-input">
          <input
            class="input__field"
            :type="showPassword ? 'text' : 'password'"
            placeholder=" "
            v-model="newPassword"
            :class="{ 'input-error': passwordError }"
          />
          <span class="input__label">Mật khẩu mới</span>
          <button
            type="button"
            class="toggle-password-btn"
            @click="showPassword = !showPassword"
          >
            <span v-if="showPassword">🙈</span>
            <span v-else>👁️</span>
          </button>
        </label>

        <label class="input password-input">
          <input
            class="input__field"
            :type="showConfirmPassword ? 'text' : 'password'"
            placeholder=" "
            v-model="confirmPassword"
            :class="{ 'input-error': passwordError }"
            @keyup.enter="resetPassword"
          />
          <span class="input__label">Xác nhận mật khẩu</span>
          <button
            type="button"
            class="toggle-password-btn"
            @click="showConfirmPassword = !showConfirmPassword"
          >
            <span v-if="showConfirmPassword">🙈</span>
            <span v-else>👁️</span>
          </button>
        </label>

        <p class="warn" v-if="passwordError">{{ passwordError }}</p>

        <div class="button-group-single">
          <button 
            class="btn-primary" 
            @click="resetPassword"
            :disabled="loading || !newPassword || !confirmPassword"
          >
            <span v-if="!loading">Đổi mật khẩu</span>
            <SyncLoader v-else class="btn-loader" :color="'#fff'" :size="'8px'" />
          </button>
        </div>
      </div>

      <!-- Step 4: Thành công -->
      <div v-else-if="step === 4" class="step-content success-content">
        <div class="success-icon">✓</div>
        <h2 class="card__text">Đổi mật khẩu thành công!</h2>
        <p class="card__desc">Bạn có thể đăng nhập với mật khẩu mới</p>

        <div class="button-group-single">
          <router-link to="/login">
            <button class="btn-primary full-width">Đăng nhập ngay</button>
          </router-link>
        </div>
      </div>
    </div>
  </article>
</template>

<script>
import SyncLoader from "vue-spinner/src/SyncLoader.vue";

export default {
  name: "ForgotPassword",
  components: { SyncLoader },
  mounted() {
    // Clear token và user state khi vào trang forgot password
    localStorage.removeItem('token');
    this.$store.commit('clearUser');
  },
  data() {
    return {
      step: 1, // 1: Email, 2: OTP, 3: New Password, 4: Success
      email: "",
      otp: ["", "", "", "", "", ""],
      otpRefs: [],
      newPassword: "",
      confirmPassword: "",
      showPassword: false,
      showConfirmPassword: false,
      loading: false,
      emailError: "",
      otpError: "",
      passwordError: "",
      resetToken: "",
      resendTimer: 0,
      resendInterval: null,
    };
  },
  computed: {
    maskedEmail() {
      if (!this.email) return "";
      const [name, domain] = this.email.split("@");
      const masked = name.substring(0, 2) + "***" + name.substring(name.length - 1);
      return `${masked}@${domain}`;
    },
  },
  beforeUnmount() {
    if (this.resendInterval) {
      clearInterval(this.resendInterval);
    }
  },
  methods: {
    validateEmail() {
      const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
      if (!this.email) {
        this.emailError = "Vui lòng nhập email";
        return false;
      }
      if (!emailRegex.test(this.email)) {
        this.emailError = "Email không hợp lệ";
        return false;
      }
      this.emailError = "";
      return true;
    },

    async sendOTP() {
      if (!this.validateEmail()) return;

      this.loading = true;
      this.emailError = "";

      try {
        const axios = (await import('@/utils/axios')).default;
        const response = await axios.post('/auth/forgot-password', {
          email: this.email,
        });

        if (response.status === 200) {
          this.step = 2;
          this.startResendTimer();
          console.log('OTP sent successfully');
        }
      } catch (error) {
        console.error('Send OTP error:', error);
        if (error.response?.status === 404) {
          this.emailError = "Email không tồn tại trong hệ thống";
        } else {
          this.emailError = error.response?.data?.message || "Không thể gửi mã xác thực. Vui lòng thử lại.";
        }
      } finally {
        this.loading = false;
      }
    },

    async resendOTP() {
      if (this.resendTimer > 0) return;
      await this.sendOTP();
    },

    startResendTimer() {
      this.resendTimer = 60;
      this.resendInterval = setInterval(() => {
        this.resendTimer--;
        if (this.resendTimer <= 0) {
          clearInterval(this.resendInterval);
        }
      }, 1000);
    },

    handleOTPInput(index) {
      const value = this.otp[index];
      
      // Chỉ cho phép số
      if (value && !/^\d$/.test(value)) {
        this.otp[index] = "";
        return;
      }

      // Auto focus next input
      if (value && index < 5) {
        this.otpRefs[index + 1]?.focus();
      }

      this.otpError = "";
    },

    handleOTPKeydown(event, index) {
      // Backspace: focus previous input
      if (event.key === 'Backspace' && !this.otp[index] && index > 0) {
        this.otpRefs[index - 1]?.focus();
      }
      // Arrow keys navigation
      else if (event.key === 'ArrowLeft' && index > 0) {
        this.otpRefs[index - 1]?.focus();
      }
      else if (event.key === 'ArrowRight' && index < 5) {
        this.otpRefs[index + 1]?.focus();
      }
    },

    handleOTPPaste(event) {
      event.preventDefault();
      const pastedData = event.clipboardData.getData('text').trim();
      
      // Chỉ cho phép paste 6 số
      if (/^\d{6}$/.test(pastedData)) {
        this.otp = pastedData.split('');
        this.otpRefs[5]?.focus();
      }
    },

    async verifyOTP() {
      const otpCode = this.otp.join('');
      
      if (otpCode.length !== 6) {
        this.otpError = "Vui lòng nhập đủ 6 số";
        return;
      }

      this.loading = true;
      this.otpError = "";

      try {
        const axios = (await import('@/utils/axios')).default;
        const response = await axios.post('/auth/verify-reset-otp', {
          email: this.email,
          otp: otpCode,
        });

        if (response.status === 200) {
          this.resetToken = response.data.resetToken;
          this.step = 3;
        }
      } catch (error) {
        console.error('Verify OTP error:', error);
        if (error.response?.status === 400) {
          this.otpError = "Mã xác thực không đúng";
        } else if (error.response?.status === 410) {
          this.otpError = "Mã xác thực đã hết hạn";
        } else {
          this.otpError = error.response?.data?.message || "Xác thực thất bại. Vui lòng thử lại.";
        }
      } finally {
        this.loading = false;
      }
    },

    validatePassword() {
      if (!this.newPassword) {
        this.passwordError = "Vui lòng nhập mật khẩu mới";
        return false;
      }
      if (this.newPassword.length < 6) {
        this.passwordError = "Mật khẩu phải có ít nhất 6 ký tự";
        return false;
      }
      if (this.newPassword !== this.confirmPassword) {
        this.passwordError = "Mật khẩu xác nhận không khớp";
        return false;
      }
      this.passwordError = "";
      return true;
    },

    async resetPassword() {
      if (!this.validatePassword()) return;

      this.loading = true;
      this.passwordError = "";

      try {
        const axios = (await import('@/utils/axios')).default;
        const response = await axios.post('/auth/reset-password', {
          email: this.email,
          resetToken: this.resetToken,
          newPassword: this.newPassword,
        });

        if (response.status === 200) {
          this.step = 4;
        }
      } catch (error) {
        console.error('Reset password error:', error);
        if (error.response?.status === 400) {
          this.passwordError = "Token không hợp lệ hoặc đã hết hạn";
        } else {
          this.passwordError = error.response?.data?.message || "Đổi mật khẩu thất bại. Vui lòng thử lại.";
        }
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.forgot-password {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
    background-size: 50px 50px;
    animation: moveBackground 20s linear infinite;
  }
}

@keyframes moveBackground {
  0% { transform: translate(0, 0); }
  100% { transform: translate(50px, 50px); }
}

.card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 480px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  padding: 2.5rem;
  border-radius: var(--radius-2xl);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  animation: slideUp 0.4s ease;

  &__logo {
    width: 64px;
    height: 64px;
    filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
  }

  &__text {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--gray-900);
    margin-bottom: 0.5rem;
    text-align: center;
    font-family: var(--font-display);
  }

  &__desc {
    text-align: center;
    color: var(--gray-600);
    font-size: 0.9375rem;
    margin-bottom: 2rem;
    line-height: 1.5;
  }
}

.logo-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.joynet-logo-text {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 2rem;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.step-content {
  animation: fadeInSlide 0.3s ease;
}

@keyframes fadeInSlide {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.input {
  position: relative;
  display: block;
  margin-bottom: 1.25rem;

  &__field {
    box-sizing: border-box;
    display: block;
    width: 100%;
    border: 2px solid var(--gray-200);
    padding: 0.875rem 1rem;
    color: var(--gray-900);
    background: var(--white);
    border-radius: var(--radius-lg);
    font-size: 0.9375rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
      
      & + .input__label {
        transform: translate(-0.25rem, -50%) scale(0.85);
        color: var(--primary);
        background: rgba(255, 255, 255, 0.98);
        padding: 0 0.5rem;
        font-weight: 600;
        top: 0;
      }
    }

    &:not(:placeholder-shown) {
      & + .input__label {
        transform: translate(-0.25rem, -50%) scale(0.85);
        color: var(--gray-600);
        background: rgba(255, 255, 255, 0.98);
        padding: 0 0.5rem;
        font-weight: 600;
        top: 0;
      }
    }
  }

  &__label {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--gray-500);
    pointer-events: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 0.9375rem;
    font-weight: 500;
    z-index: 1;
  }
}

.input-error {
  border-color: var(--error) !important;
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1) !important;
}

.password-input {
  .input__field {
    padding-right: 3rem;
  }
}

.toggle-password-btn {
  position: absolute;
  right: 0.625rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.125rem;
  padding: 0.375rem;
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
  z-index: 3;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-password-btn:hover {
  background: rgba(99, 102, 241, 0.08);
  transform: translateY(-50%) scale(1.05);
}

.warn {
  color: var(--error);
  font-size: 0.875rem;
  margin: 0.5rem 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;

  &::before {
    content: '⚠️';
    font-size: 1rem;
  }
}

/* OTP Input */
.otp-input-group {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.otp-input {
  width: 48px;
  height: 56px;
  text-align: center;
  font-size: 1.5rem;
  font-weight: 700;
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-lg);
  background: var(--white);
  color: var(--gray-900);
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
    transform: scale(1.05);
  }

  &:not(:placeholder-shown) {
    border-color: var(--primary);
    background: rgba(99, 102, 241, 0.05);
  }
}

/* Resend Row */
.resend-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.resend-text {
  font-size: 0.875rem;
  color: var(--gray-600);
}

.resend-btn {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--primary);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-md);
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: rgba(99, 102, 241, 0.1);
  }

  &:disabled {
    color: var(--gray-400);
    cursor: not-allowed;
  }
}

/* Buttons */
.button-group-single {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1.5rem;

  button {
    width: 100%;
    height: 48px;
    border-radius: var(--radius-lg);
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: none;
    font-family: var(--font-primary);
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.btn-primary {
  background: var(--gradient-primary);
  color: var(--white);
  box-shadow: 0 4px 6px -1px rgba(102, 126, 234, 0.3);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px -5px rgba(102, 126, 234, 0.4);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
}

.btn-secondary {
  background: var(--white);
  color: var(--gray-700);
  border: 2px solid var(--gray-200);

  &:hover {
    background: var(--gray-50);
    border-color: var(--gray-300);
  }
}

.btn-loader {
  display: flex;
  justify-content: center;
  align-items: center;
}

.full-width {
  width: 100%;
}

/* Success Content */
.success-content {
  text-align: center;
  padding: 2rem 0;
}

.success-icon {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: var(--white);
  font-size: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  animation: scaleIn 0.5s ease;
  box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
}

@keyframes scaleIn {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Responsive */
@media (max-width: 480px) {
  .card {
    padding: 2rem 1.5rem;
  }

  .otp-input {
    width: 42px;
    height: 50px;
    font-size: 1.25rem;
  }

  .otp-input-group {
    gap: 0.5rem;
  }
}
</style>
