<!-- LoginForm.vue -->
<template>
  <div class="login-form">
    <h2>{{ isLogin ? 'Login' : 'Sign Up' }}</h2>
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="email">Email:</label>
        <input type="email" id="email" v-model="email" required placeholder="Enter your email" />
      </div>
      <div class="form-group">
        <label for="password">Password:</label>
        <input
          type="password"
          id="password"
          v-model="password"
          required
          placeholder="Enter your password"
        />
      </div>
      <div class="error" v-if="error">{{ error }}</div>
      <button type="submit">{{ isLogin ? 'Login' : 'Sign Up' }}</button>
      <p class="toggle-mode">
        {{ isLogin ? "Don't have an account?" : 'Already have an account?' }}
        <a href="#" @click.prevent="toggleMode">
          {{ isLogin ? 'Sign Up' : 'Login' }}
        </a>
      </p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login, signUp } from '@/utils/auth'

const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref('')
const isLogin = ref(true)

const handleSubmit = async () => {
  try {
    error.value = ''
    if (isLogin.value) {
      await login({ email: email.value, password: password.value })
    } else {
      await signUp({ email: email.value, password: password.value })
    }
    router.push('/dashboard')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'An error occurred'
  }
}

const toggleMode = () => {
  isLogin.value = !isLogin.value
  error.value = ''
}
</script>

<style scoped>
.login-form {
  max-width: 50%;
  margin: 2rem auto;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

button {
  width: 100%;
  padding: 0.75rem;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 1rem;
}

button:hover {
  background-color: #45a049;
}

.error {
  color: #dc3545;
  margin-top: 0.5rem;
  font-size: 0.875rem;
}

.toggle-mode {
  text-align: center;
  margin-top: 1rem;
}

.toggle-mode a {
  color: #4caf50;
  text-decoration: none;
}

.toggle-mode a:hover {
  text-decoration: underline;
}
</style>
