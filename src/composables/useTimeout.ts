import { ref } from 'vue'

export function useTimeout(delay: number, callback?: () => void) {
    const running = ref(false)
    const timeout = ref<ReturnType<typeof setTimeout> | null>(null)

    function start() {
        if (timeout.value) {
            clearTimeout(timeout.value)
            timeout.value = null
        }

        running.value = true
        timeout.value = setTimeout(() => {
            timeout.value = null
            running.value = false
            callback?.()
        }, delay)
    }

    return { running, start }
}
