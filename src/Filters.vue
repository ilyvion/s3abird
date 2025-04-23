<template>
    <div>
        <form @submit.prevent="updateLabels" class="my-2">
            <input
                class="input w-full"
                type="text"
                placeholder="type filter expressions, e.g. 'to: hello@example.com', 'from: hi@example.com' or 'subject: Important'"
                v-model="label"
            />
        </form>
        Filters:
        <span v-if="labels.length == 0" class="text-accent-content opacity-50">None</span>
        <span v-for="label in labels" class="badge badge-accent gap-0"
            ><strong>{{ label.type }}</strong
            >: {{ label.value }}
            <i
                class="fas fa-times ms-2 cursor-pointer justify-baseline"
                @click="removeLabel(label)"
            ></i
        ></span>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import * as Labels from './labels'
import type { Label } from './labels'
import { key } from './store'

const store = useStore(key)

const label = ref('')

const labels = computed(() => store.state.labels)

function updateLabels() {
    const parsed = Labels.parse(label.value)
    if (parsed) {
        store.commit('addLabel', parsed)
        label.value = ''
    }
}

function removeLabel(label: Label) {
    store.commit('removeLabel', label)
}
</script>
