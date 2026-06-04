import { ref } from 'vue'

const showChangelogModal = ref(false)

export function useChangelogModal() {
    function openModal() {
        showChangelogModal.value = true
    }

    function closeModal() {
        showChangelogModal.value = false
    }

    return { showChangelogModal, openModal, closeModal }
}
