import { createApp } from 'vue'
import { createWebHistory, createRouter } from 'vue-router'
import { getSession } from './api'
import './style.css'
import App from './App.vue'
import HomeView from './views/Home.vue'
import LoginView from './views/Login.vue'
import RegisterView from './views/Register.vue'
import QuizView from './views/Quiz.vue'
import EditorView from './views/Editor.vue'

export const router = createRouter({
  history : createWebHistory(),
  routes : [
    { path: '/', component: HomeView },
    { path: '/login', component: LoginView },
    { path: '/register', component: RegisterView },
    { path: '/quiz/:id', component: QuizView },
    { path: '/editor', component: EditorView, beforeEnter: () => getSession() !== null || '/login' },
  ]
});

createApp(App).use(router).mount('#app')
