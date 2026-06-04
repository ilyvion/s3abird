<template>
    <dialog ref="dialogRef" class="modal" @close="onDialogClose">
        <div class="modal-box max-w-3xl">
            <h3 class="mb-4 text-lg font-bold">Changelog</h3>
            <!-- eslint-disable-next-line vue/no-v-html -- content is static markdown bundled at build time, not user input -->
            <div class="prose max-h-[60vh] overflow-y-auto" v-html="renderedChangelog" />
            <div class="modal-action">
                <button class="btn" @click="close">Close</button>
            </div>
        </div>
        <form method="dialog" class="modal-backdrop">
            <button @click="close">close</button>
        </form>
    </dialog>
</template>

<script lang="ts" setup>
import { ref, watch, computed } from 'vue'
import { marked } from 'marked'
import { stripEmptyUnreleased } from './changelogUtils.js'
import { loadChangelog } from './loadChangelog.js'

const props = defineProps<{
    modelValue: boolean
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', val: boolean): void
}>()

const dialogRef = ref<HTMLDialogElement | null>(null)
const changelogRaw = ref<string | null>(null)

const renderedChangelog = computed(() =>
    changelogRaw.value !== null ? marked(stripEmptyUnreleased(changelogRaw.value)) : ''
)

function close() {
    emit('update:modelValue', false)
}

function onDialogClose() {
    emit('update:modelValue', false)
}

watch(
    () => props.modelValue,
    async (val) => {
        if (!dialogRef.value) return
        if (val) {
            if (changelogRaw.value === null) {
                changelogRaw.value = await loadChangelog()
            }
            dialogRef.value.showModal?.()
        } else {
            dialogRef.value.close?.()
        }
    }
)
</script>
