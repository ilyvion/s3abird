<template>
    <div v-show="stepIndex !== null && stepIndex === activeStepIndex">
        <slot />
    </div>
</template>
<script setup lang="ts">
import { inject, onMounted, ref } from 'vue'
import { AppWizardActiveStepRawIndexKey, AppWizardStepRegistrationKey } from './AppWizard.vue'
import { AppWizardGroupDefaultsKey } from './AppWizardStepGroup.vue'
import { mergeWithDefaults } from '../merge'

const props = defineProps<Step>()
const stepIndex = ref<number | null>(null)
const activeStepIndex = inject(AppWizardActiveStepRawIndexKey)
const registerStep = inject(AppWizardStepRegistrationKey)
const groupDefaults = inject(AppWizardGroupDefaultsKey, undefined)
onMounted(() => {
    if (!registerStep) {
        throw new Error('WizardStep must be used within a Wizard component')
    }

    const merged = mergeWithDefaults(props, groupDefaults ?? {})
    stepIndex.value = registerStep(merged)
})
</script>
<script lang="ts">
export type Step = {
    title: string
    colorClass?: string
    stepIcon?: StepIcon
    isReady?: () => boolean
    isVisible?: () => boolean
    onEnter?: () => void
    onExit?: () => void
    /** Called on the last step in a wizard instead of the
     *  usual`onExit`/`onEnter` sequence for other steps */
    onFinished?: () => void
}
export type StepIcon =
    | {
          type: 'icon'
          icon: string
      }
    | {
          type: 'data'
          data: string
      }
</script>
