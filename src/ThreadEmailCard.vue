<template>
    <div v-if="email">
        <div class="mb-1 flex items-center gap-2 text-sm text-neutral-500">
            <EmailAddress :address="email.from" />
            <span class="ml-auto text-nowrap">{{ formattedDate }}</span>
        </div>
        <EmailDisplay :email="email" />
    </div>
    <div v-else-if="error" class="alert alert-error text-error-content font-semibold">
        Error: {{ error }}
    </div>
    <div v-else class="flex gap-2">
        <div class="skeleton h-4 w-48" />
        <div class="skeleton ml-auto h-4 w-24" />
    </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import EmailAddress from './EmailAddress.vue'
import EmailDisplay from './EmailDisplay.vue'
import { useEmailLoader } from './useEmailLoader.js'

interface Props {
    messageId: string
}

const props = defineProps<Props>()

const { email, error } = useEmailLoader(props.messageId)

const formattedDate = computed(() =>
    email.value?.date ? new Date(email.value.date).toLocaleString() : ''
)
</script>
