<script setup lang="ts">
  import { ref } from 'vue';
  enum AnswerKind {
    Radio,
    Checkbox,
    TextEdit
  }

  interface RadioAnswer {
    options: string[];
    correctAnswer: number;
  }

  interface CheckboxAnswer {
    options: string[];
    correctAnswers: number[];
  }

  interface TextEditAnswer {
    correctAnswers: string[];
  }

  interface QuizQuestion {
    weight: number;
    question: string;
    kind: AnswerKind;
    answer: RadioAnswer | CheckboxAnswer | TextEditAnswer;
  }

  interface Quiz {
    uid: string;
    author: string;
    title: string;
    questions: QuizQuestion[];
  }

  const q: Quiz = {
    uid: "",
    author: "",
    title: "",
    questions: [
    ],
  };

  var currentQuestionIndex: number = 0;
  interface QuestionData {
    weight: number | null;
    question: string | null;
    kind: AnswerKind | null;
    answer: RadioAnswer | CheckboxAnswer | TextEditAnswer | null;
  };

  const data = ref<QuestionData>({
    weight: null,
    question: null,
    kind: null,
    answer: null,
  });

  const saveQuestion = () => {
    if (data.value.weight === null || data.value.question === null || data.value.kind === null || data.value.answer === null)
      return;
    q.questions[currentQuestionIndex] = {
      weight: data.value.weight,
      question: data.value.question,
      kind: data.value.kind,
      answer: data.value.answer
    }
  }

  const gotoQuestion = (index: number) => {
    data.value.weight = q.questions.at(index)?.weight ?? null;
    data.value.question = q.questions.at(index)?.question ?? null;
    data.value.kind = q.questions.at(index)?.kind ?? null;
    data.value.answer = q.questions.at(index)?.answer ?? null;
    currentQuestionIndex = index;
  }

  const addQuestion = () => {
    data.value.weight = null;
    data.value.question = null;
    data.value.kind = null;
    data.value.answer = null;
    currentQuestionIndex = q.questions.length
  }

  const setQuestionKind = (kind: AnswerKind) => {
    data.value.kind = kind;
  }
</script>

<template>
  <div v-if="data.kind === null">
    <button @click="setQuestionKind(AnswerKind.Radio)">Radio</button>
    <button @click="setQuestionKind(AnswerKind.Checkbox)">CheckBox</button>
    <button @click="setQuestionKind(AnswerKind.TextEdit)">TextEdit</button>
  </div>
  <div v-if="data.kind === AnswerKind.Radio">
    <input type="radio"><input/></input><button>-</button>
    <button>+</button>
  </div>
  <button @click="saveQuestion">Save</button>
  <div v-for="page in Array(q.questions.length).keys()">
    <button @click="gotoQuestion(page)">{{page + 1}}</button>
  </div>
  <button @click="addQuestion">+</button>
</template>

<style scoped></style>
