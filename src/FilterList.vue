<template>
    <div>
        <form class="my-2" @submit.prevent="updateLabels">
            <input
                v-model="label"
                class="input w-full"
                type="text"
                placeholder="Type a filter expression…"
                @focus="inputFocused = true"
                @blur="inputFocused = false"
            />
            <div
                v-show="inputFocused"
                class="rounded-box border-base-300 bg-base-200 text-base-content mt-1 border p-2 text-sm"
            >
                <p class="font-semibold">Filter expression examples:</p>
                <ul class="mt-1 list-inside list-disc space-y-0.5">
                    <li><code>to: hello@example.com</code></li>
                    <li><code>from: hi@example.com</code></li>
                    <li><code>subject: Important</code></li>
                    <li><code>body: keyword</code></li>
                </ul>
                <p class="mt-1 text-xs opacity-70">
                    Press Enter to add the filter. Note: <code>body:</code> only searches the first
                    200 characters of each email.
                </p>
            </div>
        </form>
        Filters:
        <span v-if="labelList.length == 0" class="text-accent-content opacity-50">None</span>
        <span
            v-for="(labelEntry, index) in labelList"
            :key="'filter-' + index"
            class="badge gap-0"
            :class="labelEntry.type === 'body' ? 'badge-secondary' : 'badge-accent'"
            tabindex="0"
            role="button"
            :aria-label="`Filter: ${labelEntry.type}: ${labelEntry.value}. Press Delete to remove.`"
            @keydown.delete="removeLabel(labelEntry)"
            ><strong>{{ labelEntry.type }}</strong
            >: {{ labelEntry.value }}
            <i
                class="fas fa-times ms-2 cursor-pointer justify-baseline"
                @click="removeLabel(labelEntry)"
        /></span>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import * as Labels from './labels'
import type { Label } from './labels'
import { useEmailStore } from './stores/email'

const emailStore = useEmailStore()

const label = ref('')
const inputFocused = ref(false)

const labelList = computed(() => emailStore.labels)

function updateLabels() {
    const parsed = Labels.parse(label.value)
    if (parsed) {
        emailStore.addLabel(parsed)
        label.value = ''
    }
}

function removeLabel(label: Label) {
    emailStore.removeLabel(label)
}
</script>
