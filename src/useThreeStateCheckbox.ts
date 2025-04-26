import { watch, onMounted, type Ref } from 'vue'

/**
 * Keeps a checkbox's .checked and .indeterminate in sync with a 3-state source
 *
 * @param checkboxRef - the ref to the checkbox DOM element
 * @param valueSource - a ref or function that returns the current state ('dark' | 'light' | null or similar)
 * @param isCheckedFn - function to determine if state means checked
 * @param isIndeterminateFn - function to determine if state means indeterminate
 */
export function useThreeStateCheckbox<T>(
    checkboxRef: Ref<HTMLInputElement | null>,
    valueSource: Ref<T> | (() => T),
    {
        isChecked,
        isIndeterminate,
    }: {
        isChecked: (value: T) => boolean
        isIndeterminate: (value: T) => boolean
    }
) {
    const get = () => (typeof valueSource === 'function' ? valueSource() : valueSource.value)

    const update = () => {
        const checkbox = checkboxRef.value
        if (!checkbox) return
        const value = get()
        checkbox.checked = isChecked(value)
        checkbox.indeterminate = isIndeterminate(value)
    }

    onMounted(update)
    watch(get, update)
}
