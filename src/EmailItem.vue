<template>
    <div v-if="email">
        <h2 class="text-xl font-bold">{{ email.subject || '(no subject)' }}</h2>
        <EmailDisplay :email="email" />
    </div>
    <div v-else-if="error" class="alert alert-error text-error-content font-semibold">
        Error: {{ error }}
    </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import EmailDisplay from './EmailDisplay.vue'
import { useEmailLoader } from './useEmailLoader.js'
import { useKeyboardShortcutsModal } from './useKeyboardShortcutsModal.js'

const props = defineProps<{
    messageId: string
}>()

const router = useRouter()
const { showShortcutsModal } = useKeyboardShortcutsModal()
const { email, error } = useEmailLoader(props.messageId)

function handleKeyDown(e: KeyboardEvent) {
    if (showShortcutsModal.value) return
    const el = document.activeElement
    const isInput =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable)
    if (isInput) return
    if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'u') {
        router.push('/inbox')
    }
}

onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
})
</script>
