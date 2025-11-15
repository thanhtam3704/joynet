<template>
  <article class="login">
    <div class="card card--accent">
      <div class="logo-row">
        <img class="card__logo" src="../../assets/logo.png" />
        <span class="joynet-logo-text">Joynet</span>
      </div>
      <h2 class="card__text">Đăng nhập để tiếp tục</h2>
      <label class="input">
        <input
          class="input__field"
          type="text"
          placeholder=" "
          v-model="email"
          :class="{
            'input-error': (fillError && !email) || showEmailError,
          }"
        />
        <span class="input__label">E-mail</span>
      </label>

      <label class="input password-input">
        <input
          class="input__field"
          :type="showPassword ? 'text' : 'password'"
          placeholder=" "
          v-model="password"
          :class="{ 'input-error': fillError && !password }"
        />
        <span class="input__label">Mật khẩu</span>
        <button
          type="button"
          class="toggle-password-btn"
          @click="showPassword = !showPassword"
          :aria-label="showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
        >
          <span v-if="showPassword">🙈</span>
          <span v-else>👁️</span>
        </button>
      </label>
      <p class="warn" v-if="fillError">Vui lòng điền đủ thông tin</p>
      <p class="warn" v-if="email && !emailError && showEmailError">
        Vui lòng nhập địa chỉ email hợp lệ
      </p>
      <p class="warn" v-if="error">
        {{ error }}
      </p>
      <div class="button-group">
        <div class="button-group-left">
          <div class="login-button-loader" v-if="!loginLoading">
            <button @click="login">Đăng nhập</button>
          </div>
          <div class="login-button-loader" v-else>
            <SyncLoader class="login-loader" :color="color" />
          </div>
          <button type="reset" v-if="!loginLoading">Quên mật khẩu?</button>
        </div>
        <div class="button-group-right" v-if="!loginLoading">
          <router-link to="/signup">
            <button>Bạn chưa có tài khoản?</button></router-link
          >
        </div>
      </div>
      <!-- Google Login Divider -->
      <div class="divider-row">
        <span class="divider-line"></span>
        <span class="divider-text">hoặc</span>
        <span class="divider-line"></span>
      </div>
      <!-- Google Login Button -->
      <button class="google-login-btn" @click="loginWithGoogle">
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt="Google logo"
          class="google-logo"
        />
        Đăng nhập bằng Google
      </button>
      <!-- Hidden div for Google Sign-In button (fallback) -->
      <div id="google-signin-button" style="display: none; margin-top: 1rem;"></div>
    </div>
  </article>
</template>

<script>
import SyncLoader from "vue-spinner/src/SyncLoader.vue";

export default {
  name: "Login",
  components: { SyncLoader },
  data() {
    return {
      email: "",
      password: "",
      error: "",
      color: "pink",
      loginLoading: false,
      fillError: false,
      showPassword: false,
      emailError: false,
      showEmailError: false,
    };
  },
  mounted() {
    // ✅ Clear store và disconnect socket khi vào trang login
    this.$store.commit('clearUser');
    
    // Kiểm tra URL params để xử lý Google OAuth callback
    this.handleGoogleCallback();
  },
  watch: {
    email() {
      this.showEmailError = false;
    },
  },
  methods: {
    async loginWithGoogle() {
      try {
        // Sử dụng redirect flow thay vì popup/credential
        const clientId = '749220537519-beauagaft0dmdc9uf2ije8fo0mrdc9jd.apps.googleusercontent.com';
        const redirectUri = 'http://localhost:3000/api/auth/google/callback';
        const scope = 'openid email profile';
        
        // Tạo Google OAuth URL
        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${clientId}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&response_type=code` +
          `&scope=${encodeURIComponent(scope)}` +
          `&access_type=offline` +
          `&prompt=consent`;
        
        console.log('Redirecting to Google OAuth:', googleAuthUrl);
        
        // Redirect đến Google OAuth
        window.location.href = googleAuthUrl;
        
      } catch (error) {
        console.error('Google login error:', error);
        this.error = 'Đăng nhập Google thất bại. Vui lòng thử lại.';
      }
    },

    
    async handleGoogleCallback() {
      // Lấy query params từ hash route (sau dấu #)
      const hash = window.location.hash;
      const queryString = hash.includes('?') ? hash.split('?')[1] : '';
      const urlParams = new URLSearchParams(queryString);
      
      const token = urlParams.get('token');
      const success = urlParams.get('success');
      const error = urlParams.get('error');
      
      if (token && success === 'google_login') {
        // Lưu token
        localStorage.setItem("token", token);
        
        // Load user info
        try {
          await this.$store.dispatch('loadUser');
          
          // Clear URL params
          window.history.replaceState({}, document.title, '/#/login');
          
          // Redirect to home
          this.$router.replace("/home");
        } catch (err) {
          console.error('Failed to load user:', err);
          this.error = 'Không thể tải thông tin người dùng. Vui lòng thử lại.';
          localStorage.removeItem('token');
          window.history.replaceState({}, document.title, '/#/login');
        }
      } else if (error) {
        this.error = 'Đăng nhập Google thất bại. Vui lòng thử lại.';
        window.history.replaceState({}, document.title, '/#/login');
      }
    },
    
    validateEmail() {
      // Trả về true nếu email hợp lệ, false nếu không hợp lệ
      return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(this.email);
    },
    async login() {
      this.loginLoading = true;
      this.showEmailError = false;

      if (!this.email || !this.password) {
        this.fillError = true;
        this.loginLoading = false;
        return;
      }
      this.fillError = false;

      // Kiểm tra email hợp lệ khi bấm nút đăng nhập
      if (!this.validateEmail()) {
        this.emailError = false;
        this.showEmailError = true;
        this.loginLoading = false;
        return;
      } else {
        this.emailError = true;
        this.showEmailError = false;
      }


      try {
        const axios = (await import('@/utils/axios')).default;
        const response = await axios.post('/auth/login', {
          email: this.email,
          password: this.password,
        }, {
          withCredentials: true,
        });
        this.error = false;
        localStorage.setItem("token", response.data.token);
        this.$router.push("/home");
      } catch (error) {
        if (error.response && error.response.data && error.response.data.error) {
          this.error = error.response.data.error;
        } else {
          this.error = "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.";
        }
        this.password = "";
      }

      this.loginLoading = false;
    },
  },
};
</script>

<style lang="scss" scoped>
.login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

.login::before {
  content: '';
  position: absolute;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
  background-size: 50px 50px;
  animation: moveBackground 20s linear infinite;
  opacity: 0.3;
}

@keyframes moveBackground {
  0% {
    transform: translate(0, 0);
  }
  100% {
    transform: translate(50px, 50px);
  }
}

.card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  padding: 2.5rem;
  border-radius: var(--radius-2xl);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
  max-width: 440px;
  width: 100%;
  position: relative;
  z-index: 1;
  animation: slideUp 0.5s ease-out;

  &__logo {
    width: 64px;
    height: 64px;
    margin-bottom: 0;
    filter: drop-shadow(0 4px 8px rgba(102, 126, 234, 0.2));
    transition: transform 0.3s ease;
    flex-shrink: 0;
  }

  &__logo:hover {
    transform: scale(1.05) rotate(5deg);
  }

  &__text {
    margin-bottom: 1.5rem;
    margin-top: 0.5rem;
    color: var(--gray-700);
    font-size: 0.9375rem;
    font-weight: 500;
  }
}

.logo-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.875rem;
  margin-bottom: 1.5rem;
}

.joynet-logo-text {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 2rem;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: inline-block;
  line-height: 1;
  margin: 0;
}

.input {
  position: relative;
  margin-bottom: 2rem;

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
  position: relative;
  
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
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
}

.toggle-password-btn:hover {
  background: rgba(99, 102, 241, 0.08);
  transform: translateY(-50%) scale(1.05);
}

.toggle-password-btn:active {
  transform: translateY(-50%) scale(0.95);
}

.warn {
  color: var(--error);
  margin: -0.5rem 0 1rem 0;
  font-size: 0.8125rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.warn::before {
  content: '⚠️';
  font-size: 1rem;
}

.button-group {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.button-group-left {
  display: flex;
  gap: 0.75rem;
  align-items: stretch;
}

.login-button-loader {
  flex: 2;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 180px;
}

button {
  padding: 0.875rem 1.5rem;
  background: var(--gradient-primary);
  border: none;
  border-radius: var(--radius-lg);
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--white);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 6px -1px rgba(102, 126, 234, 0.3);
  width: 100%;
  white-space: nowrap;
}

button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px -5px rgba(102, 126, 234, 0.4);
}

button:active {
  transform: translateY(0);
  box-shadow: 0 4px 6px -1px rgba(102, 126, 234, 0.3);
}

button[type="reset"] {
  background: transparent;
  color: var(--primary);
  box-shadow: none;
  padding: 0.875rem 1rem;
  font-weight: 500;
  white-space: nowrap;
  flex: 1;
}

button[type="reset"]:hover {
  background: var(--gray-100);
  transform: none;
  box-shadow: none;
}

.button-group-right button {
  background: var(--white);
  color: var(--primary);
  border: 2px solid var(--primary);
  box-shadow: none;
}

.button-group-right button:hover {
  background: var(--primary);
  color: var(--white);
}

/* Divider */
.divider-row {
  display: flex;
  align-items: center;
  margin: 1.75rem 0 1.25rem 0;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: var(--gray-200);
}

.divider-text {
  margin: 0 1rem;
  color: var(--gray-500);
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Google Button */
.google-login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1.5rem;
  background: var(--white);
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-lg);
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--gray-700);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  margin-bottom: 0;
}

.google-login-btn:hover {
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
  transform: translateY(-1px);
}

.google-logo {
  width: 20px;
  height: 20px;
}

/* Responsive */
@media (max-width: 480px) {
  .login {
    padding: 1rem 0.5rem;
  }

  .card {
    padding: 2rem 1.5rem;
  }

  .joynet-logo-text {
    font-size: 1.875rem;
  }

  .card__logo {
    width: 60px;
    height: 60px;
  }

  .button-group-left {
    flex-direction: column;
  }

  button + button {
    margin-left: 0;
  }
}
</style>
