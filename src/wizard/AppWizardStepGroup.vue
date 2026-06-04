<template>
    <slot />
</template>
<script setup lang="ts">
import { provide, type InjectionKey } from 'vue'
import type { StepIcon } from './AppWizardStep.vue'

const props = defineProps<Group>()

provide(AppWizardGroupDefaultsKey, {
    title: props.title,
    colorClass: props.colorClass,
    stepIcon: props.stepIcon,
    isReady: props.isReady,
    isVisible: props.isVisible,
    onEnter: props.onEnter,
    onExit: props.onExit,
    onFinished: props.onFinished,
})
</script>

<script lang="ts">
export type Group = {
    title?: string
    colorClass?: string
    stepIcon?: StepIcon
    isReady?: () => boolean
    isVisible?: () => boolean
    onEnter?: () => void
    onExit?: () => void
    onFinished?: () => void
}

export const AppWizardGroupDefaultsKey: InjectionKey<Group> = Symbol('AppWizardGroupDefaults')
</script>
