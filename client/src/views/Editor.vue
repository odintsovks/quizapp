<script setup lang="ts">
  import { onMounted, ref } from 'vue';
  import { api } from '../api';
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

  const author = ref('');
  const error = ref('');
  const savedUid = ref<string | null>(null);

  const loadAuthor = async () => {
    try {
      const res: { name: string } = await api<{ name: string }>('/me');
      author.value = res.name;
    } catch (err) {
      error.value = (err as Error).message;
    }
  };

  const setWeight = (event: Event) => {
    const v = (event.target as HTMLInputElement).valueAsNumber;
    data.value.weight = Number.isNaN(v) ? null : v;
  };

  const saveQuestion = () => {
    if (data.value.weight === null || data.value.question === null || data.value.question === '' || data.value.kind === null || data.value.answer === null)
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

  const deleteQuestion = (index: number) => {
    q.value.questions.splice(index, 1);
    if (index < currentQuestionIndex)
      currentQuestionIndex--;
    if (q.value.questions.length === 0) {
      currentQuestionIndex = 0;
      data.value.weight = null;
      data.value.question = null;
      data.value.kind = null;
      data.value.answer = null;
    } else if (index <= currentQuestionIndex) {
      currentQuestionIndex = Math.min(currentQuestionIndex, q.value.questions.length - 1);
      gotoQuestion(currentQuestionIndex);
    }
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

  const removeRadioOption = (i: number) => {
    const a = data.value.answer as RadioAnswer;
    a.options.splice(i, 1);
    if (a.correctAnswer === i)
      a.correctAnswer = 0;
    else if (a.correctAnswer > i)
      a.correctAnswer--;
  }

  const toggleCheckboxCorrect = (i: number, checked: boolean) => {
    const a = data.value.answer as CheckboxAnswer;
    if (checked)
      a.correctAnswers.push(i);
    else
      a.correctAnswers.splice(a.correctAnswers.indexOf(i), 1);
  }

  const removeCheckboxOption = (i: number) => {
    const a = data.value.answer as CheckboxAnswer;
    a.options.splice(i, 1);
    a.correctAnswers = a.correctAnswers.filter(v => v !== i).map(v => (v > i ? v - 1 : v));
  }

  const saveQuiz = async () => {
    if (q.value.title === '' || q.value.questions.length === 0) {
      error.value = 'set a title and save at least one question first';
      return;
    }
    saveQuestion();
    try {
      const res: { uid: string } = await api<{ uid: string }>('/quiz', 'POST', { title: q.value.title, questions: q.value.questions });
      savedUid.value = res.uid;
    } catch (err) {
      error.value = (err as Error).message;
    }
  };

  onMounted(loadAuthor);
</script>

<template>
  <p class="error" v-if="error !== ''">{{ error }}</p>
  <input v-model="q.title" placeholder="Title"/>
  <div class="frame" style="display: flex; flex-direction: column;">
    <h2 style="line-height: 0">Contents</h2>
    <textarea v-model="data.question" placeholder="Question text" style="flex: 2; flex-basis: 150px;"/>
    <div>
      <button @click="setQuestionKind(AnswerKind.Radio)">Radio</button>
      <button @click="setQuestionKind(AnswerKind.Checkbox)">CheckBox</button>
      <button @click="setQuestionKind(AnswerKind.TextEdit)">TextEdit</button>
      <input type="number" :value="data.weight ?? ''" @input="setWeight" placeholder="Weight" />
    </div>
    <div v-if="data.kind === AnswerKind.Radio && data.answer !== null">
      <div v-for="(o, i) in (data.answer as RadioAnswer).options" :key="i">
        <input type="radio" name="correctRadio" :checked="(data.answer as RadioAnswer).correctAnswer === i" @change="(data.answer as RadioAnswer).correctAnswer = i" />
        <input :value="o" @input="event => (data.answer as RadioAnswer).options[i] = (event.target as HTMLInputElement).value" />
        <button v-if="(data.answer as RadioAnswer).options.length > 1" @click="removeRadioOption(i)">-</button>
      </div>
      <button @click="(data.answer as RadioAnswer).options.push('Answer')">+</button>
    </div>
    <div v-else-if="data.kind === AnswerKind.Checkbox && data.answer !== null">
      <div v-for="(o, i) in (data.answer as CheckboxAnswer).options" :key="i">
        <input type="checkbox" :checked="(data.answer as CheckboxAnswer).correctAnswers.includes(i)" @change="event => toggleCheckboxCorrect(i, (event.target as HTMLInputElement).checked)" />
        <input :value="o" @input="event => (data.answer as CheckboxAnswer).options[i] = (event.target as HTMLInputElement).value" />
        <button v-if="(data.answer as CheckboxAnswer).options.length > 1" @click="removeCheckboxOption(i)">-</button>
      </div>
      <button @click="(data.answer as CheckboxAnswer).options.push('Answer')">+</button>
    </div>
    <div v-else-if="data.kind === AnswerKind.TextEdit && data.answer !== null">
      <div v-for="(ans, i) in (data.answer as TextEditAnswer).correctAnswers" :key="i">
        <input :value="ans" @input="event => (data.answer as TextEditAnswer).correctAnswers[i] = (event.target as HTMLInputElement).value" />
        <button v-if="(data.answer as TextEditAnswer).correctAnswers.length > 1" @click="(data.answer as TextEditAnswer).correctAnswers.splice(i, 1)">-</button>
      </div>
      <button @click="(data.answer as TextEditAnswer).correctAnswers.push('Answer')">+</button>
    </div>
    <div>
      <button style="float: right;" @click="deleteQuestion(i)">x</button>
      <button style="float: right;" v-for="(page, i) in q.questions" :key="i"
        @click="gotoQuestion(q.questions.length - i - 1)">{{ q.questions.length - i }}</button>
    </div>
    <div>
      <button @click="saveQuestion">Save</button>
      <button @click="addQuestion">New Question</button>
      <button @click="saveQuiz">Save Quiz</button>
    </div>
    <p v-if="savedUid !== null">Saved: <a :href="'/quiz/' + savedUid">{{ savedUid }}</a></p>
  </div>
</template>

<style scoped></style>
