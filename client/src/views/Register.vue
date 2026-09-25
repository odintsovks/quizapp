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
    <table>
      <tbody>
        <tr><td>login</td><td><input v-model="login" placeholder="login" /></td></tr>
        <tr><td>email</td><td><input v-model="email" type="email" placeholder="email" /></td></tr>
        <tr><td>password</td><td><input v-model="password" type="password" placeholder="password" /></td></tr>
        <tr><td colspan="2"><button type="submit">Register</button></td></tr>
      </tbody>
    </table>
    <p v-if="error !== ''">{{ error }}</p>
  </form>
</template>

<style scoped></style>
