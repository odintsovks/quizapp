import { createApp } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from './App.vue'
import HomeView from './views/Home.vue'

export const router = createRouter({
  history : createMemoryHistory(),
  routes : [
    { path: '/', component: HomeView },
  ]
});

createApp(App).use(router).mount('#app')
