<template>
    <div>
        <form class="my-2" @submit.prevent="updateLabels">
            <input
                v-model="label"
                class="input w-full"
                type="text"
                placeholder="type filter expressions, e.g. 'to: hello@example.com', 'from: hi@example.com' or 'subject: Important'"
            />
        </form>
        Filters:
        <span v-if="labelList.length == 0" class="text-accent-content opacity-50">None</span>
        <span
            v-for="(labelEntry, index) in labelList"
            :key="'filter-' + index"
            class="badge badge-accent gap-0"
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
