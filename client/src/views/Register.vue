<script setup lang="ts">
import { ref } from 'vue'

const login = ref(sessionStorage.getItem("registerLogin") ?? 'login')
const email = ref('email')
const password = ref('password')
sessionStorage.removeItem("registerLogin")
</script>

<template>
  <table>
    <tbody>
      <tr>login<td><input v-model="login" /></td></tr>
      <tr>email<td><input v-model="email" /></td></tr>
      <tr>password<td><input v-model="password" /></td></tr>
      <tr><td><button>Register</button></td></tr>
    </tbody>
  </table>
</template>

<style scoped></style>
