<script setup lang="ts">
import { ref } from "vue";

const data = ref({
  questionText: "Lorem ipsum dolor sit amet",
  answerType: "edit",
  answers: ref([
    "Answer 1",
    "Answer 2",
    "Answer 3"
  ])
})
</script>

<template>
  {{data.questionText}}

  <div v-if="data.answerType == 'radio'" v-for="answerText in data.answers">
    <input type="radio" name="answer">
      {{ answerText }}
    </input>
  </div>
  <div v-if="data.answerType == 'checkbox'" v-for="answerText in data.answers">
    <input type="checkbox">
      {{ answerText }}
    </input>
  </div>
  <div v-if="data.answerType == 'edit'">
    <input />
  </div>
</template>

<style scoped></style>
