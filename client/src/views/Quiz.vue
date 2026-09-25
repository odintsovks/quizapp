<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api'

enum AnswerKind {
  Radio,
  Checkbox,
  TextEdit
}

interface QuizQuestion {
  question: string;
  weight: number;
  kind: AnswerKind;
  options?: string[];
}

interface QuizData {
  author: string;
  title: string;
  questions: QuizQuestion[];
}

interface ScoreResult {
  score: number;
  maxScore: number;
  questions: { question: string; correct: boolean; weight: number }[];
}

const route = useRoute()
const id: string = typeof route.params.id === 'string' ? route.params.id : ''

const quiz = ref<QuizData | null>(null)
const error = ref('')
// one entry per question: radio -> option index, checkbox -> selected indices, text -> the text
const answers = ref<(number | null | number[] | string)[]>([])
const result = ref<ScoreResult | null>(null)

const load = async () => {
  try {
    const data: QuizData = await api<QuizData>(`/quiz?id=${id}`)
    quiz.value = data
    answers.value = data.questions.map(q => q.kind === AnswerKind.Checkbox ? [] : q.kind === AnswerKind.TextEdit ? '' : null)
  } catch (err) {
    error.value = (err as Error).message
  }
}

const submit = async () => {
  const data: QuizData | null = quiz.value
  if (data === null) return
  try {
    const res: ScoreResult = await api<ScoreResult>(`/quiz/score?id=${id}`, 'POST', { answers: answers.value })
    result.value = {
      score: res.score,
      maxScore: res.maxScore,
      questions: res.questions.map((r, i) => ({ question: data.questions[i]?.question ?? '', correct: r.correct, weight: r.weight })),
    }
  } catch (err) {
    error.value = (err as Error).message
  }
}

onMounted(load)
</script>

<template>
  <p v-if="error !== ''">{{ error }}</p>
  <div v-else-if="result !== null">
    <h1>{{ quiz?.title ?? '' }}</h1>
    <p>score: {{ result.score }} / {{ result.maxScore }}</p>
    <ul>
      <li v-for="(r, i) in result.questions" :key="i">
        {{ r.question }} (weight {{ r.weight }}): {{ r.correct ? 'correct' : 'incorrect' }}
      </li>
    </ul>
  </div>
  <form v-else-if="quiz !== null" @submit.prevent="submit">
    <h1>{{ quiz.title }}</h1>
    <p>by {{ quiz.author }}</p>
    <div v-for="(q, qi) in quiz.questions" :key="qi">
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
</template>

<style scoped></style>
