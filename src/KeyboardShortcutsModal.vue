<template>
    <dialog ref="dialogRef" class="modal" @close="onDialogClose">
        <div class="modal-box">
            <h3 class="mb-4 text-lg font-bold">Keyboard Shortcuts</h3>
            <h4 class="mb-1 font-semibold">Inbox list</h4>
            <table class="mb-4 table">
                <thead>
                    <tr>
                        <th>Key</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <kbd class="kbd kbd-sm">j</kbd> /
                            <kbd class="kbd kbd-sm">↓</kbd>
                        </td>
                        <td>Move selection down</td>
                    </tr>
                    <tr>
                        <td>
                            <kbd class="kbd kbd-sm">k</kbd> /
                            <kbd class="kbd kbd-sm">↑</kbd>
                        </td>
                        <td>Move selection up</td>
                    </tr>
                    <tr>
                        <td><kbd class="kbd kbd-sm">Enter</kbd></td>
                        <td>Open selected email</td>
                    </tr>
                    <tr>
                        <td>
                            <kbd class="kbd kbd-sm">]</kbd> /
                            <kbd class="kbd kbd-sm">→</kbd>
                        </td>
                        <td>Next page</td>
                    </tr>
                    <tr>
                        <td>
                            <kbd class="kbd kbd-sm">[</kbd> /
                            <kbd class="kbd kbd-sm">←</kbd>
                        </td>
                        <td>Previous page</td>
                    </tr>
                    <tr>
                        <td>
                            <kbd class="kbd kbd-sm">x</kbd> /
                            <kbd class="kbd kbd-sm">Space</kbd>
                        </td>
                        <td>Toggle selection of highlighted email</td>
                    </tr>
                    <tr>
                        <td><kbd class="kbd kbd-sm">?</kbd></td>
                        <td>Show this help</td>
                    </tr>
                </tbody>
            </table>
            <h4 class="mb-1 font-semibold">Filters</h4>
            <table class="mb-4 table">
                <thead>
                    <tr>
                        <th>Key</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><kbd class="kbd kbd-sm">Delete</kbd></td>
                        <td>Remove focused filter badge</td>
                    </tr>
                </tbody>
            </table>
            <h4 class="mb-1 font-semibold">Email view</h4>
            <table class="table">
                <thead>
                    <tr>
                        <th>Key</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <kbd class="kbd kbd-sm">Esc</kbd> /
                            <kbd class="kbd kbd-sm">Backspace</kbd> /
                            <kbd class="kbd kbd-sm">u</kbd>
                        </td>
                        <td>Back to inbox</td>
                    </tr>
                    <tr>
                        <td><kbd class="kbd kbd-sm">?</kbd></td>
                        <td>Show this help</td>
                    </tr>
                </tbody>
            </table>
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
import { ref, watch } from 'vue'

const props = defineProps<{
    modelValue: boolean
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', val: boolean): void
}>()

const dialogRef = ref<HTMLDialogElement | null>(null)

function close() {
    emit('update:modelValue', false)
}

function onDialogClose() {
    emit('update:modelValue', false)
}

watch(
    () => props.modelValue,
    (val) => {
        if (!dialogRef.value) return
        if (val) {
            dialogRef.value.showModal?.()
        } else {
            dialogRef.value.close?.()
        }
    }
)
</script>
