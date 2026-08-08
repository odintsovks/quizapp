import { createApp } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from './App.vue'
import HomeView from './views/Home.vue'
import LoginView from './views/Login.vue'
import RegisterView from './views/Register.vue'
import QuizView from './views/Quiz.vue'
import EditorView from './views/Editor.vue'

export const router = createRouter({
  history : createMemoryHistory(),
  routes : [
    { path: '/', component: HomeView },
    { path: '/login', component: LoginView },
    { path: '/register', component: RegisterView },
    { path: '/quiz', component: QuizView },
    { path: '/editor', component: EditorView },
  ]
});

createApp(App).use(router).mount('#app')
