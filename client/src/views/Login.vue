<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const login = ref('login')
const password = ref('password')

const router = useRouter()

const goToRegister = () => {
  sessionStorage.setItem("registerLogin", login.value)
  sessionStorage.setItem("registerPassword", password.value)
  router.push('/register')
}
</script>

<template>
  <table>
    <tbody>
      <tr>login<td><input v-model="login" /></td></tr>
      <tr>password<td><input v-model="password" /></td></tr>
      <tr><td><button @click="goToRegister">Register</button><button>Login</button></td></tr>
    </tbody>
  </table>
</template>

<style scoped></style>
