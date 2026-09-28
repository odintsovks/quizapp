<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, setSession } from '../api'

const route = useRoute()
const router = useRouter()

const login = ref(typeof route.query.login === 'string' ? route.query.login : '')
const email = ref('')
const password = ref('')
const error = ref('')

const doRegister = async () => {
  error.value = ''
  try {
    const res = await api<{ session: string }>('/register', 'POST', { name: login.value, email: email.value, pass: password.value })
    setSession(res.session)
    router.push('/')
  } catch (err) {
    error.value = (err as Error).message
  }
}
</script>

<template>
  <form @submit.prevent="doRegister">
    <div class="frame">
      <h1 class="center">Register</h1>
      <table>
        <tbody>
          <tr><td><h2>Username</h2></td></tr>
          <tr><td><input v-model="login" placeholder="Username" /></td></tr>
          <tr><td><h2>E-mail</h2></td></tr>
          <tr><td><input v-model="email" type="email" placeholder="E-mail" /></td></tr>
          <tr><td><h2>Password</h2></td></tr>
          <tr><td><input v-model="password" type="password" placeholder="Password" /></td></tr>
          <tr><td><button type="submit">Register</button></td></tr>
        </tbody>
      </table>
      <p class="error" v-if="error !== ''">{{ error }}</p>
    </div>
  </form>
</template>

<style scoped></style>
