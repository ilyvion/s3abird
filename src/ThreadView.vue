<template>
    <div>
        <div class="mb-3 flex items-center gap-2">
            <button class="btn btn-ghost btn-sm" @click="router.back()">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="M19 12H5" />
                    <path d="m12 19-7-7 7-7" />
                </svg>
                Back
            </button>
            <h2 class="text-xl font-bold">{{ subject }}</h2>
        </div>

        <div v-if="loading && threadEmails.length === 0" class="text-neutral-500">
            Loading emails…
        </div>
        <div v-else-if="threadEmails.length === 0" class="text-neutral-500">Thread not found.</div>
        <template v-else>
            <div
                v-for="meta in threadEmails"
                :key="meta.key"
                class="border-base-300 mb-4 rounded-lg border p-4"
            >
                <ThreadEmailCard :message-id="meta.key" />
            </div>
        </template>
    </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEmailStore } from './stores/email.js'
import { useKeyboardShortcutsModal } from './composables/useKeyboardShortcutsModal.js'
import { useInboxLoader } from './composables/useInboxLoader.js'
import ThreadEmailCard from './ThreadEmailCard.vue'
import type { EmailMeta } from './parser.js'

interface Props {
    threadId: string
}

const props = defineProps<Props>()

const router = useRouter()
const emailStore = useEmailStore()
const { showShortcutsModal } = useKeyboardShortcutsModal()
const { loading, loadEmails } = useInboxLoader()

const threadEmails = computed<EmailMeta[]>(() => {
    const decodedId = decodeURIComponent(props.threadId)
    return emailStore.getThread(decodedId)?.emails ?? []
})

const subject = computed(
    () => threadEmails.value[0]?.subject || threadEmails.value[0]?.key || 'Thread'
)

function handleKeyDown(e: KeyboardEvent) {
    if (showShortcutsModal.value) return
    const el = document.activeElement
    const isInput =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable)
    if (isInput) return
    if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'u') {
        router.back()
    }
}

onMounted(() => {
    loadEmails()
    window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
})
</script>
