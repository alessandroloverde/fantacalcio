<template>
  <div id="app">
    <NavBar />
    <main class="main-content">
      <router-view></router-view>
    </main>
  </div>
</template>

<script setup lang="ts">
import NavBar from '@/components/NavBar.vue'
</script>

<style>
#app {
  min-height: 100vh;
  background-color: #34373a;
}

.main-content {
  padding: 2rem;
}
</style>
