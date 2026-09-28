<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, setSession } from '../api'

const login = ref('')
const password = ref('')
const error = ref('')

const router = useRouter()

const goToRegister = () => {
  router.push({ path: '/register', query: { login: login.value } })
}

const doLogin = async () => {
  error.value = ''
  try {
    const res = await api<{ session: string }>('/login', 'POST', { name: login.value, pass: password.value })
    setSession(res.session)
    router.push('/')
  } catch (err) {
    error.value = (err as Error).message
  }
}
</script>

<template>
  <form @submit.prevent="doLogin">
    <div class="frame">
      <h1 class="center">Login</h1>
      <table>
        <tbody>
          <tr><td><h2>Username</h2></td></tr>
          <tr><td><input v-model="login" placeholder="Username" /></td></tr>
          <tr><td><h2>Password</h2></td></tr>
          <tr><td><input v-model="password" type="password" placeholder="Password" /></td></tr>
          <tr><td><button type="button" @click="goToRegister">Register</button><button type="submit">Login</button></td></tr>
        </tbody>
      </table>
    </div>
    <p class="error" v-if="error !== ''">{{ error }}</p>
  </form>
</template>

<style scoped></style>
