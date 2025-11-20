<template>
  <div class="google-auth-processing">
    <div class="loading-container">
      <div class="spinner"></div>
      <h2>Đang xử lý đăng nhập Google...</h2>
      <p>Vui lòng chờ trong giây lát</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'GoogleAuthSuccess',
  mounted() {
    this.processGoogleAuth();
  },
  methods: {
    async processGoogleAuth() {
      // Lấy token từ URL params
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const error = urlParams.get('error');
      
      if (error) {
        console.error('Google auth error:', error);
        this.$router.push('/login?error=google_auth_failed');
        return;
      }
      
      if (token) {
        try {
          // Lưu token
          localStorage.setItem('token', token);
          
          // Fetch user info và cập nhật store
          await this.$store.dispatch('fetchUser');
          
          // Chuyển hướng về home
          this.$router.push('/home');
        } catch (error) {
          console.error('Failed to fetch user info:', error);
          // Vẫn chuyển về home, user info sẽ được load lại
          this.$router.push('/home');
        }
      } else {
        // Không có token, chuyển về login
        this.$router.push('/login');
      }
    }
  }
};
</script>

<style scoped>
.google-auth-processing {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.loading-container {
  text-align: center;
  background: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

h2 {
  color: #333;
  margin-bottom: 0.5rem;
}

p {
  color: #666;
  margin: 0;
}
</style>