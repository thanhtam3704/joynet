<template>
  <article class="signup">
    <div class="card card--accent">
      <div class="logo-row">
        <img class="card__logo" src="../../assets/logo.png" />
        <span class="joynet-logo-text">Joynet</span>
      </div>

      <h2 class="card__text">Đăng ký để tiếp tục</h2>
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
      <label class="input">
        <input
          class="input__field"
          type="text"
          placeholder=" "
          v-model="displayName"
          :class="{ 'input-error': fillError && !displayName }"
        />
        <span class="input__label">Tên hiển thị</span>
      </label>
      <p class="warn" v-if="fillError">Vui lòng điền đủ thông tin</p>
      <p class="warn" v-if="email && !emailError && showEmailError">
        Vui lòng nhập địa chỉ email hợp lệ
      </p>
      <p class="warn" v-if="signupError">{{ signupError }}</p>
      <div class="button-group">
        <div class="button-group-left">
          <div class="signup-button-loader" v-if="!signupLoading">
            <button @click="signUp">Đăng ký</button>
          </div>
          <div class="signup-button-loader" v-else>
            <SyncLoader class="signup-loader" :color="color" />
          </div>
        </div>
        <div class="button-group-right">
          <router-link to="/login" v-if="!signupLoading">
            <button>Bạn đã có tài khoản?</button>
          </router-link>
        </div>
      </div>

      <!-- Google Signup Divider -->
      <div class="divider-row">
        <span class="divider-line"></span>
        <span class="divider-text">hoặc</span>
        <span class="divider-line"></span>
      </div>
      <!-- Google Signup Button -->
      <button class="google-login-btn" @click="signUpWithGoogle">
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt="Google logo"
          class="google-logo"
        />
        Đăng ký bằng Google
      </button>
    </div>
  </article>
</template>

<script>
import SyncLoader from "vue-spinner/src/SyncLoader.vue";

export default {
  name: "Signup",
  components: { SyncLoader },
  data() {
    return {
      email: "",
      password: "",
      displayName: "",
      fillError: false,
      emailError: false,
      showEmailError: false,
      signupLoading: false,
      showPassword: false,
      signupError: "",
      color: "pink",
    };
  },
  watch: {
    email() {
      this.resetErrors();
    },
    password() {
      this.resetErrors();
    },
    displayName() {
      this.resetErrors();
    },
  },
  methods: {
    resetErrors() {
      this.signupError = "";
      this.fillError = false;
      this.emailError = false;
      this.showEmailError = false;
    },
    async signUpWithGoogle() {
      try {
        const { googleTokenLogin } = await import('vue3-google-login');
        const response = await googleTokenLogin();
        
        // Gửi access_token đến backend (cùng endpoint với login)
        const axios = (await import('@/utils/axios')).default;
        const signupResponse = await axios.post('/auth/google/login', {
          access_token: response.access_token
        }, {
          withCredentials: true,
        });
        
        // Lưu token và chuyển hướng
        localStorage.setItem("token", signupResponse.data.token);
        this.$router.push("/home");
        
      } catch (error) {
        console.error('Google signup error:', error);
        this.signupError = 'Đăng ký Google thất bại. Vui lòng thử lại.';
      }
    },
    validateEmail() {
      return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(this.email);
    },
    async signUp() {
      // Reset states
      this.signupLoading = true;
      this.signupError = "";
      this.fillError = false;
      this.showEmailError = false;

      // Validate inputs
      if (!this.email || !this.password || !this.displayName) {
        this.fillError = true;
        this.signupLoading = false;
        return;
      }

      if (!this.validateEmail()) {
        this.showEmailError = true;
        this.signupLoading = false;
        return;
      }

      const axios = (await import('@/utils/axios')).default;
      try {
        const response = await axios.post('/auth/register', {
          email: this.email,
          password: this.password,
          displayName: this.displayName,
        }, {
          withCredentials: true,
        });
        // Reset form
        this.email = "";
        this.password = "";
        this.displayName = "";
        await this.$router.push("/login");
      } catch (error) {
        if (error.response && error.response.status === 400) {
          this.signupError = error.response.data.error || error.response.data.message || "Email đã được sử dụng.";
        } else if (error.response && error.response.status === 500) {
          this.signupError = "Lỗi server. Vui lòng thử lại sau.";
        } else if (error.response && error.response.status === 422) {
          this.signupError = error.response.data.error || error.response.data.message || "Dữ liệu không hợp lệ.";
        } else if (error.response && (error.response.data.error || error.response.data.message)) {
          this.signupError = error.response.data.error || error.response.data.message;
        } else {
          this.signupError = "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.";
        }
      } finally {
        this.signupLoading = false;
      }
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
  margin-top: 2rem;

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

.signup {
  max-width: 40rem;
  padding: 3rem;
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
    line-height: 1.2;
    color: gray;
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

    &:-webkit-autofill,
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

    // Xử lý màu nền khi autofill
    &:-webkit-autofill {
      -webkit-box-shadow: 0 0 0 30px white inset !important;
      -webkit-text-fill-color: currentColor !important;
    }
  }
}
// Nút hiện/ẩn mật khẩu
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
/* Google Signup Styles */
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
