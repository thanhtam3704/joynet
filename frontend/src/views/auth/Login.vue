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

      <label class="input" style="position: relative">
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

    
    handleGoogleCallback() {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const success = urlParams.get('success');
      const error = urlParams.get('error');
      
      if (token && success === 'google_login') {
        // Lưu token và chuyển hướng
        localStorage.setItem("token", token);
        
        // Clear URL params
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Redirect to home
        this.$router.push("/home");
      } else if (error === 'google_auth_failed') {
        this.error = 'Đăng nhập Google thất bại. Vui lòng thử lại.';
        
        // Clear URL params
        window.history.replaceState({}, document.title, window.location.pathname);
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
.card {
  background: var(--white);
  padding: calc(4 * var(--size-bezel));
  border-radius: var(--size-radius);
  border: 3px solid var(--color-shadow, currentColor);
  box-shadow: 0.5rem 0.5rem 0 var(--color-shadow, currentColor);
  margin-top: 5rem;

  &--inverted {
    --color-background: var(--color-dark);
    color: var(--color-light);
    --color-shadow: var(--color-accent);
  }

  &--accent {
    --color-background: var(--color-signal);
    --color-accent: var(--color-light);
    color: var(--color-dark);
  }

  &__logo {
    width: 60px;
    height: 60px;
    margin-bottom: 1rem;
  }

  *:first-child {
    margin-top: 0;
  }

  &__text {
    margin-bottom: 1rem;
  }
}

.login {
  max-width: 40rem;
  padding: 1rem;
  margin-left: auto;
  margin-right: auto;
}

.input {
  position: relative;

  &__label {
    position: absolute;
    left: 0;
    top: 0;
    padding: calc(var(--size-bezel) * 0.75) calc(var(--size-bezel) * 0.5);
    margin: calc(var(--size-bezel) * 0.75 + 3px) calc(var(--size-bezel) * 0.5);
    white-space: nowrap;
    transform: translate(0, 0);
    transform-origin: 0 0;
    transition: transform 120ms ease-in;
    color: gray;
    line-height: 1.2;
  }
  &__field {
    box-sizing: border-box;
    display: block;
    width: 100%;
    border: 3px solid currentColor;
    padding: calc(var(--size-bezel) * 1.5) var(--size-bezel);
    color: currentColor;
    background: transparent;
    border-radius: var(--size-radius);
    margin-bottom: 1rem;

    &:focus,
    &:not(:placeholder-shown) {
      & + .input__label {
        transform: translate(0.25rem, -65%) scale(0.8);
        color: #ff80ab; /* Updated to match our pastel theme */
        background: var(--white);
        padding: 0 0.3em;
        z-index: 2;
      }
    }
  }
}

.toggle-password-btn {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0 0.25em;
  color: var(--txt-darkest);
  z-index: 3;
}
.button-group {
  margin-top: calc(var(--size-bezel) * 2.5);
  display: flex;
  justify-content: space-between;
}

button {
  color: currentColor;
  padding: var(--size-bezel) calc(var(--size-bezel) * 2);
  background: var(--light);
  border: none;
  border-radius: var(--size-radius);
  font-weight: 900;
  font-family: "Roboto", "Arial", "Helvetica Neue", "Segoe UI", "Tahoma",
    "Geneva", "Verdana", "sans-serif";
}

button + button {
  margin-left: calc(var(--size-bezel) * 2);
}

.icon {
  display: inline-block;
  width: 1em;
  height: 1em;
  margin-right: 0.5em;
}

.hidden {
  display: none;
}

.warn {
  color: #ff8a80; /* Lighter red to match our pastel theme */
  margin-top: 1rem;
}

.button-group-left {
  display: flex;
}

.login-button-loader {
  margin-right: 2em;
}
// Logo và chữ Joynet trên một dòng, căn giữa đẹp
.logo-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.joynet-logo-text {
  font-family: "Montserrat", "Segoe UI", "Arial", "Helvetica Neue", sans-serif;
  font-weight: 900;
  font-size: 2rem;
  background: linear-gradient(90deg, #fe7b77 0%, #fea94f 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 2px 2px 8px rgba(254, 123, 119, 0.1),
    0 2px 8px rgba(254, 169, 79, 0.1);
  display: inline-block;
}
// Hiệu ứng border đỏ khi input lỗi
.input-error {
  border-color: #ff8a80 !important; /* Lighter red to match our pastel theme */
  box-shadow: 0 0 0 2px rgba(255, 138, 128, 0.15);
}
/* Google Login Styles */
.divider-row {
  display: flex;
  align-items: center;
  margin: 1.5rem 0 1rem 0;
}
.divider-line {
  flex: 1;
  height: 1px;
  background: #e0e0e0;
}
.divider-text {
  margin: 0 1rem;
  color: #888;
  font-size: 0.95rem;
}
.google-login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.7rem 0;
  background: #fff;
  border: 1px solid #d1d1d1;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  color: #444;
  cursor: pointer;
  transition: box-shadow 0.2s;
  margin-bottom: 1.2rem;
}
.google-login-btn:hover {
  box-shadow: 0 2px 8px rgba(66, 133, 244, 0.15);
}
.google-logo {
  width: 22px;
  height: 22px;
}
</style>
