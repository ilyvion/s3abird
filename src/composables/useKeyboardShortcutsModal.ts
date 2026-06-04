import { ref } from 'vue'

const showShortcutsModal = ref(false)

export function useKeyboardShortcutsModal() {
    function openModal() {
        showShortcutsModal.value = true
    }

    function closeModal() {
        showShortcutsModal.value = false
    }

    return { showShortcutsModal, openModal, closeModal }
}
