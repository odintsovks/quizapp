<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

const goToLogin = () => {
  router.push("/login");
}
const goToQuiz = () => {
  router.push("/quiz");
}
const goToEditor = () => {
  router.push("/editor");
}
</script>

<template>
  <button @click="goToLogin">Login/Register</button>
  <button @click="goToQuiz">Quiz test</button>
  <button @click="goToEditor">Editor test</button>
</template>

<style scoped></style>
