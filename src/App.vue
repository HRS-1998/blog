<script setup lang="ts">
import Card from './components/Card.vue';
import HelloWorld from './components/HelloWorld.vue'
import { ref } from 'vue'

let title=ref('这是一条Title'),
content='这是具体的内容',
classfiy='JS',
date='2023-04-04';
</script>

<template>
<div>
  <HelloWorld msg="Vite + Vue" />
  <Card :content=content  :classfiy=classfiy :date=date :title=title />
</div>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
