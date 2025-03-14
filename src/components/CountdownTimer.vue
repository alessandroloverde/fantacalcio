<template>
  <span :class="{ 'time-warning': isWarning }">{{ formattedTimeRemaining }}</span>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

const props = defineProps<{
  expiryDate: Date | { seconds: number; nanoseconds: number }
}>()

const timeRemaining = ref('')
let timer: number | undefined

const getTimeRemaining = () => {
  const expiry =
    props.expiryDate instanceof Date ? props.expiryDate : new Date(props.expiryDate.seconds * 1000)

  const now = new Date()
  const diff = expiry.getTime() - now.getTime()

  if (diff <= 0) {
    return 'Expired'
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  if (days > 0) {
    return `${days}d ${hours}h`
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  } else {
    return `${seconds}s`
  }
}

const updateTimer = () => {
  timeRemaining.value = getTimeRemaining()
}

const formattedTimeRemaining = computed(() => timeRemaining.value)

const isWarning = computed(() => {
  const expiry =
    props.expiryDate instanceof Date ? props.expiryDate : new Date(props.expiryDate.seconds * 1000)

  const now = new Date()
  const diff = expiry.getTime() - now.getTime()

  // Return true if less than 1 hour remaining
  return diff < 1000 * 60 * 60
})

onMounted(() => {
  updateTimer()
  timer = window.setInterval(updateTimer, 1000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<style scoped>
.time-warning {
  color: #dc3545;
  font-weight: bold;
}
</style>
