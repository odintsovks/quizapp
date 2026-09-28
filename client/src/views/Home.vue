<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, getSession, clearSession } from '../api';

enum QuizStatus {
  Draft,
  Active,
  Finished
}

interface QuizSummary {
  uid: string;
  author: string;
  title: string;
  status: QuizStatus;
}

const router = useRouter();

const name = ref('');
const quizzes = ref<QuizSummary[]>([]);
const error = ref('');

const statusText = (status: QuizStatus) =>
  status === QuizStatus.Draft ? 'draft' : status === QuizStatus.Finished ? 'finished' : 'active';

const controlQuiz = async (uid: string, action: string) => {
  try {
    await api(`/quiz/${action}?id=${uid}`, 'POST');
    error.value = '';
    loadQuizzes();
  } catch (err) {
    error.value = (err as Error).message;
  }
};

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
  <p class="error" v-if="error !== ''">{{ error }}</p>
  <div class="frame">
    <button v-if="name !== ''" @click="router.push('/editor')">Create Quiz</button>
    <button v-if="name !== ''" @click="logout" style="float: right;">Logout</button>
    <button v-else @click="router.push('/login')">Login/Register</button>
    <p v-if="name !== ''" style="float: right;">Logged in as {{ name }} </p>
  </div>
  <div class="frame">
    <h2>Quizzes</h2>
    <ul>
      <li v-for="quiz in quizzes" :key="quiz.uid">
        <a v-if="quiz.status === QuizStatus.Active" :href="'/quiz/' + quiz.uid">{{ quiz.title }}</a>
        <span v-else>{{ quiz.title }} ({{ statusText(quiz.status) }})</span>
        by {{ quiz.author }}
        <button v-if="quiz.author === name && quiz.status === QuizStatus.Draft" @click="controlQuiz(quiz.uid, 'start')">Start</button>
        <button v-if="quiz.author === name && quiz.status === QuizStatus.Active" @click="controlQuiz(quiz.uid, 'end')">End</button>
      </li>
    </ul>
  </div>
</template>

<style scoped></style>
