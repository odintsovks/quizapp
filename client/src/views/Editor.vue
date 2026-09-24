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

  const q = ref<Quiz>({
    uid: "",
    author: "",
    title: "",
    questions: [],
  });

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
    q.value.questions[currentQuestionIndex] = {
      weight: data.value.weight,
      question: data.value.question,
      kind: data.value.kind,
      answer: data.value.answer
    }
  }

  const gotoQuestion = (index: number) => {
    data.value.weight = q.value.questions.at(index)?.weight ?? null;
    data.value.question = q.value.questions.at(index)?.question ?? null;
    data.value.kind = q.value.questions.at(index)?.kind ?? null;
    data.value.answer = q.value.questions.at(index)?.answer ?? null;
    currentQuestionIndex = index;
  }

  const addQuestion = () => {
    saveQuestion();
    data.value.weight = null;
    data.value.question = null;
    data.value.kind = null;
    data.value.answer = null;
    currentQuestionIndex = q.value.questions.length
  }

  const setQuestionKind = (kind: AnswerKind) => {
    data.value.kind = kind;
    switch (kind) {
      case AnswerKind.Radio:
        data.value.answer = {
          options: [ "Answer" ],
          correctAnswer: 0
        };
        return;
      case AnswerKind.Checkbox:
        data.value.answer = {
          options: [ "Answer" ],
          correctAnswers: [ 0 ]
        };
        return;
      case AnswerKind.TextEdit:
        data.value.answer = {
          correctAnswers: [ "Answer" ]
        };
        return;
    }
  }
</script>

<template>
  <div v-if="data.kind === null">
    <button @click="setQuestionKind(AnswerKind.Radio)">Radio</button>
    <button @click="setQuestionKind(AnswerKind.Checkbox)">CheckBox</button>
    <button @click="setQuestionKind(AnswerKind.TextEdit)">TextEdit</button>
  </div>
  <div v-if="data.kind === AnswerKind.Radio">
    <div v-for="(o, i) in (data.answer as RadioAnswer).options">
      <input type="radio">
        <input :value="o" @input="event => (data.answer as RadioAnswer).options[i] = (event.target as HTMLInputElement).value" />
      </input>
      <button @click="event => (data.answer as RadioAnswer).options.splice(i, 1)">-</button>
    </div>
    <button @click="event => (data.answer as RadioAnswer).options.push('Answer')">+</button>
  </div>
  <button @click="saveQuestion">Save</button>
  <div v-for="(page, i) in q.questions">
    {{i}}
    <button @click="gotoQuestion(i)">{{i + 1}}</button>
  </div>
  <button @click="addQuestion">+</button>
</template>

<style scoped></style>
