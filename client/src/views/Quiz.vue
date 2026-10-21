<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api, getSession } from '../api'
import { connectWebSocket, sendWs, type WsMessage } from '../ws'

enum AnswerKind {
  Radio,
  Checkbox,
  TextEdit
}

enum QuizStatus {
  Draft,
  Active,
  Finished
}

interface QuizQuestion {
  question: string;
  image?: string;
  weight: number;
  kind: AnswerKind;
  options?: string[];
}

interface QuestionResult {
  question: string;
  correct: boolean;
  weight: number;
}

interface JoinedQuiz {
  quizId: string;
  author: string;
  title: string;
  status: QuizStatus;
  questions: QuizQuestion[];
  participants: string[];
  isOrganizer: boolean;
}

interface ScoreResult {
  score: number;
  maxScore: number;
  questions: QuestionResult[];
}

interface LeaderboardEntry {
  name: string;
  score: number;
  maxScore: number;
}

const route = useRoute()
const id: string = typeof route.params.id === 'string' ? route.params.id : ''

const name = ref('')
const error = ref('')
const joined = ref<JoinedQuiz | null>(null)
// one entry per question: radio -> option index, checkbox -> selected indices, text -> the text
const answers = ref<(number | null | number[] | string)[]>([])
const result = ref<ScoreResult | null>(null)
const leaderboard = ref<LeaderboardEntry[] | null>(null)

let ws: WebSocket | null = null

const handleMessage = (msg: WsMessage) => {
  switch (msg.type) {
    case 'joined': {
      const quiz = msg as unknown as JoinedQuiz & { leaderboard?: LeaderboardEntry[] }
      joined.value = quiz
      answers.value = quiz.questions.map(q => q.kind === AnswerKind.Checkbox ? [] : q.kind === AnswerKind.TextEdit ? '' : null)
      if (quiz.leaderboard !== undefined) leaderboard.value = quiz.leaderboard
      error.value = ''
      break
    }
    case 'quiz-status': {
      if (joined.value !== null) {
        joined.value.status = msg.status as QuizStatus
      }
      break
    }
    case 'participant-joined': {
      const quiz = joined.value
      const participantName = msg.name as string
      if (quiz !== null && !quiz.participants.includes(participantName)) {
        quiz.participants.push(participantName)
      }
      break
    }
    case 'participant-left': {
      const quiz = joined.value
      const participantName = msg.name as string
      if (quiz !== null) {
        const index = quiz.participants.indexOf(participantName)
        if (index >= 0) quiz.participants.splice(index, 1)
      }
      break
    }
    case 'scored': {
      result.value = msg as unknown as ScoreResult
      break
    }
    case 'leaderboard': {
      leaderboard.value = msg.entries as LeaderboardEntry[]
      break
    }
    case 'error': {
      error.value = msg.error as string
      break
    }
  }
}

const connect = () => {
  const session = getSession()
  ws = connectWebSocket(handleMessage)
  ws.onopen = () => {
    if (ws === null) return
    const join: Record<string, unknown> = { type: 'join', quizId: id }
    if (session !== null) join.session = session
    if (name.value.trim() !== '') join.name = name.value.trim()
    sendWs(ws, join)
  }
  ws.onerror = () => {
    if (joined.value === null) error.value = 'could not connect to the quiz server'
  }
}

const doJoin = () => {
  error.value = ''
  connect()
}

// prefill the join name with the account name so results are tied to it
onMounted(async () => {
  if (getSession() === null) return
  try {
    const res: { name: string } = await api<{ name: string }>('/me')
    name.value = res.name
  } catch {} // stale session, the join form will ask for a name
})

const submit = () => {
  if (ws !== null) sendWs(ws, { type: 'answer', answers: answers.value })
}

const controlQuiz = async (action: string) => {
  try {
    await api(`/quiz/${action}?id=${id}`, 'POST')
    error.value = ''
  } catch (err) {
    error.value = (err as Error).message
  }
}

onBeforeUnmount(() => {
  ws?.close()
})
</script>

<template>
  <p class="error" v-if="error !== ''">{{ error }}</p>
  <div class="frame">
    <form v-if="joined === null" @submit.prevent="doJoin">
      <h1>Join quiz</h1>
      <input v-model="name" placeholder="Your name" />
      <button type="submit">Join</button>
    </form>
    <div v-else>
      <h1>Quiz "{{ joined.title }}" by {{ joined.author }}</h1>
      <p v-if="joined.participants.length > 0" style="text-align: right;">Current participants:<br> {{ joined.participants.join(', ') }}</p>
      <div v-if="joined.isOrganizer">
        <button v-if="joined.status === QuizStatus.Draft" @click="controlQuiz('start')"
          style="float: right;">Start Quiz</button>
        <button v-if="joined.status === QuizStatus.Active" @click="controlQuiz('end')" style="float:
          right;">End Quiz</button>
      </div>
      <template v-if="result !== null">
        <p>score: {{ result.score }} / {{ result.maxScore }}</p>
        <ul>
          <li v-for="(r, i) in result.questions" :key="i">
            {{ r.question }} (weight {{ r.weight }}): {{ r.correct ? 'correct' : 'incorrect' }}
          </li>
        </ul>
      </template>
      <form v-else-if="joined.status === QuizStatus.Active" @submit.prevent="submit">
        <div v-for="(q, qi) in joined.questions" :key="qi">
          <img v-if="q.image !== undefined" :src="q.image" style="max-width: 100%; border-radius: 0.5rem;" />
          <p>{{ q.question }} (weight {{ q.weight }})</p>
          <template v-if="q.kind === AnswerKind.Radio">
            <label v-for="(o, i) in q.options ?? []" :key="i">
              <input type="radio" :name="'question' + qi" :value="i" v-model="answers[qi]" /> {{ o }}
            </label>
          </template>
          <template v-else-if="q.kind === AnswerKind.Checkbox">
            <label v-for="(o, i) in q.options ?? []" :key="i">
              <input type="checkbox" :value="i" v-model="answers[qi]" /> {{ o }}
            </label>
          </template>
          <input v-else v-model="answers[qi]" />
        </div>
        <button type="submit">Submit</button>
      </form>
      <p v-else-if="joined.status === QuizStatus.Draft">The quiz has not started yet.</p>
      <p v-else>The quiz has ended.</p>
      <div v-if="leaderboard !== null && leaderboard.length > 0">
        <h2>Leaderboard</h2>
        <ol>
          <li v-for="(e, i) in leaderboard" :key="i">{{ e.name }} — {{ e.score }} / {{ e.maxScore }}</li>
        </ol>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
