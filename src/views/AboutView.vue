<template>
  <div class="about">
    <form>
      <h2>Inserisci un partecipante</h2>
      <div>
        <label for="name">Name</label>
        <input type="text" placeholder="Name" v-model="name" />
      </div>
      <div>
        <label for="email">Email</label>
        <input type="email" placeholder="Email" v-model="email" />
      </div>
      <div>
        <label for="role">is Admin</label>
        <input type="checkbox" id="role" name="role" value="false" v-model="role" />
      </div>
      <button @click="handleAddParticipant">Inserisci</button>
    </form>

    <div class="participants-list">
      <h2>Lista Partecipanti</h2>
      <div v-for="participant in participants" :key="participant.email" class="participant-card">
        <p><strong>Nome:</strong> {{ participant.name }}</p>
        <p><strong>Email:</strong> {{ participant.email }}</p>
        <p><strong>Admin:</strong> {{ participant.role ? 'Sì' : 'No' }}</p>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/firebase'
import { addParticipant, type Participant } from '@/utils/addParticipants'

const participants = ref<Participant[]>([])
const name = ref('')
const email = ref('')
const role = ref(false)

const handleAddParticipant = async (e: { preventDefault: () => void }) => {
  e.preventDefault()

  try {
    const newParticipant = {
      name: name.value,
      email: email.value,
      role: role.value,
    }

    // * Add the new participant
    await addParticipant(newParticipant)

    participants.value.push(newParticipant)

    // * Clear form
    name.value = ''
    email.value = ''
    role.value = false
  } catch (error) {
    console.error('Error in handleAddParticipant:', error)
  }
}

const fetchParticipants = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'participants'))

    console.log('querySnapshot:', querySnapshot.docs)

    participants.value = querySnapshot.docs.map((doc) => doc.data() as Participant)
  } catch (error) {
    console.error('Error fetching participants: ', error)
  }
}

onMounted(() => {
  fetchParticipants()
})
</script>

<style lang="scss"></style>
