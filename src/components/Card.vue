<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ title:string,content:string,date:string,classfiy:string }>()
</script>

<template>
    <div id="header"></div>
 
  <div class="card">
    <div class="title">{{title}}</div>
    <div class="content">{{content}}</div>
    <div class="date">{{date}}</div>
    <div class="classfiy">{{classfiy}}</div>
  </div>


</template>

<style scoped>
.title{
    font-size: 1.5em;
    font-weight: 500;
}
.date{
    position: absolute;
    right: 3%;
    bottom: 5px;
    color: gray;


}
.classfiy{
    position: absolute;
    right:0 ;
    top: 0;
    width: 50px;
    background-color: red;
    color: white;
}
.content{
    font-size: 1em;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: justify;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    position: relative;
    line-height: 16px;
    margin-top: 5px;
}
.card{
    position: relative;
    width: 70vw;
    min-height: 150px;
    box-sizing: border-box;
    box-shadow: 0px 2px 6px rgba(199, 197, 197, 0.5);
    border-radius: 4px;
    box-sizing: border-box;
    margin-top: 20px;
}
</style>