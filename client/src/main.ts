import { createApp } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from './App.vue'
import HomeView from './views/Home.vue'
import RegisterView from './views/Register.vue'
import LoginView from './views/Login.vue'

export const router = createRouter({
  history : createMemoryHistory(),
  routes : [
    { path: '/', component: HomeView },
    { path: '/register', component: RegisterView },
    { path: '/login', component: LoginView },
  ]
});

createApp(App).use(router).mount('#app')
