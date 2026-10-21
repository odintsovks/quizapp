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

interface HistoryEntry {
  quizUid: string;
  title: string;
  score: number;
  maxScore: number;
  createdAt: string;
}

const router = useRouter();

const name = ref('');
const quizzes = ref<QuizSummary[]>([]);
const history = ref<HistoryEntry[]>([]);
const error = ref('');

const statusText = (status: QuizStatus) =>
  status === QuizStatus.Draft ? 'draft' : status === QuizStatus.Finished ? 'finished' : 'active';

const formatDate = (iso: string) => new Date(iso).toLocaleString();

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
    loadHistory();
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

const loadHistory = async () => {
  try {
    history.value = await api<HistoryEntry[]>('/history');
  } catch (err) {
    error.value = (err as Error).message;
  }
};

const logout = () => {
  clearSession();
  name.value = '';
  history.value = [];
};

onMounted(() => {
  loadMe();
  loadQuizzes();
});
</script>

<template>
  <div class="layout">
    <div class="content">
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
    </div>
    <aside v-if="name !== ''" class="frame history-panel">
      <h2>History</h2>
      <ul v-if="history.length > 0">
        <li v-for="(entry, i) in history" :key="i">
          <a :href="'/quiz/' + entry.quizUid">{{ entry.title }}</a><br />
          {{ entry.score }} / {{ entry.maxScore }} — {{ formatDate(entry.createdAt) }}
        </li>
      </ul>
      <p v-else>No quizzes taken yet.</p>
    </aside>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

.content {
  flex: 1;
  min-width: 0;
}

.history-panel {
  width: 17rem;
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .layout {
    flex-direction: column;
  }

  .history-panel {
    width: 100%;
  }
}
</style>
