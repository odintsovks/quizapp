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
    <table>
      <tbody>
        <tr><td>login</td><td><input v-model="login" placeholder="login" /></td></tr>
        <tr><td>password</td><td><input v-model="password" type="password" placeholder="password" /></td></tr>
        <tr><td colspan="2"><button type="submit">Login</button><button type="button" @click="goToRegister">Register</button></td></tr>
      </tbody>
    </table>
    <p class="error" v-if="error !== ''">{{ error }}</p>
  </form>
</template>

<style scoped></style>
