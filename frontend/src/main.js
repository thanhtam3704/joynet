import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import 'ant-design-vue/dist/reset.css'
import Antd from 'ant-design-vue'
import vue3GoogleLogin from 'vue3-google-login'

const app = createApp(App);

// Initialize Google Login với Client ID
app.use(vue3GoogleLogin, {
  clientId: '749220537519-beauagaft0dmdc9uf2ije8fo0mrdc9jd.apps.googleusercontent.com'
})

app.use(store);
app.use(router);
app.use(Antd);

app.mount("#app");
