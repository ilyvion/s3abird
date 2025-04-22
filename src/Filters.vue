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
            >: {{ label.value }} <i class="ex fas fa-times ms-2 justify-baseline" @click="removeLabel(label)"></i
        ></span>
    </div>
</template>

<script lang="ts">
import type { Label } from './labels'
import * as Labels from './labels'

export default {
    name: 'Filters',
    props: {},
    data: function () {
        return {
            label: '',
        }
    },
    computed: {
        labels: function () {
            return this.$store.state.labels
        },
    },
    methods: {
        updateLabels() {
            let label = Labels.parse(this.label)

            if (label) {
                this.$store.commit('addLabel', label)
                this.label = ''
            }
        },
        removeLabel(label: Label) {
            this.$store.commit('removeLabel', label)
        },
    },
}
</script>

<style scoped>
table.addr {
    font-size: 0.875rem;
    letter-spacing: 0.2px;
}
.ex.fas {
    cursor: pointer;
}
</style>
