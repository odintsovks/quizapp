<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, getSession, clearSession } from '../api';

interface QuizSummary {
  uid: string;
  author: string;
  title: string;
}

const router = useRouter();

const name = ref('');
const quizzes = ref<QuizSummary[]>([]);
const error = ref('');

const loadMe = async () => {
  if (getSession() === null) return;
  try {
    const res: { name: string } = await api<{ name: string }>('/me');
    name.value = res.name;
  } catch {
    clearSession(); // stale session, e.g. server restarted
  }
};

const loadQuizzes = async () => {
  try {
    quizzes.value = await api<QuizSummary[]>('/quizzes');
  } catch (err) {
    error.value = (err as Error).message;
  }
};

const logout = () => {
  clearSession();
  name.value = '';
};

onMounted(() => {
  loadMe();
  loadQuizzes();
});
</script>

<template>
  <p v-if="error !== ''">{{ error }}</p>
  <p v-if="name !== ''">logged in as {{ name }}</p>
  <button v-if="name !== ''" @click="router.push('/editor')">Create quiz</button>
  <button v-if="name !== ''" @click="logout">Logout</button>
  <button v-else @click="router.push('/login')">Login/Register</button>
  <h2>Quizzes</h2>
  <ul>
    <li v-for="quiz in quizzes" :key="quiz.uid">
      <a :href="'/quiz/' + quiz.uid">{{ quiz.title }}</a> by {{ quiz.author }}
    </li>
  </ul>
</template>

<style scoped></style>
